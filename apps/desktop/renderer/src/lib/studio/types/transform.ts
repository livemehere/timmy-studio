export interface ITransform {
  position?: {
    x: number;
    y: number;
  };
  size?: {
    width: number;
    height: number;
  };
  scaleX?: number;
  scaleY?: number;
  rotation?: number; // radian
  opacity?: number; // 0-1
  anchorX?: number; // 0-1
  anchorY?: number; // 0-1
}
