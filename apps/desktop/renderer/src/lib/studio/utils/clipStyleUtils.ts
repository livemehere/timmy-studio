/**
 * 클립 속성(스타일) 복사/붙여넣기 유틸리티.
 *
 * 각 클립 타입별로 "콘텐츠"를 제외한 시각적 속성만 추출/적용한다.
 *
 * ## 클립 타입별 추출 규칙
 * - **text**: textData 에서 content 제외 (fontSize, fontFamily, color, align, bold, italic, underline, letterSpacing, lineHeight, shadow, background, border)
 * - **shape**: shapeData 에서 width/height 제외 (shapeType, fill, stroke, cornerRadius, sides 등)
 * - **video / image / animated-image**: transforms 만 (position 제외)
 * - **audio**: volume
 *
 * ## 적용 규칙
 * - 같은 타입끼리만 적용 가능 (text→text, shape→shape 등)
 * - 단, transforms 관련 속성(scaleX, scaleY, rotation, opacity)은 모든 graphic clip 간 공유 가능
 */

import type {
  IClip,
  IGraphicClip,
  ITextClip,
  IShapeClip,
  IAudioClip,
  ClipType,
} from '../domains/Clip/types';
import type { ITextData } from '../types/text';
import type { IShapeData } from '../types/shape';

// ─── 타입 정의 ───────────────────────────────────────

export interface TextStyle {
  type: 'text';
  textStyle: Omit<ITextData, 'content'>;
  transforms: TransformStyle;
}

export interface ShapeStyle {
  type: 'shape';
  shapeStyle: Omit<IShapeData, 'width' | 'height'>;
  transforms: TransformStyle;
}

export interface SpriteStyle {
  type: 'video' | 'image' | 'animated-image';
  transforms: TransformStyle;
}

export interface AudioStyle {
  type: 'audio';
  volume: number;
}

/** transforms 중 위치/크기 제외한 스타일 속성 */
export interface TransformStyle {
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
}

export type ClipStyle = TextStyle | ShapeStyle | SpriteStyle | AudioStyle;

// ─── 추출 ────────────────────────────────────────────

export function extractClipStyle(clip: IClip): ClipStyle {
  switch (clip.type) {
    case 'text': {
      const { content: _, ...textStyle } = (clip as ITextClip).textData;
      return {
        type: 'text',
        textStyle,
        transforms: extractTransformStyle(clip as IGraphicClip),
      };
    }

    case 'shape': {
      const {
        width: _,
        height: __,
        ...shapeStyle
      } = (clip as IShapeClip).shapeData;
      return {
        type: 'shape',
        shapeStyle: shapeStyle as Omit<IShapeData, 'width' | 'height'>,
        transforms: extractTransformStyle(clip as IGraphicClip),
      };
    }

    case 'video':
    case 'image':
    case 'animated-image': {
      return {
        type: clip.type,
        transforms: extractTransformStyle(clip as IGraphicClip),
      };
    }

    case 'audio': {
      return {
        type: 'audio',
        volume: (clip as IAudioClip).volume,
      };
    }
  }
}

function extractTransformStyle(clip: IGraphicClip): TransformStyle {
  return {
    scaleX: clip.transforms.scaleX,
    scaleY: clip.transforms.scaleY,
    rotation: clip.transforms.rotation,
    opacity: clip.transforms.opacity,
  };
}

// ─── 적용 ────────────────────────────────────────────

/**
 * 복사된 스타일을 대상 클립에 적용할 때의 업데이트 객체를 반환.
 * `null` 이면 적용 불가 (타입 불일치).
 */
export function applyClipStyle(
  targetClip: IClip,
  style: ClipStyle
): Partial<IClip> | null {
  // 같은 타입이면 전체 스타일 적용
  if (targetClip.type === style.type) {
    return applyExactTypeStyle(targetClip, style);
  }

  // 타입이 다르더라도 graphic 클립 간 transforms 는 공유 가능
  if (isGraphicType(targetClip.type) && isGraphicStyleType(style)) {
    return applyTransformStyleOnly(
      targetClip as IGraphicClip,
      style.transforms
    );
  }

  return null;
}

function applyExactTypeStyle(
  targetClip: IClip,
  style: ClipStyle
): Partial<IClip> {
  switch (style.type) {
    case 'text': {
      const target = targetClip as ITextClip;
      return {
        textData: {
          ...target.textData,
          ...style.textStyle,
          content: target.textData.content, // 콘텐츠 유지
        },
        transforms: {
          ...target.transforms,
          ...style.transforms,
        },
      } as Partial<ITextClip>;
    }

    case 'shape': {
      const target = targetClip as IShapeClip;
      return {
        shapeData: {
          ...target.shapeData,
          ...style.shapeStyle,
          width: target.shapeData.width, // 크기 유지
          height: target.shapeData.height,
        },
        transforms: {
          ...target.transforms,
          ...style.transforms,
        },
      } as Partial<IShapeClip>;
    }

    case 'video':
    case 'image':
    case 'animated-image': {
      const target = targetClip as IGraphicClip;
      return {
        transforms: {
          ...target.transforms,
          ...style.transforms,
        },
      };
    }

    case 'audio': {
      return {
        volume: style.volume,
      } as Partial<IAudioClip>;
    }
  }
}

function applyTransformStyleOnly(
  targetClip: IGraphicClip,
  transforms: TransformStyle
): Partial<IClip> {
  return {
    transforms: {
      ...targetClip.transforms,
      ...transforms,
    },
  };
}

// ─── 유틸 ────────────────────────────────────────────

function isGraphicType(
  type: ClipType
): type is 'text' | 'shape' | 'video' | 'image' | 'animated-image' {
  return type !== 'audio';
}

function isGraphicStyleType(
  style: ClipStyle
): style is TextStyle | ShapeStyle | SpriteStyle {
  return style.type !== 'audio';
}

/** 사용자에게 보여줄 스타일 타입 라벨 */
export function getStyleLabel(type: ClipType): string {
  switch (type) {
    case 'text':
      return 'Text Style';
    case 'shape':
      return 'Shape Style';
    case 'video':
      return 'Video Style';
    case 'image':
      return 'Image Style';
    case 'animated-image':
      return 'GIF Style';
    case 'audio':
      return 'Audio Style';
  }
}

// ─── 포지션 복사/붙여넣기 ─────────────────────────────

export interface PositionData {
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export function extractPosition(clip: IGraphicClip): PositionData {
  return {
    position: { ...clip.transforms.position },
    size: { ...clip.transforms.size },
  };
}

export function applyPosition(
  targetClip: IGraphicClip,
  pos: PositionData
): Partial<IClip> {
  return {
    transforms: {
      ...targetClip.transforms,
      position: { ...pos.position },
      size: { ...pos.size },
    },
  };
}
