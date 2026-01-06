export interface IEffectMask {
  enabled: boolean;
  shape: 'rectangle' | 'ellipse';
  // Normalized coordinates (0-1 relative to clip size)
  x: number; // left position
  y: number; // top position
  width: number; // mask width
  height: number; // mask height
}

export interface IEffect {
  id: string;
  type: EffectType;
  enabled: boolean;
  parameters: Record<string, unknown>;
  mask?: IEffectMask; // Optional mask to apply effect only to specific area
}

export type EffectType =
  | 'blur'
  | 'pixelate'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'hue'
  | 'chromaKey'
  | 'mask'
  | 'transition'
  | 'custom';
