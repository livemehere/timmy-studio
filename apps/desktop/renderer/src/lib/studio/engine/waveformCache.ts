/**
 * Waveform Cache
 *
 * 에셋별 peak 데이터를 메모리에 캐시하고,
 * Worker를 통해 오디오 파일에서 peak를 추출한다.
 * React 컴포넌트에서 구독 가능한 reactive 인터페이스 제공.
 */

export interface WaveformData {
  /** 다운샘플링된 peak 배열 (0~1 범위) */
  peaks: Float32Array;
  /** peaks 배열의 초당 샘플 수 */
  samplesPerSec: number;
  /** 오디오 전체 길이 (초) */
  duration: number;
}

type WaveformStatus = 'idle' | 'loading' | 'ready' | 'error';

interface WaveformEntry {
  status: WaveformStatus;
  data: WaveformData | null;
  error?: string;
}

type Listener = () => void;

class WaveformCache {
  private cache = new Map<string, WaveformEntry>();
  private listeners = new Set<Listener>();
  private worker: Worker | null = null;
  private pendingRequests = new Set<string>();
  private version = 0;
  private audioCtx: AudioContext | null = null;

  /** Worker 초기화 (lazy) */
  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker('/waveform-worker.js');
      this.worker.onmessage = (e) => this.handleWorkerMessage(e);
      this.worker.onerror = (e) => {
        console.error('[WaveformCache] Worker error:', e);
      };
    }
    return this.worker;
  }

  /** AudioContext (lazy, 디코딩 전용) */
  private ensureAudioContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  private handleWorkerMessage(e: MessageEvent): void {
    const { type, assetId, peaks, samplesPerSec, duration, message } = e.data;

    if (type === 'result') {
      this.cache.set(assetId, {
        status: 'ready',
        data: { peaks, samplesPerSec, duration },
      });
      this.pendingRequests.delete(assetId);
      this.notify();
    } else if (type === 'error') {
      console.error(`[WaveformCache] Failed for ${assetId}:`, message);
      this.cache.set(assetId, {
        status: 'error',
        data: null,
        error: message,
      });
      this.pendingRequests.delete(assetId);
      this.notify();
    }
  }

  /**
   * 에셋의 파형 데이터를 요청한다.
   * 이미 캐시되어 있으면 무시, 없으면 fetch → decode → Worker에 peak 추출 요청.
   */
  requestWaveform(assetId: string, filePath: string): void {
    // 이미 처리 중이거나 완료된 경우 스킵
    if (this.cache.has(assetId) || this.pendingRequests.has(assetId)) return;

    this.pendingRequests.add(assetId);
    this.cache.set(assetId, { status: 'loading', data: null });
    this.notify();

    // 메인 스레드에서 fetch + decode, Worker에서 peak 추출
    this.fetchAndDecode(assetId, filePath).catch((err) => {
      console.error(`[WaveformCache] Failed for ${assetId}:`, err);
      this.cache.set(assetId, {
        status: 'error',
        data: null,
        error: err instanceof Error ? err.message : String(err),
      });
      this.pendingRequests.delete(assetId);
      this.notify();
    });
  }

  /**
   * 메인 스레드에서 오디오 파일을 fetch → decodeAudioData 후
   * PCM 채널 데이터를 Worker에 전달하여 peak 추출.
   */
  private async fetchAndDecode(
    assetId: string,
    filePath: string
  ): Promise<void> {
    const url = `source://open?path=${encodeURIComponent(filePath)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();

    const audioCtx = this.ensureAudioContext();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // PCM 채널 데이터 추출
    const channels: Float32Array[] = [];
    const transferables: ArrayBuffer[] = [];
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      // getChannelData는 내부 버퍼의 뷰를 반환하므로 복사 필요
      const channelData = audioBuffer.getChannelData(ch).slice();
      channels.push(channelData);
      transferables.push(channelData.buffer);
    }

    // Worker에 peak 추출 요청 (PCM transfer로 zero-copy)
    const worker = this.ensureWorker();
    worker.postMessage(
      {
        type: 'extract-peaks',
        assetId,
        channels,
        sampleRate: audioBuffer.sampleRate,
      },
      transferables
    );
    // AudioBuffer 참조 해제 → GC
  }

  /** 에셋의 현재 파형 상태를 반환한다 */
  get(assetId: string): WaveformEntry | undefined {
    return this.cache.get(assetId);
  }

  /** 에셋의 파형 데이터 (ready 상태만) */
  getWaveformData(assetId: string): WaveformData | null {
    const entry = this.cache.get(assetId);
    return entry?.status === 'ready' ? entry.data : null;
  }

  /** 현재 상태 */
  getStatus(assetId: string): WaveformStatus {
    return this.cache.get(assetId)?.status ?? 'idle';
  }

  // ── Reactive 인터페이스 (useSyncExternalStore 호환) ──

  /** 변경 구독 */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** 스냅샷 (version 기반) */
  getVersion(): number {
    return this.version;
  }

  private notify(): void {
    this.version++;
    for (const listener of this.listeners) {
      listener();
    }
  }

  /** 캐시 전체 클리어 */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    this.notify();
  }

  /** Worker 종료 */
  destroy(): void {
    this.worker?.terminate();
    this.worker = null;
    this.audioCtx?.close();
    this.audioCtx = null;
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

/** 싱글톤 인스턴스 */
export const waveformCache = new WaveformCache();
