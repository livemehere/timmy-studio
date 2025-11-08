export interface IProject {
  id: string; // 고유 ID
  name: string; // 프로젝트 이름
  settings: IProjectSettings; // 프로젝트 설정
  timeline: ITimeline; // 타임라인 데이터
  assets: IAsset[]; // 사용된 에셋 목록
  metadata: IProjectMetadata; // 메타데이터
}

export interface IProjectSettings {
  width: number; // 캔버스 너비 (예: 1920)
  height: number; // 캔버스 높이 (예: 1080)
  frameRate: number; // FPS (예: 30, 60)
  sampleRate: number; // 오디오 샘플레이트 (예: 44100)
  duration: number; // 총 길이 (밀리초)
  backgroundColor: string; // 배경색
}

export interface IProjectMetadata {
  createdAt: string;
  updatedAt: string;
  author?: string;
  description?: string;
}

export interface ITimeline {
  tracks: ITrack[]; // 트랙 배열 (레이어 개념)
  duration: number; // 총 길이 (ms)
  currentTime: number; // 현재 재생 위치 (ms)
}

export interface ITrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'text' | 'image'; // 트랙 타입
  clips: IClip[]; // 클립 배열
  enabled: boolean; // 활성화 여부
  locked: boolean; // 잠금 여부
  volume?: number; // 오디오 볼륨 (0-1)
  opacity?: number; // 비디오 투명도 (0-1)
  zIndex: number; // 렌더링 순서
}

export interface IClip {
  id: string;
  assetId: string; // Asset 참조
  trackId: string; // 소속 트랙
  startTime: number; // 타임라인 상 시작 시간 (밀리초)
  endTime: number; // 타임라인 상 종료 시간 (밀리초)
  trimStart: number; // 원본에서 잘린 시작 지점
  trimEnd: number; // 원본에서 잘린 종료 지점
  effects: IEffect[]; // 적용된 효과들
  transforms: ITransform; // 변형 정보
  animations: IAnimation[]; // 애니메이션 키프레임
}

export interface ITransform {
  x: number; // X 위치
  y: number; // Y 위치
  scaleX: number; // X 스케일
  scaleY: number; // Y 스케일
  rotation: number; // 회전 (radian)
  opacity: number; // 투명도 (0-1)
  anchorX: number; // 앵커 포인트 X (0-1)
  anchorY: number; // 앵커 포인트 Y (0-1)
}

export interface IAsset {
  id: string;
  type: 'video' | 'audio' | 'image' | 'text';
  name: string;
  filePath: string; // 원본 파일 경로
  metadata: IAssetMetadata;
  thumbnail?: string; // 썸네일 경로 or base64
}

export interface IAssetMetadata {
  duration?: number; // 미디어 길이 (밀리초)
  width?: number; // 비디오/이미지 너비
  height?: number; // 비디오/이미지 높이
  frameRate?: number; // 비디오 FPS
  codec?: string; // 코덱 정보
  size: number; // 파일 크기 (bytes)
  createdAt: string;
}

export interface IEffect {
  id: string;
  type: EffectType;
  enabled: boolean;
  parameters: Record<string, any>; // 효과별 파라미터
}

export type EffectType =
  | 'blur'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'hue'
  | 'chromaKey' // 크로마키
  | 'mask'
  | 'transition'
  | 'custom';

export interface IAnimation {
  id: string;
  property: string; // 'x', 'y', 'opacity', 'rotation', etc.
  keyframes: IKeyframe[];
}

export interface IKeyframe {
  time: number; // 밀리초
  value: number | string | object; // 속성 값
  easing: EasingFunction;
}

export type EasingFunction =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'cubic-bezier';
