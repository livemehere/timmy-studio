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
    color: number | string;
    offsetX: number;
    offsetY: number;
    blur: number;
  };
  background?: number | string;
  border?: {
    color: number | string;
    width: number;
    radius?: number;
  };
  padding?: number | [number, number] | [number, number, number, number];
}
