import { useRef, useEffect, memo } from 'react';
import type { WaveformData } from '@/lib/studio/engine/waveformCache';

/** 파형 색상 */
const WAVEFORM_COLOR = 'rgba(74, 222, 128, 0.7)'; // green-400/70

/**
 * 오디오 클립 타임라인에 파형을 Canvas로 렌더링하는 컴포넌트.
 * peaks 배열 + pxPerSec + trimStart 를 기반으로
 * 보이는 영역의 파형만 그린다.
 */
export const WaveformBackground = memo(function WaveformBackground({
  waveformData,
  trimStart,
  pxPerSec,
  clipWidthPx,
}: {
  waveformData: WaveformData;
  /** 트림 시작 시간 (ms) */
  trimStart: number;
  /** 타임라인 줌 레벨 (px/sec) */
  pxPerSec: number;
  /** 클립 렌더링 너비 (px) */
  clipWidthPx: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { peaks, samplesPerSec } = waveformData;

    // Canvas 크기 설정 (devicePixelRatio 대응)
    const dpr = window.devicePixelRatio || 1;
    const w = Math.ceil(clipWidthPx);
    const h = canvas.parentElement?.clientHeight ?? 40;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // 파형 그리기
    const trimStartSec = trimStart / 1000;
    const centerY = h / 2;

    ctx.fillStyle = WAVEFORM_COLOR;
    ctx.beginPath();

    for (let px = 0; px < w; px++) {
      // 현재 픽셀에 대응하는 시간 (초)
      const timeSec = trimStartSec + px / pxPerSec;
      // peaks 인덱스
      const peakIdx = Math.floor(timeSec * samplesPerSec);

      if (peakIdx < 0 || peakIdx >= peaks.length) continue;

      const amplitude = peaks[peakIdx];
      const barH = amplitude * centerY;

      // 중앙 기준 위아래 대칭 바
      ctx.rect(px, centerY - barH, 1, barH * 2);
    }

    ctx.fill();
  }, [waveformData, trimStart, pxPerSec, clipWidthPx]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: clipWidthPx, height: '100%' }}
    />
  );
});
