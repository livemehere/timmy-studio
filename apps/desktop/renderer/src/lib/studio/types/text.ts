export interface ITextData {
  content: string;
  fontSize: number;
  fontFamily: string;
  color: number | string;
  align: 'left' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  shadow?: {
    color: string; // number | string 에서 string으로 통일 권장, 일단 유지
    blur: number;
    offsetX: number;
    offsetY: number;
    alpha?: number;
  };
  background?: {
    color: string;
    paddingX: number;
    paddingY: number;
    radius: number;
    alpha?: number;
  };
  // Deprecated: padding is now part of background
  // padding?: number | [number, number] | [number, number, number, number];
  border?: {
    color: number | string;
    width: number;
    radius?: number; // border radius? background radius와 겹칠 수 있음.
  };
}
