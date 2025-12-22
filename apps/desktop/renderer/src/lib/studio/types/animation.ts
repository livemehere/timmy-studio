export interface IAnimation {
  id: string;
  property: string; // 'x', 'y', 'opacity', 'rotation', etc.
  keyframes: IKeyframe[];
}

export interface IKeyframe {
  time: number;
  value: number | string | object;
  easing: EasingFunction;
}

export type EasingFunction =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'cubic-bezier';
