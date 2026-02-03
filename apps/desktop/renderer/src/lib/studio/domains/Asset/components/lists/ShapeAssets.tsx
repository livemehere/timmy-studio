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
    name: '직사각형',
    data: {
      shapeType: 'rectangle',
      width: 200,
      height: 150,
      fill: { type: 'solid', color: '#3b82f6', opacity: 1 },
      stroke: { color: '#1e40af', width: 2, opacity: 1 },
    },
  },
  {
    name: '둥근 사각형',
    data: {
      shapeType: 'rounded-rectangle',
      width: 200,
      height: 150,
      cornerRadius: 20,
      fill: { type: 'solid', color: '#8b5cf6', opacity: 1 },
      stroke: { color: '#6d28d9', width: 2, opacity: 1 },
    },
  },
  {
    name: '원',
    data: {
      shapeType: 'circle',
      width: 150,
      height: 150,
      fill: { type: 'solid', color: '#10b981', opacity: 1 },
      stroke: { color: '#059669', width: 2, opacity: 1 },
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
    name: '삼각형',
    data: {
      shapeType: 'polygon',
      sides: 3,
      width: 150,
      height: 150,
      fill: { type: 'solid', color: '#ef4444', opacity: 1 },
      stroke: { color: '#dc2626', width: 2, opacity: 1 },
    },
  },
  {
    name: '오각형',
    data: {
      shapeType: 'polygon',
      sides: 5,
      width: 150,
      height: 150,
      fill: { type: 'solid', color: '#ec4899', opacity: 1 },
      stroke: { color: '#db2777', width: 2, opacity: 1 },
    },
  },
  {
    name: '육각형',
    data: {
      shapeType: 'polygon',
      sides: 6,
      width: 150,
      height: 150,
      fill: { type: 'solid', color: '#06b6d4', opacity: 1 },
      stroke: { color: '#0891b2', width: 2, opacity: 1 },
    },
  },
];

export function ShapeAssets() {
  const shapeAssets = SHAPE_PRESETS.map((preset) =>
    createShapeAsset(preset.data, preset.name)
  );

  return <AssetList assets={shapeAssets} emptyMessage="No shapes available" />;
}
