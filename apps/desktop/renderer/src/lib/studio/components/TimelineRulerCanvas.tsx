import { useEffectEvent, useRef } from 'react';
import { useDocStore, useEngineStore } from '../hooks/useStudioStores';
import { useResizeCanvas } from '../hooks/useResizeCanvas';
import { type MotionValue, useMotionValueEvent } from 'motion/react';
import { formatTime } from '../utils/time';

export function TimelineRulerCanvas({
  scrollXMotionValue,
  leftPadding,
  pixelPerSecond,
}: {
  scrollXMotionValue: MotionValue<number>;
  leftPadding: number;
  pixelPerSecond: number;
}) {
  const duration = useDocStore((state) => state.settings.duration); // duration: ms 라고 가정
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timer = useEngineStore((state) => state.timer);
  const isDraggingRef = useRef(false);

  const redraw = useEffectEvent(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawRuler({
      ctx,
      width: canvas.width,
      height: canvas.height,
      durationMs: duration,
      pixelPerSecond,
      offsetX: scrollXMotionValue.get(), // ✅ 스크롤 반영
    });
  });

  useResizeCanvas(canvasRef, redraw, containerRef);

  // 스크롤 변할 때마다 redraw
  useMotionValueEvent(scrollXMotionValue, 'change', () => {
    redraw();
  });

  // 클릭한 x 좌표를 시간(ms)으로 변환
  const xToMs = (clientX: number): number => {
    const container = containerRef.current;
    if (!container) return 0;

    const rect = container.getBoundingClientRect();
    const localX = clientX - rect.left;
    const scrollX = scrollXMotionValue.get();
    const ms = ((localX + scrollX) / pixelPerSecond) * 1000;

    // 0 ~ duration 범위로 클램프
    return Math.max(0, Math.min(duration, ms));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!timer) return;

    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const ms = xToMs(e.clientX);
    timer.seek(ms);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!timer || !isDraggingRef.current) return;

    const ms = xToMs(e.clientX);
    timer.seek(ms);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div className="w-full h-6 select-none flex bg-neutral-900/80 border-b border-neutral-800">
      <div
        style={{ width: leftPadding }}
        className="h-full shrink-0 flex items-center justify-center border-r border-neutral-800"
      >
        <span className="text-[10px] text-neutral-500 font-medium">TIME</span>
      </div>
      <div
        ref={containerRef}
        className="h-full cursor-pointer flex-1 hover:bg-neutral-800/30 transition-colors"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

function drawRuler({
  ctx,
  width,
  height,
  durationMs,
  pixelPerSecond,
  offsetX,
}: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  durationMs: number;
  pixelPerSecond: number;
  offsetX: number; // scrollX(px)
}) {
  // pxPerMs 로 변환
  const pxPerMs = pixelPerSecond / 1000;

  ctx.clearRect(0, 0, width, height);

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '10px sans-serif';
  ctx.textBaseline = 'middle';

  // step 자동 선택
  const { minorMs, majorMs } = pickTimeSteps(pxPerMs);

  // 현재 화면에서 보이는 ms 구간 계산 (스크롤 반영)
  // offsetX=0일 때 화면의 x=0이 ms=0
  const startMs = Math.max(0, offsetX / pxPerMs);
  const endMs = Math.min(durationMs, (offsetX + width) / pxPerMs);

  const firstMinor = Math.floor(startMs / minorMs) * minorMs;

  // 텍스트 너비 측정 (대략적인 값 사용)
  const labelWidth = ctx.measureText('00:00').width; // 4px 좌우 여백

  // 각 major tick의 텍스트 영역 끝 x 좌표 추적
  let lastLabelEndX = -Infinity;

  for (let t = firstMinor; t <= endMs; t += minorMs) {
    const x = t * pxPerMs - offsetX;
    if (x < 0 || x > width) continue;

    const isMajor = isMultiple(t, majorMs);
    const isMid = isMultiple(t, majorMs / 2);

    // major가 아닌 경우, 이전 major 텍스트 영역과 겹치면 생략
    if (!isMajor && x < lastLabelEndX) {
      continue;
    }

    const tickH = isMajor ? height * 0.9 : isMid ? height * 0.6 : height * 0.35;

    // major tick은 두껍게
    ctx.lineWidth = isMajor ? 1.4 : 1;

    // tick (상단에서 시작)
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, tickH);
    ctx.stroke();

    // label (major만, y축 가운데)
    if (isMajor) {
      ctx.fillText(formatTime(t, { style: 'short' }), x + 4, height / 2);
      lastLabelEndX = x + 4 + labelWidth;
    }
  }

  ctx.restore();
}

/** 1–2–5 시퀀스로 minor/major step 고르기 */
function pickTimeSteps(pxPerMs: number, minPxSpacing = 10) {
  const idealMinorMs = minPxSpacing / pxPerMs;

  const bases = [1, 2, 5];
  let pow10 = Math.pow(10, Math.floor(Math.log10(idealMinorMs)));
  let minorMs = bases[0] * pow10;

  outer: while (minorMs < idealMinorMs) {
    for (const b of bases) {
      const cand = b * pow10;
      if (cand >= idealMinorMs) {
        minorMs = cand;
        break outer;
      }
    }
    pow10 *= 10;
    minorMs = bases[0] * pow10;
  }

  const major5 = minorMs * 5;
  const major10 = minorMs * 10;
  const major5Px = major5 * pxPerMs;
  const majorMs = major5Px >= 80 ? major5 : major10;

  return { minorMs, majorMs };
}

function isMultiple(value: number, step: number) {
  if (step === 0) return false;
  const q = value / step;
  return Math.abs(q - Math.round(q)) < 1e-6;
}
