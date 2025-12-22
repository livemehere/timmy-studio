export interface IShapeData {
  shapeType: 'rectangle' | 'circle' | 'polygon';
  width: number;
  height: number;
  color: number | string;
  radius?: number;
  border?: {
    color: number | string;
    width: number;
  };
}
