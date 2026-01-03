import type { IAudioClip } from './types';
import type { AudioRenderer } from '@renderer/lib/studio/engine/AudioRenderer';
import { toFilePath } from '@renderer/lib/studio/utils/toFilePath';
import { Clip } from './Clip';
import type { TickContext } from '@renderer/lib/studio/engine/types';

export class AudioClip extends Clip {
  readonly type = 'audio';
  public data: IAudioClip;

  // Audio Graph
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioBuffer: AudioBuffer | null = null;

  public get outputNode(): GainNode | null {
    return this.gainNode;
  }

  // State
  private isPlaying = false;

  constructor(
    public readonly renderer: AudioRenderer, // 타입 재정의 필요할 수 있음 (Video Renderer와 다름) -> 일단 any나 공통 인터페이스 쓰거나, AudioRenderer 직접 참조
    data: IAudioClip
  ) {
    // Clip 부모 생성자는 Pixi Sprite를 만드는데, 오디오 클립은 Sprite가 필요 없지만
    // 상속 구조상 생성됨. (나중에 Clip을 GraphicClip/AudioClip으로 분리하는게 좋음)
    // 일단은 부모 생성자 호출하되 renderer는 any로 캐스팅하여 전달 (부모는 VideoRenderer를 기대함)
    super(renderer as any, data);
    this.data = data;
  }

  async init(): Promise<void> {
    const asset = this.renderer
      .getDoc()
      .assets.find((a: any) => a.id === this.data.assetId);
    if (!asset || asset.type !== 'audio') {
      console.warn(
        `[AudioClip] Asset not found or invalid: ${this.data.assetId}`
      );
      return;
    }

    try {
      this.audioBuffer = await this.loadAudioBuffer(asset.filePath);
      console.log(`[AudioClip] Loaded buffer for ${this.id}`);
    } catch (e) {
      console.error(`[AudioClip] Failed to load audio: ${asset.filePath}`, e);
    }
  }

  update(data: IAudioClip): void {
    this.data = data;
    // 볼륨 등 업데이트
    if (this.gainNode) {
      this.gainNode.gain.value = data.volume ?? 1;
    }
  }

  destroy(): void {
    this.stop();
    this.audioBuffer = null;
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
  }

  // 오디오는 매 프레임 tick보다는 상태 변화(재생/정지/탐색) 시점에 반응하는 것이 중요함.
  // 하지만 부모 구조에 맞춰 tick을 구현.
  tick(ctx: TickContext): void {
    if (!this.audioBuffer) return;

    const { isPlaying, currentTime, playStateChanged, isSeeking } = ctx;
    const isVisible = this.isVisibleAt(currentTime);

    // 1. 재생 상태 변경 or 탐색 시
    if (playStateChanged || isSeeking) {
      if (isPlaying && isVisible) {
        // 재생 시작
        this.play(currentTime);
      } else {
        // 정지
        this.stop();
      }
      return;
    }

    // 2. 재생 중인데 구간을 벗어남 -> 정지
    if (isPlaying && !isVisible && this.isPlaying) {
      this.stop();
    }

    // 3. 재생 중인데 구간에 진입 -> 재생
    if (isPlaying && isVisible && !this.isPlaying) {
      this.play(currentTime);
    }
  }

  private async play(currentTime: number) {
    if (this.isPlaying) this.stop(); // 이미 재생 중이면 일단 멈춤 (Seek 등 대응)
    if (!this.audioBuffer) return;

    const ctx = this.renderer.audioContext;
    if (ctx.state !== 'running') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('[AudioClip] Failed to resume audio context', e);
        return;
      }
    }

    // 그래프 생성: Source -> Gain -> Track Gain(외부)
    this.sourceNode = ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;

    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = this.data.volume ?? 1;

    this.sourceNode.connect(this.gainNode);
    // Track의 노드에 연결해야 함. (AudioRenderer -> Track -> Clip 구조 필요)
    // 현재 구조상 Track 인스턴스를 통해 연결해야 함.

    // [DEBUG] 직접 destination 연결 (테스트용)
    // this.gainNode.connect(this.renderer.audioContext.destination);

    // 부모 트랙 찾기 (약간 해킹, 나중에 주입받는게 좋음)
    const track = this.data.trackId
      ? this.renderer.getTrack(this.data.trackId)
      : undefined;
    if (track) {
      this.gainNode.connect(track.inputNode);
    } else {
      // Fallback: Track을 못 찾으면 Master로 직결 (안전장치)
      this.gainNode.connect(this.renderer.masterNode);
    }

    // 오프셋 계산
    // Clip 시작 시간: this.data.startTime
    // 오디오 파일 내 시작점: this.data.trimStart (없으면 0)
    // 현재 커서 위치: currentTime

    // 오디오 파일 내에서 재생할 오프셋 (초 단위)
    const trimStart = (this.data.trimStart ?? 0) / 1000;
    const offset =
      Math.max(0, (currentTime - this.data.startTime) / 1000) + trimStart;

    // 재생
    this.sourceNode.start(0, offset);
    this.isPlaying = true;

    this.sourceNode.onended = () => {
      this.isPlaying = false;
      this.sourceNode = null;
    };
  }

  private stop() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (e) {
        // 이미 멈춘 경우 무시
      }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    this.isPlaying = false;
  }

  private async loadAudioBuffer(filePath: string): Promise<AudioBuffer> {
    const response = await fetch(toFilePath(filePath));
    const arrayBuffer = await response.arrayBuffer();

    // 1시간짜리 오디오(44.1kHz, stereo, 16bit)는 약 600MB 정도의 메모리를 차지합니다.
    // 5GB 정도의 대용량 파일이나 긴 영상에서 추출한 오디오의 경우 OOM(Out of Memory) 위험이 있습니다.
    // Web Audio API의 decodeAudioData는 전체 오디오를 압축 해제하여 PCM 데이터로 메모리에 적재하므로
    // 매우 긴 오디오 파일에는 적합하지 않습니다.

    // 해결 방안:
    // 1. 스트리밍 방식 사용 (MediaElementAudioSourceNode): <audio> 태그를 사용하여 스트리밍 재생
    //    - 장점: 메모리 사용량 적음, 긴 파일 재생 가능
    //    - 단점: Web Audio API의 정밀한 타이밍 제어나 일부 이펙트 처리에 제약이 있을 수 있음

    // 2. 오디오 청크 분할: 필요한 부분만 잘라서 로딩 (현재 구조상 복잡)

    // 현재는 프로토타입 단계이므로 전체 로딩 방식을 유지하되, 추후 대용량 파일 지원 시
    // HTMLAudioElement를 활용한 스트리밍 방식(MediaElementSource)으로 전환을 고려해야 합니다.

    // 긴급 회피책으로, 너무 큰 파일은 경고를 띄우거나 처리를 거부할 수 있습니다.
    if (arrayBuffer.byteLength > 500 * 1024 * 1024) {
      // 500MB 제한 예시
      console.warn('[AudioClip] Audio file too large, might cause OOM');
    }

    return await this.renderer.audioContext.decodeAudioData(arrayBuffer);
  }
}
