export interface ITextData {
  content: string;
  fontSize: number;
  fontFamily: string;
  color: number | string;
  align: 'left' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  letterSpacing?: number;
  lineHeight?: number;
  shadow?: {
    color: string;
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
  border?: {
    color: number | string;
    width: number;
    radius?: number;
  };
}
