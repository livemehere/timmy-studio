/**
 * Waveform Peak Worker
 *
 * 메인 스레드에서 전달받은 PCM 채널 데이터로부터 peak 다운샘플링 수행.
 * (AudioContext/OfflineAudioContext는 Worker에서 사용 불가하므로
 *  디코딩은 메인 스레드에서 처리)
 *
 * Protocol:
 *   IN:  { type: 'extract-peaks', assetId: string, channels: Float32Array[], sampleRate: number, samplesPerSec?: number }
 *   OUT: { type: 'result', assetId: string, peaks: Float32Array, samplesPerSec: number, duration: number }
 *   OUT: { type: 'error', assetId: string, message: string }
 */

/**
 * PCM 채널 데이터에서 peak 배열을 추출한다.
 * 모든 채널의 절대값 최대를 평균하여 모노 peak 배열로 만든다.
 *
 * @param {Float32Array[]} channels
 * @param {number} sampleRate - 원본 오디오 샘플레이트
 * @param {number} samplesPerSec - 초당 peak 샘플 수
 * @returns {Float32Array}
 */
function extractPeaks(channels, sampleRate, samplesPerSec) {
  const totalSamples = channels[0].length;
  const numberOfChannels = channels.length;
  const duration = totalSamples / sampleRate;
  const totalPeaks = Math.max(1, Math.ceil(duration * samplesPerSec));
  const samplesPerPeak = Math.floor(totalSamples / totalPeaks);

  const peaks = new Float32Array(totalPeaks);

  for (let i = 0; i < totalPeaks; i++) {
    const start = i * samplesPerPeak;
    const end = Math.min(start + samplesPerPeak, totalSamples);
    let max = 0;

    for (let s = start; s < end; s++) {
      let sum = 0;
      for (let ch = 0; ch < numberOfChannels; ch++) {
        sum += Math.abs(channels[ch][s]);
      }
      const avg = sum / numberOfChannels;
      if (avg > max) max = avg;
    }
    peaks[i] = max;
  }

  return peaks;
}

self.onmessage = (e) => {
  const { type, assetId, channels, sampleRate, samplesPerSec = 200 } = e.data;

  if (type !== 'extract-peaks') return;

  try {
    const peaks = extractPeaks(channels, sampleRate, samplesPerSec);
    const duration = channels[0].length / sampleRate;

    self.postMessage(
      {
        type: 'result',
        assetId,
        peaks,
        samplesPerSec,
        duration,
      },
      // Transfer peaks buffer for zero-copy
      [peaks.buffer]
    );
  } catch (err) {
    self.postMessage({
      type: 'error',
      assetId,
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
