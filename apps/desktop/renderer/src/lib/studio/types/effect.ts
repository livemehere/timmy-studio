export interface IEffect {
  id: string;
  type: EffectType;
  enabled: boolean;
  parameters: Record<string, unknown>;
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
