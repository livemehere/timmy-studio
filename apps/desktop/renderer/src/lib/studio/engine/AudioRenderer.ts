import type { IAudioTrack } from '@/lib/studio/domains/Track/types';
import type { Timer } from './Timer';
import type { DocGetter } from './types';
import { AudioTrack } from '@/lib/studio/domains/Track/AudioTrack';

export class AudioRenderer {
  public sampleRate: number = 44100;

  // Audio Context
  public audioContext: AudioContext;
  public masterNode: GainNode;

  // Track 관리
  public tracks = new Map<string, AudioTrack>();

  private isInitialized = false;

  constructor(
    public timer: Timer,
    public getDoc: DocGetter
  ) {
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

  private lastState = { isPlaying: false, currentMs: 0 };

  private handleTimerUpdate(state: { currentMs: number; isPlaying: boolean }) {
    if (!this.isInitialized) return;

    const { currentMs, isPlaying } = state;
    const { lastState } = this;

    // playStateChanged: 재생 상태가 변했는지
    const playStateChanged = isPlaying !== lastState.isPlaying;

    // isSeeking: 정지 상태에서 시간이 변했는지 (혹은 재생 중 점프 등)
    // Timer가 isPlaying일 때도 currentMs는 계속 변하므로,
    // isSeeking 판별은 'isPlaying이 false이면서 시간이 변했을 때' 혹은 '갑작스런 시간 변화'를 감지해야 함.
    // 여기서는 단순화하여 '정지 상태 + 시간 변화'를 seek로 간주
    const isSeeking = !isPlaying && currentMs !== lastState.currentMs;

    const ctx = {
      currentTime: currentMs,
      isPlaying,
      playStateChanged,
      isSeeking,
    };

    // 항상 틱을 수행하여 Clip 상태 업데이트 (특히 play/stop 전환 시 중요)
    this.tick(ctx);

    this.lastState = { isPlaying, currentMs };
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
  async syncTracks(tracksData: IAudioTrack[]): Promise<{
    syncedTrackIds: string[];
    syncedClipIds: string[];
    failedTrackIds: string[];
    failedClipIds: Array<{ trackId: string; clipId: string }>;
  }> {
    const trackIds = new Set(tracksData.map((t) => t.id));

    // 제거
    for (const trackId of this.tracks.keys()) {
      if (!trackIds.has(trackId)) {
        this.tracks.get(trackId)?.destroy();
        this.tracks.delete(trackId);
      }
    }

    // 추가/업데이트
    const failedTrackIds: string[] = [];
    const failedClipIds: Array<{ trackId: string; clipId: string }> = [];

    const tasks = tracksData.map(async (trackData) => {
      if (this.tracks.has(trackData.id)) {
        const { failedClipIds } = await this.tracks
          .get(trackData.id)!
          .sync(trackData);
        return { trackId: trackData.id, failedClipIds };
      }

      const track = new AudioTrack(this, trackData);
      this.tracks.set(trackData.id, track);
      const { failedClipIds } = await track.sync(trackData);
      return { trackId: trackData.id, failedClipIds };
    });

    const results = await Promise.allSettled(tasks);
    results.forEach((result, index) => {
      const trackData = tracksData[index];
      if (result.status === 'fulfilled') {
        result.value.failedClipIds.forEach((clipId) => {
          failedClipIds.push({ trackId: result.value.trackId, clipId });
        });
        return;
      }

      failedTrackIds.push(trackData.id);
      trackData.clips.forEach((clip) => {
        failedClipIds.push({ trackId: trackData.id, clipId: clip.id });
      });
      if (this.tracks.has(trackData.id)) {
        this.tracks.get(trackData.id)?.destroy();
        this.tracks.delete(trackData.id);
      }
    });

    // 동기화 결과 반환 준비
    const syncedClipIds: string[] = [];
    for (const track of this.tracks.values()) {
      for (const clipId of track.clips.keys()) {
        syncedClipIds.push(clipId);
      }
    }

    return {
      syncedTrackIds: Array.from(this.tracks.keys()),
      syncedClipIds: syncedClipIds,
      failedTrackIds,
      failedClipIds,
    };
  }

  // 메인 루프 (Renderer와 함께 호출되어야 함)
  // Renderer.ts의 startLoop에서 audioRenderer.tick(ctx)를 호출해주는 것이 가장 깔끔함.
  tick(ctx: any): void {
    // 타입 순환 참조 방지를 위해 any 사용 혹은 공통 타입 분리 필요
    if (!this.isInitialized) return;

    // 브라우저 정책상 오디오 컨텍스트가 suspended 상태면 resume 시도
    if (this.audioContext.state === 'suspended' && ctx.isPlaying) {
      this.audioContext.resume();
    }

    for (const track of this.tracks.values()) {
      track.tick(ctx);
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
