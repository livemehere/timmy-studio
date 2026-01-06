export type ShapeType =
  | 'rectangle'
  | 'rounded-rectangle'
  | 'circle'
  | 'ellipse'
  | 'polygon';

export type FillType = 'solid' | 'linear-gradient' | 'radial-gradient';

export interface ISolidFill {
  type: 'solid';
  color: number | string;
  opacity?: number;
}

export interface ILinearGradientFill {
  type: 'linear-gradient';
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  colorStops: Array<{
    offset: number; // 0-1
    color: number | string;
    alpha?: number;
  }>;
}

export interface IRadialGradientFill {
  type: 'radial-gradient';
  x0: number;
  y0: number;
  radius0: number;
  x1: number;
  y1: number;
  radius1: number;
  colorStops: Array<{
    offset: number; // 0-1
    color: number | string;
    alpha?: number;
  }>;
}

export type IFill = ISolidFill | ILinearGradientFill | IRadialGradientFill;

export interface IShapeDataBase {
  shapeType: ShapeType;
  width: number;
  height: number;
  fill: IFill;
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
