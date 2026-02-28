import { useCallback, useEffect, useSyncExternalStore } from 'react';
import {
  waveformCache,
  type WaveformData,
} from '@/lib/studio/engine/waveformCache';

/**
 * 에셋의 파형 데이터를 가져오는 훅.
 * 파형이 없으면 자동으로 Worker에 생성을 요청한다.
 */
export function useWaveform(
  assetId: string | undefined,
  filePath: string | undefined
): {
  waveformData: WaveformData | null;
  isLoading: boolean;
} {
  // waveformCache의 변경을 구독
  const subscribe = useCallback(
    (cb: () => void) => waveformCache.subscribe(cb),
    []
  );
  const getSnapshot = useCallback(() => waveformCache.getVersion(), []);
  useSyncExternalStore(subscribe, getSnapshot);

  // 마운트 시 / assetId 변경 시 파형 생성 요청
  useEffect(() => {
    if (!assetId || !filePath) return;
    waveformCache.requestWaveform(assetId, filePath);
  }, [assetId, filePath]);

  if (!assetId) return { waveformData: null, isLoading: false };

  const status = waveformCache.getStatus(assetId);
  const waveformData = waveformCache.getWaveformData(assetId);

  return {
    waveformData,
    isLoading: status === 'loading',
  };
}
