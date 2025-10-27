# 비디오 에디터 아키텍처 설계

## 1. 전체 시스템 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process                          │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │   UI Layer       │         │   Canvas Layer   │         │
│  │  (Timeline,      │◄────────┤  (Frame Render)  │         │
│  │   Preview, etc)  │         │                  │         │
│  └──────────────────┘         └──────────────────┘         │
│           │                            │                     │
│           ▼                            ▼                     │
│  ┌──────────────────────────────────────────────────┐      │
│  │         Project State Manager                     │      │
│  │         (JSON 기반 상태 관리)                      │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │ IPC
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Main Process                             │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │   File Manager   │         │  Export Pipeline │         │
│  │  (프로젝트 저장)  │         │  (FFmpeg 통합)   │         │
│  └──────────────────┘         └──────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## 2. 핵심 데이터 구조

### 2.1 Project (최상위 구조)

```typescript
interface Project {
  version: string;                    // 프로젝트 버전
  id: string;                         // 고유 ID
  name: string;                       // 프로젝트 이름
  settings: ProjectSettings;          // 프로젝트 설정
  timeline: Timeline;                 // 타임라인 데이터
  assets: Asset[];                    // 사용된 에셋 목록
  metadata: ProjectMetadata;          // 메타데이터
}

interface ProjectSettings {
  width: number;                      // 캔버스 너비 (예: 1920)
  height: number;                     // 캔버스 높이 (예: 1080)
  frameRate: number;                  // FPS (예: 30, 60)
  sampleRate: number;                 // 오디오 샘플레이트 (예: 44100)
  duration: number;                   // 총 길이 (밀리초)
  backgroundColor: string;            // 배경색
}

interface ProjectMetadata {
  createdAt: string;
  updatedAt: string;
  author?: string;
  description?: string;
}
```

### 2.2 Timeline (타임라인 구조)

```typescript
interface Timeline {
  tracks: Track[];                    // 트랙 배열 (레이어 개념)
  duration: number;                   // 총 길이 (밀리초)
  currentTime: number;                // 현재 재생 위치
}

interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'text';   // 트랙 타입
  clips: Clip[];                      // 클립 배열
  enabled: boolean;                   // 활성화 여부
  locked: boolean;                    // 잠금 여부
  volume?: number;                    // 오디오 볼륨 (0-1)
  opacity?: number;                   // 비디오 투명도 (0-1)
  zIndex: number;                     // 렌더링 순서
}
```

### 2.3 Clip (타임라인 상의 개별 요소)

```typescript
interface Clip {
  id: string;
  assetId: string;                    // Asset 참조
  trackId: string;                    // 소속 트랙
  startTime: number;                  // 타임라인 상 시작 시간 (밀리초)
  endTime: number;                    // 타임라인 상 종료 시간 (밀리초)
  trimStart: number;                  // 원본에서 잘린 시작 지점
  trimEnd: number;                    // 원본에서 잘린 종료 지점
  effects: Effect[];                  // 적용된 효과들
  transforms: Transform;              // 변형 정보
  animations: Animation[];            // 애니메이션 키프레임
}

interface Transform {
  x: number;                          // X 위치
  y: number;                          // Y 위치
  scaleX: number;                     // X 스케일
  scaleY: number;                     // Y 스케일
  rotation: number;                   // 회전 (도)
  opacity: number;                    // 투명도 (0-1)
  anchorX: number;                    // 앵커 포인트 X (0-1)
  anchorY: number;                    // 앵커 포인트 Y (0-1)
}
```

### 2.4 Asset (리소스 관리)

```typescript
interface Asset {
  id: string;
  type: 'video' | 'audio' | 'image' | 'text';
  name: string;
  filePath: string;                   // 원본 파일 경로
  metadata: AssetMetadata;
  thumbnail?: string;                 // 썸네일 경로 or base64
}

interface AssetMetadata {
  duration?: number;                  // 미디어 길이 (밀리초)
  width?: number;                     // 비디오/이미지 너비
  height?: number;                    // 비디오/이미지 높이
  frameRate?: number;                 // 비디오 FPS
  codec?: string;                     // 코덱 정보
  size: number;                       // 파일 크기 (bytes)
  createdAt: string;
}
```

### 2.5 Effect (효과 시스템)

```typescript
interface Effect {
  id: string;
  type: EffectType;
  enabled: boolean;
  parameters: Record<string, any>;    // 효과별 파라미터
}

type EffectType =
  | 'blur'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'hue'
  | 'chromaKey'                       // 크로마키
  | 'mask'
  | 'transition'
  | 'custom';

// 예시: 블러 효과
interface BlurEffect extends Effect {
  type: 'blur';
  parameters: {
    radius: number;                   // 0-100
    quality: 'low' | 'medium' | 'high';
  };
}

// 예시: 트랜지션 효과
interface TransitionEffect extends Effect {
  type: 'transition';
  parameters: {
    transitionType: 'fade' | 'slide' | 'wipe' | 'dissolve';
    duration: number;                 // 밀리초
    easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  };
}
```

### 2.6 Animation (키프레임 애니메이션)

```typescript
interface Animation {
  id: string;
  property: string;                   // 'x', 'y', 'opacity', 'rotation', etc.
  keyframes: Keyframe[];
}

interface Keyframe {
  time: number;                       // 밀리초
  value: number | string | object;   // 속성 값
  easing: EasingFunction;
}

type EasingFunction =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'cubic-bezier';
```

## 3. 렌더링 파이프라인

### 3.1 Renderer Process (Canvas 렌더링)

```typescript
interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  currentFrame: number;
  frameRate: number;
  project: Project;
}

interface FrameData {
  frameNumber: number;
  timestamp: number;                  // 밀리초
  imageData: ImageData;               // Canvas에서 추출한 픽셀 데이터
  width: number;
  height: number;
}

class CanvasRenderer {
  // 특정 시간의 프레임 렌더링
  renderFrame(timestamp: number): FrameData;

  // 트랙별 클립 렌더링
  renderTrack(track: Track, timestamp: number): void;

  // 클립 렌더링 (Transform, Effect 적용)
  renderClip(clip: Clip, timestamp: number): void;

  // Effect 체인 적용
  applyEffects(imageData: ImageData, effects: Effect[]): ImageData;
}
```

### 3.2 Export Pipeline (Main Process)

```typescript
interface ExportSettings {
  format: 'mp4' | 'webm' | 'mov' | 'avi';
  codec: {
    video: 'h264' | 'h265' | 'vp9' | 'av1';
    audio: 'aac' | 'mp3' | 'opus';
  };
  quality: {
    videoBitrate: string;             // '5000k'
    audioBitrate: string;             // '192k'
    crf?: number;                     // Constant Rate Factor (0-51)
  };
  outputPath: string;
}

interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  estimatedTimeRemaining: number;     // 초
  stage: 'rendering' | 'encoding' | 'muxing' | 'complete';
}

class ExportPipeline {
  // 1. Renderer에서 프레임 요청
  async requestFrame(frameNumber: number): Promise<FrameData>;

  // 2. FFmpeg에 프레임 파이프
  async pipeFrameToFFmpeg(frameData: FrameData): Promise<void>;

  // 3. 오디오 믹싱
  async mixAudioTracks(tracks: Track[]): Promise<string>;

  // 4. 비디오+오디오 최종 믹싱
  async muxVideoAudio(videoPath: string, audioPath: string): Promise<string>;

  // 5. 진행상황 알림
  onProgress(callback: (progress: ExportProgress) => void): void;
}
```

### 3.3 FFmpeg 통합

```typescript
interface FFmpegConfig {
  inputFormat: 'rawvideo';            // 파이프로 받을 형식
  pixelFormat: 'rgba' | 'rgb24';      // Canvas 픽셀 포맷
  videoFilter?: string;               // 추가 필터
  audioFilter?: string;
}

class FFmpegService {
  // 비디오 인코딩 프로세스 시작
  startVideoEncoding(config: FFmpegConfig): void;

  // 프레임 데이터를 stdin으로 전송
  writeFrame(frameData: Buffer): void;

  // 오디오 트랙 믹싱
  mixAudioTracks(audioPaths: string[], outputPath: string): Promise<void>;

  // 최종 믹싱
  muxStreams(videoPath: string, audioPath: string, outputPath: string): Promise<void>;
}
```

## 4. IPC 통신 구조

### 4.1 Renderer → Main

```typescript
// 프로젝트 저장
ipcRenderer.invoke('project:save', project: Project): Promise<void>

// 프로젝트 로드
ipcRenderer.invoke('project:load', path: string): Promise<Project>

// 에셋 추가
ipcRenderer.invoke('asset:import', filePath: string): Promise<Asset>

// 내보내기 시작
ipcRenderer.invoke('export:start', settings: ExportSettings): Promise<void>

// 프레임 데이터 전송
ipcRenderer.invoke('export:frame', frameData: FrameData): Promise<void>
```

### 4.2 Main → Renderer

```typescript
// 내보내기 진행상황
ipcMain.on('export:progress', (progress: ExportProgress) => void)

// 에셋 메타데이터 추출 완료
ipcMain.on('asset:metadata', (assetId: string, metadata: AssetMetadata) => void)

// 에러 알림
ipcMain.on('error', (error: Error) => void)
```

## 5. 상태 관리 (Renderer Process)

### 5.1 State Structure

```typescript
interface EditorState {
  project: Project | null;
  currentTime: number;                // 재생 헤드 위치
  selectedClips: string[];            // 선택된 클립 ID들
  selectedTrack: string | null;
  playbackState: 'playing' | 'paused' | 'stopped';
  zoom: number;                       // 타임라인 줌 레벨
  isDirty: boolean;                   // 변경사항 있음
  history: {
    past: Project[];
    future: Project[];
  };
}

// Undo/Redo 시스템
class HistoryManager {
  undo(): void;
  redo(): void;
  pushState(project: Project): void;
  canUndo(): boolean;
  canRedo(): boolean;
}
```

## 6. 성능 최적화 고려사항

### 6.1 캐싱 전략

```typescript
interface CacheStrategy {
  // 프레임 캐시 (메모리)
  frameCache: Map<number, FrameData>;
  maxCachedFrames: number;            // 메모리 제한

  // 썸네일 캐시 (디스크)
  thumbnailCache: Map<string, string>;

  // 효과 적용 결과 캐시
  effectCache: Map<string, ImageData>;
}
```

### 6.2 렌더링 최적화

- **프레임 스킵**: 미리보기 시 낮은 FPS로 렌더링
- **Dirty Region**: 변경된 영역만 재렌더링
- **OffscreenCanvas**: Web Worker에서 렌더링
- **레이어 합성 최적화**: 변경되지 않은 레이어는 캐시 사용

### 6.3 메모리 관리

```typescript
interface MemoryManager {
  // 사용하지 않는 에셋 언로드
  unloadUnusedAssets(): void;

  // 캐시 정리
  clearCache(): void;

  // 메모리 사용량 모니터링
  getMemoryUsage(): MemoryStats;
}
```

## 7. 확장성 고려사항

### 7.1 플러그인 시스템

```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;

  // 커스텀 효과 등록
  registerEffects?(): Effect[];

  // 커스텀 트랜지션 등록
  registerTransitions?(): TransitionEffect[];

  // 커스텀 익스포트 형식
  registerExportFormat?(): ExportFormat;
}
```

### 7.2 커스텀 렌더러

```typescript
interface CustomRenderer {
  type: string;                       // 'webgl', '3d', 'custom'
  render(clip: Clip, timestamp: number): ImageData | WebGLTexture;
}
```

## 8. 파일 구조 제안

```
apps/desktop/
├── main/
│   ├── export/
│   │   ├── ffmpeg-service.ts       # FFmpeg 통합
│   │   ├── export-pipeline.ts      # 내보내기 파이프라인
│   │   └── audio-mixer.ts          # 오디오 믹싱
│   ├── project/
│   │   ├── project-manager.ts      # 프로젝트 저장/로드
│   │   └── asset-manager.ts        # 에셋 관리
│   └── ipc/
│       └── handlers.ts              # IPC 핸들러
│
├── renderer/
│   ├── store/
│   │   ├── project-store.ts        # 프로젝트 상태
│   │   ├── editor-store.ts         # 에디터 상태
│   │   └── history-store.ts        # Undo/Redo
│   ├── renderer/
│   │   ├── canvas-renderer.ts      # Canvas 렌더링
│   │   ├── effect-processor.ts     # 효과 적용
│   │   └── frame-extractor.ts      # 프레임 추출
│   ├── components/
│   │   ├── timeline/               # 타임라인 UI
│   │   ├── preview/                # 프리뷰 캔버스
│   │   └── inspector/              # 속성 패널
│   └── utils/
│       ├── time-utils.ts           # 시간 계산
│       └── transform-utils.ts      # Transform 계산
│
└── shared/
    ├── types/
    │   ├── project.types.ts        # 공유 타입 정의
    │   ├── effect.types.ts
    │   └── export.types.ts
    └── constants/
        └── defaults.ts              # 기본값 상수
```

## 9. 구현 우선순위

### Phase 1: 기본 구조
1. Project 데이터 구조 구현
2. Timeline + Track + Clip 기본 구조
3. Canvas 기본 렌더링
4. IPC 통신 설정

### Phase 2: 렌더링
1. Transform 적용
2. 기본 Effect 구현 (blur, brightness 등)
3. 애니메이션 키프레임
4. 레이어 합성

### Phase 3: 내보내기
1. FFmpeg 통합
2. 프레임 추출 파이프라인
3. 오디오 믹싱
4. 최종 비디오 생성

### Phase 4: 최적화
1. 프레임 캐싱
2. 미리보기 최적화
3. 메모리 관리
4. 진행상황 UI

## 10. 기술 스택 제안

- **상태 관리**: Zustand, Jotai, 또는 Redux Toolkit
- **캔버스 렌더링**: Konva.js, Fabric.js, 또는 순수 Canvas API
- **애니메이션**: GSAP, Anime.js, 또는 Web Animations API
- **FFmpeg**: fluent-ffmpeg, @ffmpeg-installer/ffmpeg
- **UI 컴포넌트**: React + Tailwind CSS
- **타임라인 UI**: 커스텀 구현 또는 react-timeline-editor 참고

---

이 구조는 확장 가능하고 유지보수가 용이하도록 설계되었습니다. 각 단계를 점진적으로 구현하면서 필요에 따라 조정할 수 있습니다.
