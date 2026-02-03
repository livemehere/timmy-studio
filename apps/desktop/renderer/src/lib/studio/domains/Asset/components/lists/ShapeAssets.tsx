import type { IShapeData } from '@/lib/studio/types/shape';
import type { IShapeAsset } from '@/lib/studio/domains/Asset/types';
import { AssetList } from '@/lib/studio/domains/Asset/components/AssetList';
import { uid } from 'uid';

const createShapeAsset = (
  shapeData: IShapeData,
  name: string
): IShapeAsset => ({
  id: uid(8),
  name,
  type: 'shape',
  shapeData,
  metadata: { size: 0 },
});

const SHAPE_PRESETS: Array<{ name: string; data: IShapeData }> = [
  {
    name: '사각형',
    data: {
      shapeType: 'rectangle',
      width: 200,
      height: 150,
      fill: { type: 'solid', color: '#3b82f6', opacity: 1 },
      stroke: { color: '#1e40af', width: 2, opacity: 1 },
    },
  },
  {
    name: '타원',
    data: {
      shapeType: 'ellipse',
      width: 200,
      height: 120,
      fill: { type: 'solid', color: '#f59e0b', opacity: 1 },
      stroke: { color: '#d97706', width: 2, opacity: 1 },
    },
  },
  {
    name: '다각형',
    data: {
      shapeType: 'polygon',
      sides: 3,
      width: 150,
      height: 150,
      fill: { type: 'solid', color: '#ef4444', opacity: 1 },
      stroke: { color: '#dc2626', width: 2, opacity: 1 },
    },
  },
];

export function ShapeAssets() {
  const shapeAssets = SHAPE_PRESETS.map((preset) =>
    createShapeAsset(preset.data, preset.name)
  );

  return <AssetList assets={shapeAssets} emptyMessage="No shapes available" />;
}
