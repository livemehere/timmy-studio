import { Button } from '@/components/ui/button';
import { useDocStore } from '@/lib/studio/hooks/useStudioStores';
import { Track } from '@/lib/studio/domains/Track/Track';
import { Clip } from '@/lib/studio/domains/Clip/Clip';
import {
  Circle,
  Hexagon,
  Pentagon,
  Square,
  Triangle,
  RectangleHorizontal,
} from 'lucide-react';
import { useState } from 'react';
import type { IShapeData } from '@/lib/studio/types/shape';

export function ShapeAssets() {
  const addClip = useDocStore((state) => state.addClip);
  const addTrack = useDocStore((state) => state.addTrack);
  const tracks = useDocStore((state) => state.tracks);
  const [polygonSides, setPolygonSides] = useState(6);

  const handleAddShape = (shapeData: IShapeData) => {
    // 1. 그래픽 트랙 찾기 또는 생성
    let targetTrack = Track.findFirstTrack(tracks, 'graphic');

    if (!targetTrack) {
      const newTrack = Track.create('graphic');
      addTrack(newTrack);
      targetTrack = newTrack;
    }

    // 2. 도형 클립 생성
    const newClip = Clip.createShape(shapeData);

    // 3. 트랙의 마지막 위치에 추가 (겹치지 않게)
    const lastEndTime = Track.getLastestClipEndTime(targetTrack);
    newClip.startTime = lastEndTime;
    newClip.endTime = lastEndTime + Clip.DEFAULT_CLIP_DURATION_MS;

    addClip(targetTrack.id, newClip);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {/* 직사각형 */}
        <Button
          variant="secondary"
          className="h-24 flex flex-col gap-2"
          onClick={() =>
            handleAddShape({
              shapeType: 'rectangle',
              width: 200,
              height: 150,
              fill: { type: 'solid', color: '#3b82f6', opacity: 1 },
              stroke: { color: '#1e40af', width: 2, opacity: 1 },
            })
          }
        >
          <Square className="w-8 h-8" />
          <span className="text-xs text-neutral-400">직사각형</span>
        </Button>

        {/* 둥근 직사각형 */}
        <Button
          variant="secondary"
          className="h-24 flex flex-col gap-2"
          onClick={() =>
            handleAddShape({
              shapeType: 'rounded-rectangle',
              width: 200,
              height: 150,
              cornerRadius: 20,
              fill: { type: 'solid', color: '#8b5cf6', opacity: 1 },
              stroke: { color: '#6d28d9', width: 2, opacity: 1 },
            })
          }
        >
          <RectangleHorizontal className="w-8 h-8 rounded-lg" />
          <span className="text-xs text-neutral-400">둥근 사각형</span>
        </Button>

        {/* 원 */}
        <Button
          variant="secondary"
          className="h-24 flex flex-col gap-2"
          onClick={() =>
            handleAddShape({
              shapeType: 'circle',
              width: 150,
              height: 150,
              fill: { type: 'solid', color: '#10b981', opacity: 1 },
              stroke: { color: '#059669', width: 2, opacity: 1 },
            })
          }
        >
          <Circle className="w-8 h-8" />
          <span className="text-xs text-neutral-400">원</span>
        </Button>

        {/* 타원 */}
        <Button
          variant="secondary"
          className="h-24 flex flex-col gap-2"
          onClick={() =>
            handleAddShape({
              shapeType: 'ellipse',
              width: 200,
              height: 120,
              fill: { type: 'solid', color: '#f59e0b', opacity: 1 },
              stroke: { color: '#d97706', width: 2, opacity: 1 },
            })
          }
        >
          <Circle className="w-10 h-6" />
          <span className="text-xs text-neutral-400">타원</span>
        </Button>

        {/* 삼각형 */}
        <Button
          variant="secondary"
          className="h-24 flex flex-col gap-2"
          onClick={() =>
            handleAddShape({
              shapeType: 'polygon',
              sides: 3,
              width: 150,
              height: 150,
              fill: { type: 'solid', color: '#ef4444', opacity: 1 },
              stroke: { color: '#dc2626', width: 2, opacity: 1 },
            })
          }
        >
          <Triangle className="w-8 h-8" />
          <span className="text-xs text-neutral-400">삼각형</span>
        </Button>

        {/* 오각형 */}
        <Button
          variant="secondary"
          className="h-24 flex flex-col gap-2"
          onClick={() =>
            handleAddShape({
              shapeType: 'polygon',
              sides: 5,
              width: 150,
              height: 150,
              fill: { type: 'solid', color: '#ec4899', opacity: 1 },
              stroke: { color: '#db2777', width: 2, opacity: 1 },
            })
          }
        >
          <Pentagon className="w-8 h-8" />
          <span className="text-xs text-neutral-400">오각형</span>
        </Button>

        {/* 육각형 */}
        <Button
          variant="secondary"
          className="h-24 flex flex-col gap-2"
          onClick={() =>
            handleAddShape({
              shapeType: 'polygon',
              sides: 6,
              width: 150,
              height: 150,
              fill: { type: 'solid', color: '#06b6d4', opacity: 1 },
              stroke: { color: '#0891b2', width: 2, opacity: 1 },
            })
          }
        >
          <Hexagon className="w-8 h-8" />
          <span className="text-xs text-neutral-400">육각형</span>
        </Button>
      </div>

      {/* 커스텀 다각형 */}
      <div className="border-t border-neutral-700 pt-4">
        <div className="text-sm text-neutral-300 mb-2">커스텀 다각형</div>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min="3"
            max="20"
            value={polygonSides}
            onChange={(e) => setPolygonSides(Number(e.target.value))}
            className="w-20 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-white"
          />
          <span className="text-xs text-neutral-400">면</span>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() =>
              handleAddShape({
                shapeType: 'polygon',
                sides: polygonSides,
                width: 150,
                height: 150,
                fill: { type: 'solid', color: '#a855f7', opacity: 1 },
                stroke: { color: '#9333ea', width: 2, opacity: 1 },
              })
            }
          >
            {polygonSides}각형 추가
          </Button>
        </div>
      </div>
    </div>
  );
}
