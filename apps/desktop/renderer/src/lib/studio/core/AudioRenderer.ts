import type { IAudioTrack } from '@renderer/lib/studio/domains/Track/types';
import type { Timer } from './Timer';
import type { DocGetter } from './types';
import { AudioTrack } from '@renderer/lib/studio/domains/Track/AudioTrack';

export class AudioRenderer {
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
    console.log('[AudioRenderer] Created');

    // AudioContext 생성 (브라우저 호환성 고려)
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass();

    // Master Node 생성
    this.masterNode = this.audioContext.createGain();
    this.masterNode.connect(this.audioContext.destination);

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

  async init(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.isInitialized = true;
    console.log('[AudioRenderer] Initialized');
  }

  // 데이터 동기화
  async syncTracks(tracksData: IAudioTrack[]) {
    const trackIds = new Set(tracksData.map((t) => t.id));

    // 제거
    for (const trackId of this.tracks.keys()) {
      if (!trackIds.has(trackId)) {
        this.tracks.get(trackId)?.destroy();
        this.tracks.delete(trackId);
      }
    }

    // 추가/업데이트
    const tasks: Promise<void>[] = [];
    for (const trackData of tracksData) {
      if (this.tracks.has(trackData.id)) {
        tasks.push(this.tracks.get(trackData.id)!.sync(trackData));
      } else {
        const track = new AudioTrack(this, trackData);
        this.tracks.set(trackData.id, track);
        tasks.push(track.sync(trackData));
      }
    }
    await Promise.all(tasks);

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
}
