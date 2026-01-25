import type { IAudioTrack } from '@/lib/studio/domains/Track/types';
import type { Timer } from './Timer';
import type {
  DocGetter,
  ClipSyncResult,
  TrackSyncResult,
  RendererSyncResult,
} from './types';
import { AudioTrack } from '@/lib/studio/domains/Track/AudioTrack';
import { RendererBase } from './RendererBase';
import type { TickContext } from './types';

export class AudioRenderer extends RendererBase {
  public sampleRate: number = 44100;

  // Audio Context
  public audioContext: AudioContext;
  public masterNode: GainNode;

  // Track 관리
  public tracks = new Map<string, AudioTrack>();

  private isInitialized = false;

  constructor(
    timer: Timer,
    public getDoc: DocGetter
  ) {
    super(timer);
    this.audioContext = new AudioContext();

    // Master Node 생성
    this.masterNode = this.audioContext.createGain();
    this.masterNode.connect(this.audioContext.destination);

    console.log('[AudioRenderer] 인스턴스 생성됨');

    // [DEBUG]
    // console.log('[AudioRenderer] Master Node connected to destination');

    // Timer Loop는 VideoRenderer(Renderer.ts)에서 통합 관리하거나,
    // 여기서 별도로 ticker를 돌릴 수도 있음.
    // 일단 VideoRenderer의 Loop에 의존하지 않고 독립적인 tick 메서드를 제공하여
    // 외부(Studio.tsx 등)에서 같이 호출해주도록 설계하는 것이 좋음.
    // 하지만 현재 구조상 Renderer가 메인 루프를 쥐고 있으므로,
    // Renderer가 AudioRenderer를 참조하거나, 별도로 tick을 돌려야 함.
    // 여기서는 Timer 이벤트 리스너 방식보다는, 명시적인 tick 호출 방식을 준비함.

    // Timer의 상태 변경을 구독하여 AudioContext 상태 관리 및 Tick 수행
    this.timer.subscribe((state) => {
      // AudioRenderer Loop
      this.handleTimerUpdate(state);
    });
  }

  private handleTimerUpdate(state: { currentMs: number; isPlaying: boolean }) {
    if (!this.isInitialized) return;
    const ctx = this.captureTickContextFromState(
      state.currentMs,
      state.isPlaying
    );

    // 항상 틱을 수행하여 Clip 상태 업데이트 (특히 play/stop 전환 시 중요)
    this.tick(ctx);

    this.commitFrameContext(ctx);
  }

  async init() {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.isInitialized = true;
  }

  syncSettings(settings: { sampleRate: number }): void {
    this.sampleRate = settings.sampleRate;
  }

  // 데이터 동기화
  async syncTracks(tracksData: IAudioTrack[]): Promise<RendererSyncResult> {
    const trackIds = new Set(tracksData.map((t) => t.id));

    const addedTrackIds: string[] = [];
    const updatedTrackIds: string[] = [];
    const removedTrackIds: string[] = [];
    const failedTrackIds: string[] = [];
    const clipResults: TrackSyncResult[] = [];

    // 제거
    for (const trackId of this.tracks.keys()) {
      if (!trackIds.has(trackId)) {
        const track = this.tracks.get(trackId);
        const removedClipIds = track ? Array.from(track.clips.keys()) : [];
        removedTrackIds.push(trackId);
        clipResults.push({
          trackId,
          addedClipIds: [],
          updatedClipIds: [],
          removedClipIds,
          failedClipIds: [],
        });
        track?.destroy();
        this.tracks.delete(trackId);
      }
    }

    // 추가/업데이트
    const tasks = tracksData.map(async (trackData) => {
      const isExisting = this.tracks.has(trackData.id);
      try {
        let result: ClipSyncResult;
        if (isExisting) {
          result = await this.tracks.get(trackData.id)!.sync(trackData);
          updatedTrackIds.push(trackData.id);
        } else {
          const track = new AudioTrack(this, trackData);
          this.tracks.set(trackData.id, track);
          result = await track.sync(trackData);
          addedTrackIds.push(trackData.id);
        }

        clipResults.push({ trackId: trackData.id, ...result });
      } catch (error) {
        console.error(
          `[AudioRenderer] 트랙(${trackData.id}) 동기화 중 오류 발생:`,
          error
        );
        failedTrackIds.push(trackData.id);
        clipResults.push({
          trackId: trackData.id,
          addedClipIds: [],
          updatedClipIds: [],
          removedClipIds: [],
          failedClipIds: trackData.clips.map((clip) => clip.id),
        });
      }
    });

    await Promise.all(tasks);

    return {
      addedTrackIds,
      updatedTrackIds,
      removedTrackIds,
      failedTrackIds,
      clipResults,
    };
  }

  // 메인 루프 (Renderer와 함께 호출되어야 함)
  // Renderer.ts의 startLoop에서 audioRenderer.tick(ctx)를 호출해주는 것이 가장 깔끔함.
  tick(ctx: TickContext): void {
    if (!this.isInitialized) return;

    // 브라우저 정책상 오디오 컨텍스트가 suspended 상태면 resume 시도
    if (this.audioContext.state === 'suspended' && ctx.isPlaying) {
      this.audioContext.resume();
    }

    for (const track of this.tracks.values()) {
      track.onTick(ctx);
    }
  }

  getTrack(trackId: string): AudioTrack | undefined {
    return this.tracks.get(trackId);
  }

  destroy(): void {
    for (const track of this.tracks.values()) {
      track.destroy();
    }
    this.tracks.clear();
    this.audioContext.close();
    this.isInitialized = false;
    this.resetTickState();
  }

  /**
   * Export용 오디오 트랙 정보 수집
   * 각 AudioClip의 정보를 수집하여 ffmpeg로 믹싱할 수 있는 형태로 반환
   */
  getExportAudioTracks(): Array<{
    src: string;
    trimStart: number; // 초
    trimEnd: number; // 초
    startMs: number; // 타임라인 상 시작 시간 (밀리초)
    volume: number;
  }> {
    const doc = this.getDoc();
    const clips: Array<{
      src: string;
      trimStart: number;
      trimEnd: number;
      startMs: number;
      volume: number;
    }> = [];

    console.log(
      `[AudioRenderer] Collecting export tracks from ${this.tracks.size} tracks`
    );

    for (const track of this.tracks.values()) {
      if (!track.data.enabled) {
        console.log(
          `[AudioRenderer] Skipping disabled track: ${track.data.id}`
        );
        continue;
      }

      const trackVolume = track.data.volume ?? 1;
      console.log(
        `[AudioRenderer] Processing track: ${track.data.id}, volume: ${trackVolume}, clips: ${track.clips.size}`
      );

      for (const clip of track.clips.values()) {
        if (!clip.data.enabled) {
          console.log(
            `[AudioRenderer] Skipping disabled clip: ${clip.data.id}`
          );
          continue;
        }

        // Asset 찾기
        const asset = doc.assets.find((a) => a.id === clip.data.assetId);
        if (!asset || asset.type !== 'audio') {
          console.warn(
            `[AudioRenderer] Asset not found or invalid type for clip: ${clip.data.assetId}`
          );
          continue;
        }

        const trimStart = (clip.data.trimStart ?? 0) / 1000; // ms -> s
        const duration =
          (clip.data.endTime - clip.data.startTime - (clip.data.trimEnd ?? 0)) /
          1000; // ms -> s
        const trimEnd = trimStart + duration;

        const clipInfo = {
          src: asset.filePath,
          trimStart,
          trimEnd,
          startMs: clip.data.startTime,
          volume: (clip.data.volume ?? 1) * trackVolume,
        };

        console.log(`[AudioRenderer] Added clip: ${clip.data.id}`, {
          src: asset.filePath.substring(0, 50) + '...',
          trimStart: trimStart.toFixed(2) + 's',
          trimEnd: trimEnd.toFixed(2) + 's',
          duration: duration.toFixed(2) + 's',
          startMs: clip.data.startTime + 'ms',
          volume: clipInfo.volume.toFixed(2),
        });

        clips.push(clipInfo);
      }
    }

    console.log(
      `[AudioRenderer] Total clips collected for export: ${clips.length}`
    );
    return clips;
  }
}
