import { useEffect, useRef } from 'react';
import { Application, Graphics, Text, TextStyle, Sprite } from 'pixi.js';

// ==================== 상수 ====================
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const CANVAS_BG_COLOR = '#1a1a1a';

// ==================== 컴포넌트 ====================
export default function PixiPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // PixiJS 앱 생성
    const app = new Application();
    appRef.current = app;

    // 초기화
    app
      .init({
        canvas: canvasRef.current,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        background: CANVAS_BG_COLOR,
        resolution: 1,
        autoDensity: false,
      })
      .then(() => {
        console.log('[PixiPlayground] PixiJS initialized');

        // ==================== 여기서부터 테스트 코드 작성 ====================

        // 예제 1: 사각형 그리기
        const rect = new Graphics();
        rect.rect(0, 0, 200, 150);
        rect.fill({ color: '#3b82f6', alpha: 1 });
        rect.rect(0, 0, 200, 150);
        rect.stroke({ width: 2, color: '#1e40af', alpha: 1 });
        rect.x = 100;
        rect.y = 100;
        app.stage.addChild(rect);

        // 예제 2: 원 그리기
        const circle = new Graphics();
        circle.circle(75, 75, 75);
        circle.fill({ color: '#10b981', alpha: 1 });
        circle.circle(75, 75, 75);
        circle.stroke({ width: 2, color: '#059669', alpha: 1 });
        circle.x = 400;
        circle.y = 100;
        app.stage.addChild(circle);

        // 예제 3: 다각형 (육각형)
        const hexagon = new Graphics();
        const hexPoints = calculatePolygonPoints(75, 75, 70, 6);
        hexagon.poly(hexPoints);
        hexagon.fill({ color: '#f59e0b', alpha: 1 });
        hexagon.poly(hexPoints);
        hexagon.stroke({ width: 2, color: '#d97706', alpha: 1 });
        hexagon.x = 700;
        hexagon.y = 100;
        app.stage.addChild(hexagon);

        // 예제 4: Pivot 테스트 (회전 중심)
        const rotatingRect = new Graphics();
        rotatingRect.rect(0, 0, 150, 100);
        rotatingRect.fill({ color: '#ec4899', alpha: 1 });
        rotatingRect.pivot.set(75, 50); // 중심을 pivot으로 설정
        rotatingRect.x = 200;
        rotatingRect.y = 400;
        app.stage.addChild(rotatingRect);

        // 예제 5: Sprite 안에 Graphics 넣기 (ShapeClip 방식)
        const sprite = new Sprite();
        sprite.x = 550;
        sprite.y = 350;
        app.stage.addChild(sprite);

        const shapeInSprite = new Graphics();
        shapeInSprite.circle(0, 0, 50);
        shapeInSprite.fill({ color: '#8b5cf6', alpha: 1 });
        shapeInSprite.pivot.set(0, 0); // pivot 설정
        sprite.addChild(shapeInSprite);

        // 텍스트 레이블
        const labels = [
          { text: 'Rectangle', x: 200, y: 260 },
          { text: 'Circle', x: 475, y: 260 },
          { text: 'Hexagon', x: 775, y: 260 },
          { text: 'Rotating Rect\n(pivot center)', x: 275, y: 510 },
          { text: 'Graphics in Sprite', x: 625, y: 460 },
        ];

        labels.forEach(({ text, x, y }) => {
          const label = new Text({
            text,
            style: new TextStyle({
              fontFamily: 'Arial',
              fontSize: 14,
              fill: '#ffffff',
              align: 'center',
            }),
          });
          label.anchor.set(0.5);
          label.x = x;
          label.y = y;
          app.stage.addChild(label);
        });

        // 애니메이션: 회전하는 사각형
        app.ticker.add(() => {
          rotatingRect.rotation += 0.01;
        });

        // ==================== 테스트 코드 끝 ====================
      });

    // 클린업
    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, {
          children: true,
          texture: true,
          textureSource: true,
        });
        appRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-neutral-900">
      <div className="p-4 border-b border-neutral-700">
        <h1 className="text-xl font-bold text-white">PixiJS Playground</h1>
        <p className="text-sm text-neutral-400 mt-1">
          간단한 PixiJS 테스트 환경입니다. 코드를 직접 수정하여 테스트하세요.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="border-2 border-neutral-700 rounded-lg overflow-hidden">
          <canvas ref={canvasRef} />
        </div>
      </div>

      <div className="p-4 border-t border-neutral-700 bg-neutral-800">
        <h2 className="text-sm font-semibold text-white mb-2">사용법</h2>
        <ul className="text-xs text-neutral-400 space-y-1">
          <li>
            • 파일 위치:{' '}
            <code className="text-blue-400">
              apps/desktop/renderer/src/pages/PixiPlayground.tsx
            </code>
          </li>
          <li>• 상수는 컴포넌트 위에 정의되어 있습니다</li>
          <li>
            • "여기서부터 테스트 코드 작성" 주석 아래에서 코드를 수정하세요
          </li>
          <li>• 저장하면 Hot Reload로 즉시 반영됩니다</li>
        </ul>
      </div>
    </div>
  );
}

// ==================== 유틸리티 함수 ====================
function calculatePolygonPoints(
  centerX: number,
  centerY: number,
  radius: number,
  sides: number
): number[] {
  const points: number[] = [];
  const angleStep = (Math.PI * 2) / sides;
  const startAngle = -Math.PI / 2;

  for (let i = 0; i < sides; i++) {
    const angle = startAngle + angleStep * i;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    points.push(x, y);
  }

  return points;
}
