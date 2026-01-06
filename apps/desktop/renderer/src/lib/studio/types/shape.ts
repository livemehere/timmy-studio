export type ShapeType =
  | 'rectangle'
  | 'rounded-rectangle'
  | 'circle'
  | 'ellipse'
  | 'polygon';

export interface IShapeDataBase {
  shapeType: ShapeType;
  width: number;
  height: number;
  fill: {
    color: number | string;
    opacity?: number;
  };
  stroke?: {
    color: number | string;
    width: number;
    opacity?: number;
  };
}

export interface IRectangleData extends IShapeDataBase {
  shapeType: 'rectangle';
}

export interface IRoundedRectangleData extends IShapeDataBase {
  shapeType: 'rounded-rectangle';
  cornerRadius: number;
}

export interface ICircleData extends IShapeDataBase {
  shapeType: 'circle';
}

export interface IEllipseData extends IShapeDataBase {
  shapeType: 'ellipse';
}

export interface IPolygonData extends IShapeDataBase {
  shapeType: 'polygon';
  sides: number; // 3~n (삼각형부터 다각형까지)
}

export type IShapeData =
  | IRectangleData
  | IRoundedRectangleData
  | ICircleData
  | IEllipseData
  | IPolygonData;
