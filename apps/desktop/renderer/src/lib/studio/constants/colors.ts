import type { ClipType } from '@/lib/studio/domains/Clip/types';

export type TailwindAlphaStep = 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90;

export const getClipBg = (
  clipType: ClipType,
  alpha?: TailwindAlphaStep
): string => {
  let base: string;

  switch (clipType) {
    case 'video':
      base = 'bg-cyan-700';
      break;
    case 'image':
      base = 'bg-blue-700';
      break;
    case 'animated-image':
      base = 'bg-indigo-700';
      break;
    case 'shape':
      base = 'bg-violet-700';
      break;
    case 'text':
      base = 'bg-amber-700';
      break;
    case 'audio':
      base = 'bg-green-700';
      break;
  }

  if (!alpha) return base;
  return `${base}/${alpha}`;
};
