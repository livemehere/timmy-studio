# 비디오 에디터 아키텍처 설계

## 1. 전체 시스템 구조

```
┌───────────────────────────────────────────────────────────────────┐
│                        Renderer Process                            │
│  ┌──────────────────┐         ┌────────────────────────────┐     │
│  │   UI Layer       │         │   PixiJS Renderer          │     │
│  │  (React + Key-   │◄────────┤   (WebGL 기반)             │     │
│  │   based Render)  │         │                            │     │
│  └──────────────────┘         └────────────────────────────┘     │
│           │                              │                         │
│           ▼                              ▼                         │
│  ┌───────────────────────────────────────────────────────┐       │
│  │      JSON State (Plain Objects)                        │       │
│  │      - Project, Timeline, Track, Clip, Asset           │       │
│  │      - 직접 JSON으로 저장/불러오기 가능                 │       │
│  └───────────────────────────────────────────────────────┘       │
│           │                              │                         │
│           ▼                              ▼                         │
│  ┌───────────────────────────────────────────────────────┐       │
│  │      Instance Factories (전역 싱글톤)                  │       │
│  │      - AssetFactory, VideoFactory, AudioFactory        │       │
│  │      - ID 기반 인스턴스 풀 관리                         │       │
│  └───────────────────────────────────────────────────────┘       │
└───────────────────────────────────────────────────────────────────┘
                              │ IPC
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                         Main Process                               │
│  ┌──────────────────┐         ┌────────────────────────┐         │
│  │   File Manager   │         │   Export Pipeline      │         │
│  │  (JSON 저장/로드) │         │   (FFmpeg 통합)        │         │
│  └──────────────────┘         └────────────────────────┘         │
└───────────────────────────────────────────────────────────────────┘
```

## 1.1 상태와 인스턴스 분리 전략

### 핵심 원칙
- **상태(State)**: 순수한 JSON 객체로 관리, 직렬화/역직렬화 가능
- **인스턴스(Instance)**: 실제 동작하는 객체 (HTMLVideoElement, HTMLAudioElement, PixiJS Sprite 등)
- **팩토리 패턴**: ID 기반으로 인스턴스 풀 관리, 재사용

### 장점
1. **직렬화**: 프로젝트를 JSON 파일로 간단히 저장/불러오기
2. **성능**: React key를 통한 불필요한 리렌더링 방지
3. **메모리 효율**: 인스턴스 재사용으로 중복 생성 방지
4. **디버깅**: 상태는 단순 객체라 검사 용이

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

## 3. 팩토리 패턴 및 인스턴스 관리

### 3.1 Factory 구조

```typescript
// 기본 팩토리 인터페이스
interface Factory<T> {
  findById(id: string): T | null;
  create(state: any): T;
  destroy(id: string): void;
  clear(): void;
}

// Asset 팩토리 (비디오, 오디오, 이미지 등)
class AssetFactory implements Factory<AssetInstance> {
  private instances: Map<string, AssetInstance> = new Map();

  findById(id: string): AssetInstance | null {
    // 이미 생성된 인스턴스가 있으면 반환
    if (this.instances.has(id)) {
      return this.instances.get(id)!;
    }
    return null;
  }

  getOrCreate(asset: Asset): AssetInstance {
    let instance = this.findById(asset.id);
    if (!instance) {
      instance = this.create(asset);
      this.instances.set(asset.id, instance);
    }
    return instance;
  }

  private create(asset: Asset): AssetInstance {
    switch (asset.type) {
      case 'video':
        return new VideoAssetInstance(asset);
      case 'audio':
        return new AudioAssetInstance(asset);
      case 'image':
        return new ImageAssetInstance(asset);
      default:
        throw new Error(`Unknown asset type: ${asset.type}`);
    }
  }

  destroy(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.dispose();
      this.instances.delete(id);
    }
  }

  clear(): void {
    this.instances.forEach(instance => instance.dispose());
    this.instances.clear();
  }
}

// 비디오 에셋 인스턴스
class VideoAssetInstance {
  private element: HTMLVideoElement;
  private state: Asset;

  constructor(state: Asset) {
    this.state = state;
    this.element = document.createElement('video');
    this.element.src = state.filePath;
    this.element.preload = 'metadata';
  }

  async seekTo(time: number): Promise<void> {
    this.element.currentTime = time / 1000;
    await new Promise(resolve => {
      this.element.onseeked = resolve;
    });
  }

  getElement(): HTMLVideoElement {
    return this.element;
  }

  dispose(): void {
    this.element.pause();
    this.element.src = '';
    this.element.load();
  }
}

// 오디오 에셋 인스턴스
class AudioAssetInstance {
  private element: HTMLAudioElement;
  private audioContext: AudioContext;
  private sourceNode: MediaElementAudioSourceNode;

  constructor(state: Asset) {
    this.element = document.createElement('audio');
    this.element.src = state.filePath;
    this.audioContext = new AudioContext();
    this.sourceNode = this.audioContext.createMediaElementSource(this.element);
  }

  async seekTo(time: number): Promise<void> {
    this.element.currentTime = time / 1000;
  }

  getElement(): HTMLAudioElement {
    return this.element;
  }

  getSourceNode(): MediaElementAudioSourceNode {
    return this.sourceNode;
  }

  dispose(): void {
    this.element.pause();
    this.sourceNode.disconnect();
    this.audioContext.close();
  }
}
```

### 3.2 전역 팩토리 관리자

```typescript
// 싱글톤 패턴으로 전역 팩토리 관리
class FactoryManager {
  private static instance: FactoryManager;

  public assetFactory: AssetFactory;
  public pixiSpriteFactory: PixiSpriteFactory;

  private constructor() {
    this.assetFactory = new AssetFactory();
    this.pixiSpriteFactory = new PixiSpriteFactory();
  }

  static getInstance(): FactoryManager {
    if (!FactoryManager.instance) {
      FactoryManager.instance = new FactoryManager();
    }
    return FactoryManager.instance;
  }

  // 프로젝트 변경 시 모든 인스턴스 정리
  clearAll(): void {
    this.assetFactory.clear();
    this.pixiSpriteFactory.clear();
  }
}

// 사용 예시
const factories = FactoryManager.getInstance();
const videoInstance = factories.assetFactory.getOrCreate(videoAsset);
await videoInstance.seekTo(5000); // 5초 위치로 이동
```

## 4. PixiJS 렌더링 파이프라인

### 4.1 PixiJS 기반 렌더러 구조

```typescript
interface PixiRenderContext {
  app: PIXI.Application;
  stage: PIXI.Container;
  currentFrame: number;
  frameRate: number;
  project: Project;
  renderer: PIXI.Renderer;
}

interface FrameData {
  frameNumber: number;
  timestamp: number;                  // 밀리초
  pixelData: Uint8Array;              // RGBA 픽셀 데이터
  width: number;
  height: number;
}

class PixiRenderer {
  private app: PIXI.Application;
  private stage: PIXI.Container;
  private factories: FactoryManager;
  private trackContainers: Map<string, PIXI.Container>;

  constructor(width: number, height: number) {
    this.app = new PIXI.Application({
      width,
      height,
      backgroundColor: 0x000000,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.stage = this.app.stage;
    this.factories = FactoryManager.getInstance();
    this.trackContainers = new Map();
  }

  // 특정 시간의 프레임 렌더링
  async renderFrame(project: Project, timestamp: number): Promise<FrameData> {
    // 모든 트랙 순회 (zIndex 기준 정렬)
    const sortedTracks = [...project.timeline.tracks].sort((a, b) => a.zIndex - b.zIndex);

    for (const track of sortedTracks) {
      if (!track.enabled) continue;
      await this.renderTrack(track, timestamp);
    }

    // 프레임 추출
    return this.extractFrame(timestamp);
  }

  // 트랙별 클립 렌더링
  private async renderTrack(track: Track, timestamp: number): Promise<void> {
    let container = this.trackContainers.get(track.id);
    if (!container) {
      container = new PIXI.Container();
      container.sortableChildren = true;
      this.stage.addChild(container);
      this.trackContainers.set(track.id, container);
    }

    // 트랙 전체 속성 적용
    container.alpha = track.opacity ?? 1.0;

    // 현재 시간에 활성화된 클립 찾기
    const activeClips = track.clips.filter(
      clip => timestamp >= clip.startTime && timestamp <= clip.endTime
    );

    for (const clip of activeClips) {
      await this.renderClip(clip, timestamp, container);
    }
  }

  // 클립 렌더링
  private async renderClip(clip: Clip, timestamp: number, container: PIXI.Container): Promise<void> {
    // Asset 인스턴스 가져오기
    const asset = this.getAssetById(clip.assetId);
    const assetInstance = this.factories.assetFactory.getOrCreate(asset);

    // 비디오/이미지의 경우 Sprite 생성
    if (asset.type === 'video' || asset.type === 'image') {
      const sprite = await this.createOrUpdateSprite(clip, assetInstance, timestamp);

      // Transform 적용
      this.applyTransform(sprite, clip.transforms, timestamp, clip.animations);

      // Effect 적용 (PixiJS 필터 사용)
      this.applyEffects(sprite, clip.effects);

      container.addChild(sprite);
    }
  }

  // Sprite 생성 또는 업데이트
  private async createOrUpdateSprite(
    clip: Clip,
    assetInstance: AssetInstance,
    timestamp: number
  ): Promise<PIXI.Sprite> {
    let sprite = this.factories.pixiSpriteFactory.findById(clip.id);

    if (!sprite) {
      // 비디오의 경우 특정 시간으로 seek
      if (assetInstance instanceof VideoAssetInstance) {
        const clipLocalTime = timestamp - clip.startTime + clip.trimStart;
        await assetInstance.seekTo(clipLocalTime);

        const texture = PIXI.Texture.from(assetInstance.getElement());
        sprite = new PIXI.Sprite(texture);

        this.factories.pixiSpriteFactory.register(clip.id, sprite);
      }
      // 이미지의 경우
      else if (assetInstance instanceof ImageAssetInstance) {
        const texture = PIXI.Texture.from(assetInstance.getElement());
        sprite = new PIXI.Sprite(texture);

        this.factories.pixiSpriteFactory.register(clip.id, sprite);
      }
    } else {
      // 비디오는 매 프레임마다 업데이트 필요
      if (assetInstance instanceof VideoAssetInstance) {
        const clipLocalTime = timestamp - clip.startTime + clip.trimStart;
        await assetInstance.seekTo(clipLocalTime);
        sprite.texture.update();
      }
    }

    return sprite!;
  }

  // Transform 적용 (애니메이션 키프레임 고려)
  private applyTransform(
    sprite: PIXI.Sprite,
    transform: Transform,
    timestamp: number,
    animations: Animation[]
  ): void {
    // 기본 Transform 적용
    sprite.x = transform.x;
    sprite.y = transform.y;
    sprite.scale.set(transform.scaleX, transform.scaleY);
    sprite.rotation = (transform.rotation * Math.PI) / 180;
    sprite.alpha = transform.opacity;
    sprite.anchor.set(transform.anchorX, transform.anchorY);

    // 애니메이션 키프레임이 있으면 덮어쓰기
    for (const animation of animations) {
      const value = this.interpolateKeyframes(animation, timestamp);
      if (value !== null) {
        switch (animation.property) {
          case 'x':
            sprite.x = value as number;
            break;
          case 'y':
            sprite.y = value as number;
            break;
          case 'scaleX':
            sprite.scale.x = value as number;
            break;
          case 'scaleY':
            sprite.scale.y = value as number;
            break;
          case 'rotation':
            sprite.rotation = ((value as number) * Math.PI) / 180;
            break;
          case 'opacity':
            sprite.alpha = value as number;
            break;
        }
      }
    }
  }

  // 키프레임 보간
  private interpolateKeyframes(animation: Animation, timestamp: number): number | null {
    const keyframes = animation.keyframes;
    if (keyframes.length === 0) return null;

    // 정확히 일치하는 키프레임 찾기
    const exact = keyframes.find(kf => kf.time === timestamp);
    if (exact) return exact.value as number;

    // 사이 구간 찾기
    for (let i = 0; i < keyframes.length - 1; i++) {
      const kf1 = keyframes[i];
      const kf2 = keyframes[i + 1];

      if (timestamp >= kf1.time && timestamp <= kf2.time) {
        const t = (timestamp - kf1.time) / (kf2.time - kf1.time);
        const easedT = this.applyEasing(t, kf1.easing);

        return (kf1.value as number) + ((kf2.value as number) - (kf1.value as number)) * easedT;
      }
    }

    return null;
  }

  // Easing 함수 적용
  private applyEasing(t: number, easing: EasingFunction): number {
    switch (easing) {
      case 'linear':
        return t;
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return t * (2 - t);
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default:
        return t;
    }
  }

  // PixiJS Filter를 사용한 Effect 적용
  private applyEffects(sprite: PIXI.Sprite, effects: Effect[]): void {
    const filters: PIXI.Filter[] = [];

    for (const effect of effects) {
      if (!effect.enabled) continue;

      switch (effect.type) {
        case 'blur':
          const blurFilter = new PIXI.filters.BlurFilter();
          blurFilter.blur = effect.parameters.radius;
          filters.push(blurFilter);
          break;

        case 'brightness':
          const brightnessFilter = new PIXI.filters.ColorMatrixFilter();
          brightnessFilter.brightness(effect.parameters.value, false);
          filters.push(brightnessFilter);
          break;

        case 'contrast':
          const contrastFilter = new PIXI.filters.ColorMatrixFilter();
          contrastFilter.contrast(effect.parameters.value, false);
          filters.push(contrastFilter);
          break;

        case 'saturation':
          const saturationFilter = new PIXI.filters.ColorMatrixFilter();
          saturationFilter.saturate(effect.parameters.value, false);
          filters.push(saturationFilter);
          break;

        // 추가 효과들...
      }
    }

    sprite.filters = filters.length > 0 ? filters : null;
  }

  // 프레임 데이터 추출 (FFmpeg로 보낼 용도)
  private extractFrame(timestamp: number): FrameData {
    const { width, height } = this.app.screen;

    // RenderTexture 생성
    const renderTexture = PIXI.RenderTexture.create({ width, height });
    this.app.renderer.render(this.stage, { renderTexture });

    // 픽셀 데이터 추출
    const pixels = new Uint8Array(width * height * 4);
    this.app.renderer.extract.pixels(renderTexture, pixels);

    // 정리
    renderTexture.destroy(true);

    return {
      frameNumber: Math.floor(timestamp / (1000 / this.app.ticker.FPS)),
      timestamp,
      pixelData: pixels,
      width,
      height,
    };
  }

  // 유틸리티 메서드
  private getAssetById(assetId: string): Asset {
    // 현재 프로젝트에서 Asset 찾기
    // 실제로는 상태 관리 시스템에서 가져옴
    return {} as Asset;
  }

  // 정리
  dispose(): void {
    this.factories.clearAll();
    this.trackContainers.clear();
    this.app.destroy(true, { children: true, texture: true, baseTexture: true });
  }
}
```

### 4.2 PixiJS Sprite Factory

```typescript
class PixiSpriteFactory {
  private sprites: Map<string, PIXI.Sprite> = new Map();

  register(id: string, sprite: PIXI.Sprite): void {
    this.sprites.set(id, sprite);
  }

  findById(id: string): PIXI.Sprite | null {
    return this.sprites.get(id) || null;
  }

  destroy(id: string): void {
    const sprite = this.sprites.get(id);
    if (sprite) {
      sprite.destroy({ children: true, texture: false, baseTexture: false });
      this.sprites.delete(id);
    }
  }

  clear(): void {
    this.sprites.forEach(sprite =>
      sprite.destroy({ children: true, texture: false, baseTexture: false })
    );
    this.sprites.clear();
  }
}
```

## 5. Export Pipeline (Renderer Process with MediaBunny)

```typescript
interface ExportSettings {
  format: 'mp4' | 'webm';
  codec: {
    video: 'h264' | 'h265' | 'vp9' | 'av1';
    audio: 'aac' | 'opus';
  };
  quality: {
    videoBitrate: string;             // '5000k'
    audioBitrate: string;             // '192k'
  };
  outputPath: string;
}

interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  estimatedTimeRemaining: number;     // 초
  stage: 'rendering' | 'encoding' | 'complete';
}

// MediaBunny 기반 내보내기 (Renderer Process)
class MediaBunnyExportPipeline {
  private pixiRenderer: PixiRenderer;
  private output: Output;
  private videoSource: CanvasSource;

  async startExport(
    pixiApp: PIXI.Application,
    project: Project,
    settings: ExportSettings
  ): Promise<Blob> {
    const { width, height, frameRate } = project.settings;
    const totalFrames = Math.floor((project.timeline.duration / 1000) * frameRate);

    // Output 설정
    this.output = new Output({
      format: settings.format === 'mp4' ? new Mp4OutputFormat() : new WebMOutputFormat(),
      target: new BufferTarget(),
    });

    // PixiJS Canvas를 비디오 소스로
    const canvas = pixiApp.view as HTMLCanvasElement;
    this.videoSource = new CanvasSource(canvas, {
      codec: this.mapCodec(settings.codec.video),
      bitrate: parseInt(settings.quality.videoBitrate) * 1000,
      framerate: frameRate,
      width,
      height,
    });

    this.output.addVideoTrack(this.videoSource);

    // 오디오 믹싱 및 추가
    await this.addAudioTrack(project, settings);

    // 프레임별 렌더링
    for (let frame = 0; frame < totalFrames; frame++) {
      const timestamp = (frame / frameRate) * 1000;

      // PixiJS 렌더링
      await this.pixiRenderer.renderFrame(project, timestamp);

      // MediaBunny가 Canvas 캡처
      await this.videoSource.captureFrame();

      // 진행상황 알림
      this.notifyProgress({
        currentFrame: frame,
        totalFrames,
        percentage: (frame / totalFrames) * 100,
        estimatedTimeRemaining: this.calculateETA(frame, totalFrames),
        stage: 'encoding',
      });
    }

    // 비디오 완성
    await this.output.finalize();
    const buffer = await this.output.target.getBuffer();

    this.notifyProgress({
      currentFrame: totalFrames,
      totalFrames,
      percentage: 100,
      estimatedTimeRemaining: 0,
      stage: 'complete',
    });

    return new Blob([buffer], { type: `video/${settings.format}` });
  }

  private async addAudioTrack(project: Project, settings: ExportSettings): Promise<void> {
    const audioTracks = project.timeline.tracks.filter(t => t.type === 'audio');
    if (audioTracks.length === 0) return;

    // Web Audio API로 오디오 믹싱
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();

    // 모든 오디오 트랙 믹싱
    for (const track of audioTracks) {
      await this.mixAudioTrack(track, audioContext, destination);
    }

    // MediaBunny AudioSource 추가
    const audioSource = new MediaStreamSource(destination.stream, {
      codec: settings.codec.audio,
      bitrate: parseInt(settings.quality.audioBitrate) * 1000,
    });

    this.output.addAudioTrack(audioSource);
  }

  private async mixAudioTrack(
    track: Track,
    audioContext: AudioContext,
    destination: MediaStreamAudioDestinationNode
  ): Promise<void> {
    const factories = FactoryManager.getInstance();

    for (const clip of track.clips) {
      const asset = this.getAssetById(clip.assetId);
      const audioInstance = factories.assetFactory.getOrCreate(asset) as AudioAssetInstance;

      const source = audioInstance.getSourceNode();
      const gainNode = audioContext.createGain();
      gainNode.gain.value = track.volume ?? 1.0;

      source.connect(gainNode).connect(destination);
    }
  }

  private mapCodec(codec: string): string {
    const codecMap: Record<string, string> = {
      h264: 'avc1',
      h265: 'hev1',
      vp9: 'vp09',
      av1: 'av01',
    };
    return codecMap[codec] || 'avc1';
  }

  private calculateETA(currentFrame: number, totalFrames: number): number {
    // 간단한 ETA 계산
    return 0; // 실제로는 평균 프레임 시간 기반 계산
  }

  private notifyProgress(progress: ExportProgress): void {
    // IPC로 Main Process에 알림
    window.electron?.ipcRenderer.send('export:progress', progress);
  }

  private getAssetById(assetId: string): Asset {
    // 상태 관리에서 Asset 가져오기
    return {} as Asset;
  }
}
```

### 5.2 FFmpeg Fallback (Main Process - 옵션)

MediaBunny가 지원하지 않는 형식이나 고급 기능이 필요한 경우 FFmpeg 사용

```typescript
class FFmpegFallbackService {
  // 고급 필터나 특수 코덱이 필요한 경우
  async encodeWithFFmpeg(
    inputPath: string,
    outputPath: string,
    settings: ExportSettings
  ): Promise<void> {
    // Main Process에서만 실행
    const ffmpeg = require('fluent-ffmpeg');

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec(settings.codec.video)
        .audioCodec(settings.codec.audio)
        .videoBitrate(settings.quality.videoBitrate)
        .audioBitrate(settings.quality.audioBitrate)
        .output(outputPath)
        .on('progress', (progress) => {
          // 진행상황 업데이트
        })
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
  }
}
```

## 6. IPC 통신 구조

### 6.1 Renderer → Main

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

### 6.2 Main → Renderer

```typescript
// 내보내기 진행상황
ipcMain.on('export:progress', (progress: ExportProgress) => void)

// 에셋 메타데이터 추출 완료
ipcMain.on('asset:metadata', (assetId: string, metadata: AssetMetadata) => void)

// 에러 알림
ipcMain.on('error', (error: Error) => void)
```

## 7. 상태 관리 (Renderer Process)

### 7.1 State Structure

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

### 7.2 React 컴포넌트와 Key 기반 렌더링

```typescript
// Timeline의 Clip 컴포넌트
function TimelineClip({ clip }: { clip: Clip }) {
  // key를 clip.id로 사용하면 clip이 변경되지 않는 한 리렌더링 방지
  return (
    <div
      key={clip.id}
      style={{
        left: `${clip.startTime}px`,
        width: `${clip.endTime - clip.startTime}px`,
      }}
    >
      {clip.id}
    </div>
  );
}

// Track 컴포넌트
function TimelineTrack({ track }: { track: Track }) {
  return (
    <div key={track.id}>
      {track.clips.map(clip => (
        <TimelineClip key={clip.id} clip={clip} />
      ))}
    </div>
  );
}

// Timeline 전체
function Timeline({ timeline }: { timeline: Timeline }) {
  return (
    <div>
      {timeline.tracks.map(track => (
        <TimelineTrack key={track.id} track={track} />
      ))}
    </div>
  );
}
```

## 8. 성능 최적화 고려사항

### 8.1 캐싱 전략

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

### 8.2 렌더링 최적화

- **프레임 스킵**: 미리보기 시 낮은 FPS로 렌더링
- **Dirty Region**: 변경된 영역만 재렌더링
- **OffscreenCanvas**: Web Worker에서 렌더링
- **레이어 합성 최적화**: 변경되지 않은 레이어는 캐시 사용

### 8.3 PixiJS 최적화

- **Texture Atlas**: 여러 이미지를 하나의 텍스처로 합쳐서 draw call 감소
- **Object Pooling**: Sprite 재사용 (이미 Factory에서 구현)
- **Container Culling**: 화면 밖 객체는 렌더링 스킵
- **Batch Rendering**: PixiJS는 자동으로 batch rendering 수행하지만, blend mode나 필터를 과도하게 사용하면 batch가 깨짐

### 8.4 메모리 관리

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

## 9. 확장성 고려사항

### 9.1 플러그인 시스템

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

### 9.2 커스텀 PixiJS 필터

```typescript
// 커스텀 필터 예시: 크로마키
class ChromaKeyFilter extends PIXI.Filter {
  constructor(keyColor: number[], similarity: number, smoothness: number) {
    const vertex = `...`; // vertex shader
    const fragment = `
      precision mediump float;
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform vec3 uKeyColor;
      uniform float uSimilarity;
      uniform float uSmoothness;

      void main(void) {
        vec4 color = texture2D(uSampler, vTextureCoord);
        float diff = distance(color.rgb, uKeyColor);
        float alpha = smoothstep(uSimilarity, uSimilarity + uSmoothness, diff);
        gl_FragColor = vec4(color.rgb, color.a * alpha);
      }
    `;

    super(vertex, fragment, {
      uKeyColor: keyColor,
      uSimilarity: similarity,
      uSmoothness: smoothness,
    });
  }
}

// 사용
const chromaKey = new ChromaKeyFilter([0.0, 1.0, 0.0], 0.4, 0.1); // 초록색 제거
sprite.filters = [chromaKey];
```

## 10. 파일 구조 제안

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
│   │   ├── project-store.ts        # 프로젝트 상태 (JSON)
│   │   ├── editor-store.ts         # 에디터 상태
│   │   └── history-store.ts        # Undo/Redo
│   ├── factories/
│   │   ├── factory-manager.ts      # 전역 팩토리 관리자
│   │   ├── asset-factory.ts        # Asset 인스턴스 팩토리
│   │   ├── video-asset.ts          # Video 인스턴스
│   │   ├── audio-asset.ts          # Audio 인스턴스
│   │   └── pixi-sprite-factory.ts  # PixiJS Sprite 팩토리
│   ├── renderer/
│   │   ├── pixi-renderer.ts        # PixiJS 렌더러
│   │   ├── pixi-filters/           # 커스텀 필터들
│   │   │   ├── chroma-key.ts
│   │   │   └── custom-blur.ts
│   │   ├── effect-processor.ts     # 효과 적용
│   │   └── frame-extractor.ts      # 프레임 추출
│   ├── components/
│   │   ├── timeline/               # 타임라인 UI
│   │   │   ├── Timeline.tsx
│   │   │   ├── Track.tsx
│   │   │   └── Clip.tsx           # key={clip.id}로 최적화
│   │   ├── preview/                # 프리뷰 캔버스
│   │   │   └── PixiPreview.tsx    # PixiJS Application 래퍼
│   │   └── inspector/              # 속성 패널
│   └── utils/
│       ├── time-utils.ts           # 시간 계산
│       ├── transform-utils.ts      # Transform 계산
│       └── keyframe-interpolation.ts  # 키프레임 보간
│
└── shared/
    ├── types/
    │   ├── project.types.ts        # 공유 타입 정의
    │   ├── effect.types.ts
    │   └── export.types.ts
    └── constants/
        └── defaults.ts              # 기본값 상수
```

## 11. 구현 우선순위

### Phase 1: 기본 구조 및 Factory 패턴
1. JSON 기반 데이터 구조 구현 (Project, Timeline, Track, Clip, Asset)
2. FactoryManager + AssetFactory 구현
3. VideoAssetInstance, AudioAssetInstance 구현
4. IPC 통신 설정 (JSON 저장/불러오기)

### Phase 2: PixiJS 렌더링
1. PixiRenderer 기본 구조 구현
2. PixiSpriteFactory 구현
3. Track Container 관리
4. 기본 Transform 적용 (x, y, scale, rotation, opacity)
5. 이미지/비디오 Sprite 렌더링

### Phase 3: 효과 및 애니메이션
1. PixiJS 기본 필터 적용 (blur, brightness, contrast, saturation)
2. 키프레임 애니메이션 시스템
3. Easing 함수 구현
4. 커스텀 필터 (크로마키 등)

### Phase 4: 내보내기
1. MediaBunny 통합 (CanvasSource 설정)
2. PixiJS Canvas → MediaBunny 프레임 캡처
3. 오디오 믹싱 (Web Audio API + MediaStreamSource)
4. 최종 비디오 생성 (MP4/WebM) 및 진행상황 UI
5. (옵션) FFmpeg fallback 구현

### Phase 5: 최적화 및 UI
1. React key 기반 렌더링 최적화
2. 프레임 캐싱
3. Texture Atlas 적용
4. 타임라인 UI 구현
5. 프리뷰 플레이어 구현

## 12. 기술 스택 최종 결정

- **상태 관리**: Zustand 또는 Jotai (순수 JSON 객체 상태 관리)
- **렌더링 엔진**: **PixiJS v8** (WebGL 기반, 고성능)
- **비디오 인코딩/디코딩**: **MediaBunny** (WebCodecs API 래퍼)
  - PixiJS Canvas → 비디오 직접 변환
  - 브라우저 네이티브 하드웨어 가속
  - FFmpeg보다 가볍고 빠름
- **팩토리 패턴**: 커스텀 구현 (FactoryManager, AssetFactory 등)
- **FFmpeg (옵션)**: Main Process에서 fallback 용도 또는 고급 기능
- **UI 컴포넌트**: React + Tailwind CSS
- **타임라인 UI**: 커스텀 구현 (key 기반 최적화)
- **오디오**: Web Audio API + HTMLAudioElement

## 13. 기술 스택 선택 이유

### PixiJS 선택 이유

1. **WebGL 기반 고성능**: Canvas API보다 월등히 빠른 렌더링
2. **풍부한 필터 시스템**: 기본 제공 필터 + 커스텀 shader 지원
3. **Transform 지원**: scale, rotation, skew 등 간편한 적용
4. **Texture 관리**: 효율적인 텍스처 캐싱 및 atlas 지원
5. **Container 계층 구조**: Track/Clip 구조와 잘 맞음
6. **Canvas 출력**: MediaBunny CanvasSource와 완벽한 호환
7. **활발한 커뮤니티**: 문서화 잘 되어있고, 레퍼런스 풍부

### MediaBunny 선택 이유

1. **PixiJS Canvas 직접 변환**: CanvasSource로 프레임 추출 불필요
2. **브라우저 네이티브**: WebCodecs API 기반, 하드웨어 가속
3. **경량 라이브러리**: 의존성 없음, FFmpeg보다 훨씬 가벼움
4. **Renderer Process 실행**: Main Process 부담 없음, IPC 오버헤드 최소화
5. **TypeScript 네이티브**: 타입 안정성
6. **다양한 코덱**: H.264, H.265, VP9, AV1 모두 지원
7. **실시간 인코딩**: 렌더링과 동시에 인코딩 진행 가능

## 14. 예상 워크플로우

### 편집 모드
1. 사용자가 비디오/이미지 드래그 앤 드롭
2. Main Process에서 메타데이터 추출 → Asset 객체 생성 (JSON)
3. AssetFactory에서 HTMLVideoElement 인스턴스 생성
4. PixiRenderer가 Sprite 생성 및 렌더링
5. 타임라인에서 트랜스폼/효과 조정 → JSON 상태만 업데이트
6. React key로 인해 변경된 부분만 리렌더링

### 내보내기 모드
1. 사용자가 Export 버튼 클릭
2. Renderer Process에서 MediaBunny Output 생성
3. PixiJS Canvas를 CanvasSource로 등록
4. Web Audio API로 오디오 트랙 믹싱 → MediaStreamSource
5. 프레임 단위로 PixiJS 렌더링
6. MediaBunny가 Canvas 자동 캡처 및 인코딩 (WebCodecs)
7. 진행상황 IPC로 UI 업데이트
8. 완료 시 Blob 반환 → Main Process에 저장 요청

## 15. 추가 권장 기능 (프로덕션 레벨)

### 15.1 MediaBunny 통합 (WebCodecs API 래퍼)

**라이브러리**: https://mediabunny.dev/
**특징**: WebCodecs API 기반, 경량, TypeScript 지원, 하드웨어 가속

```typescript
import { Input, Output, Conversion, UrlSource, BufferTarget, CanvasSource } from 'mediabunny';
import { Mp4OutputFormat, WebMOutputFormat } from 'mediabunny/formats';

// 비디오 메타데이터 읽기 (Asset 생성 시)
class MediaBunnyAssetLoader {
  async loadVideoMetadata(filePath: string): Promise<AssetMetadata> {
    const input = new Input({
      source: new UrlSource(filePath),
      formats: ALL_FORMATS,
    });

    const videoTrack = await input.getPrimaryVideoTrack();
    const audioTrack = await input.getPrimaryAudioTrack();

    return {
      duration: videoTrack.duration * 1000, // 밀리초 변환
      width: videoTrack.displayWidth,
      height: videoTrack.displayHeight,
      frameRate: videoTrack.frameRate,
      codec: videoTrack.codec,
      size: 0, // 파일 크기는 별도로 가져오기
      createdAt: new Date().toISOString(),
    };
  }
}

// PixiJS Canvas를 비디오로 내보내기
class MediaBunnyExporter {
  async export(
    pixiApp: PIXI.Application,
    project: Project,
    settings: ExportSettings
  ): Promise<Blob> {
    const { width, height, frameRate } = project.settings;
    const totalFrames = Math.floor((project.timeline.duration / 1000) * frameRate);

    // MediaBunny Output 설정
    const output = new Output({
      format: settings.format === 'mp4'
        ? new Mp4OutputFormat()
        : new WebMOutputFormat(),
      target: new BufferTarget(),
    });

    // Canvas를 비디오 소스로 사용
    const canvas = pixiApp.view as HTMLCanvasElement;
    const videoSource = new CanvasSource(canvas, {
      codec: settings.codec.video === 'h264' ? 'avc1' : 'av1',
      bitrate: this.parseBitrate(settings.quality.videoBitrate),
      framerate: frameRate,
      width,
      height,
    });

    output.addVideoTrack(videoSource);

    // 오디오 트랙 추가
    if (project.timeline.tracks.some(t => t.type === 'audio')) {
      const audioContext = new AudioContext();
      const audioDestination = audioContext.createMediaStreamDestination();
      // ... 오디오 믹싱 로직

      const audioSource = new MediaStreamSource(audioDestination.stream, {
        codec: settings.codec.audio,
        bitrate: this.parseBitrate(settings.quality.audioBitrate),
      });
      output.addAudioTrack(audioSource);
    }

    // 프레임별 렌더링 및 인코딩
    for (let frame = 0; frame < totalFrames; frame++) {
      const timestamp = (frame / frameRate) * 1000;

      // PixiJS로 프레임 렌더링
      await this.renderFrame(pixiApp, project, timestamp);

      // Canvas가 자동으로 CanvasSource에 의해 캡처됨
      await videoSource.captureFrame();

      // 진행상황 업데이트
      this.onProgress?.({
        currentFrame: frame,
        totalFrames,
        percentage: (frame / totalFrames) * 100,
        estimatedTimeRemaining: 0,
        stage: 'encoding',
      });
    }

    // 비디오 파일 완성
    await output.finalize();
    const buffer = await output.target.getBuffer();

    return new Blob([buffer], { type: `video/${settings.format}` });
  }

  private async renderFrame(
    app: PIXI.Application,
    project: Project,
    timestamp: number
  ): Promise<void> {
    const renderer = new PixiRenderer(app);
    await renderer.renderFrame(project, timestamp);
  }

  private parseBitrate(bitrate: string): number {
    // '5000k' -> 5000000
    return parseInt(bitrate) * 1000;
  }

  onProgress?: (progress: ExportProgress) => void;
}

// 비디오 파일 변환 (프록시 생성 등)
class MediaBunnyConverter {
  async convertToProxy(inputPath: string, outputPath: string): Promise<void> {
    const input = new Input({
      source: new UrlSource(inputPath),
      formats: ALL_FORMATS,
    });

    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new FileTarget(outputPath),
    });

    // 720p H.264 프록시 설정
    const videoTrack = await input.getPrimaryVideoTrack();
    output.addVideoTrack(videoTrack, {
      codec: 'avc1',
      width: 1280,
      height: 720,
      bitrate: 2_000_000, // 2Mbps
    });

    const conversion = await Conversion.init({ input, output });
    await conversion.execute();
  }
}
```

**장점**:
- FFmpeg 없이 브라우저에서 직접 인코딩/디코딩
- PixiJS Canvas를 직접 비디오 소스로 사용 가능
- 하드웨어 가속 지원 (WebCodecs API 기반)
- 경량 라이브러리 (의존성 없음)
- TypeScript 네이티브 지원

### 15.2 Proxy Media (고해상도 편집 최적화)

```typescript
interface Asset {
  id: string;
  type: 'video' | 'audio' | 'image' | 'text';
  name: string;
  filePath: string;                   // 원본 파일 (4K, 8K 등)
  proxyPath?: string;                 // 프록시 파일 (720p, H.264)
  useProxy: boolean;                  // 미리보기에서 프록시 사용 여부
  metadata: AssetMetadata;
  thumbnail?: string;
}

class ProxyGenerator {
  // Main Process에서 실행
  async generateProxy(originalPath: string, outputPath: string): Promise<void> {
    // FFmpeg로 720p H.264 프록시 생성
    await ffmpeg()
      .input(originalPath)
      .size('1280x720')
      .videoBitrate('2000k')
      .videoCodec('libx264')
      .output(outputPath)
      .run();
  }
}

// 사용: 편집 중에는 프록시, 내보내기 시에는 원본 사용
const assetPath = asset.useProxy && asset.proxyPath ? asset.proxyPath : asset.filePath;
```

### 15.3 오디오 Waveform 시각화

```typescript
interface AudioWaveform {
  assetId: string;
  peaks: Float32Array;              // 파형 데이터
  duration: number;
  sampleRate: number;
}

class WaveformGenerator {
  async generate(audioPath: string): Promise<AudioWaveform> {
    const audioContext = new AudioContext();
    const response = await fetch(audioPath);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const channelData = audioBuffer.getChannelData(0); // 모노 또는 첫 채널
    const samples = 1000; // 타임라인에 표시할 샘플 수
    const blockSize = Math.floor(channelData.length / samples);
    const peaks = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      let max = 0;
      for (let j = 0; j < blockSize; j++) {
        const value = Math.abs(channelData[i * blockSize + j]);
        if (value > max) max = value;
      }
      peaks[i] = max;
    }

    return {
      assetId: 'audio-id',
      peaks,
      duration: audioBuffer.duration * 1000,
      sampleRate: audioBuffer.sampleRate,
    };
  }
}

// React 컴포넌트에서 Canvas로 그리기
function AudioWaveformDisplay({ waveform }: { waveform: AudioWaveform }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / waveform.peaks.length;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#4ADE80';

    for (let i = 0; i < waveform.peaks.length; i++) {
      const barHeight = waveform.peaks[i] * height;
      const x = i * barWidth;
      const y = (height - barHeight) / 2;
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }
  }, [waveform]);

  return <canvas ref={canvasRef} width={1000} height={100} />;
}
```

### 15.4 Transition (전환 효과)

```typescript
interface Transition {
  id: string;
  type: 'crossfade' | 'wipe' | 'slide' | 'zoom' | 'custom';
  duration: number;                   // 밀리초
  easing: EasingFunction;
  parameters?: Record<string, any>;
}

interface Clip {
  // ... 기존 필드
  transitionIn?: Transition;          // 클립 시작 시 전환
  transitionOut?: Transition;         // 클립 종료 시 전환
}

class TransitionRenderer {
  // Crossfade 예시
  renderCrossfade(
    sprite1: PIXI.Sprite,
    sprite2: PIXI.Sprite,
    progress: number // 0-1
  ): void {
    sprite1.alpha = 1 - progress;
    sprite2.alpha = progress;
  }

  // Wipe 예시 (커스텀 shader)
  createWipeFilter(progress: number, direction: 'left' | 'right' | 'up' | 'down'): PIXI.Filter {
    const fragment = `
      precision mediump float;
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform float uProgress;
      uniform vec2 uDirection;

      void main(void) {
        vec4 color = texture2D(uSampler, vTextureCoord);
        float edge = dot(vTextureCoord, uDirection);
        float alpha = step(uProgress, edge);
        gl_FragColor = vec4(color.rgb, color.a * alpha);
      }
    `;

    return new PIXI.Filter(undefined, fragment, {
      uProgress: progress,
      uDirection: direction === 'left' ? [1, 0] : direction === 'right' ? [-1, 0] : [0, 1],
    });
  }
}
```

### 15.5 Text/Subtitle 시스템

```typescript
interface TextClip extends Clip {
  type: 'text';
  content: string;
  style: TextStyle;
}

interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fill: string | string[];           // 색상 또는 그라디언트
  stroke?: string;
  strokeThickness?: number;
  align: 'left' | 'center' | 'right';
  wordWrap?: boolean;
  wordWrapWidth?: number;
  dropShadow?: boolean;
  dropShadowColor?: string;
  dropShadowBlur?: number;
  dropShadowDistance?: number;
}

class TextRenderer {
  renderText(clip: TextClip, container: PIXI.Container): void {
    const text = new PIXI.Text(clip.content, {
      fontFamily: clip.style.fontFamily,
      fontSize: clip.style.fontSize,
      fill: clip.style.fill,
      stroke: clip.style.stroke,
      strokeThickness: clip.style.strokeThickness,
      align: clip.style.align,
      wordWrap: clip.style.wordWrap,
      wordWrapWidth: clip.style.wordWrapWidth,
      dropShadow: clip.style.dropShadow,
      dropShadowColor: clip.style.dropShadowColor,
      dropShadowBlur: clip.style.dropShadowBlur,
      dropShadowDistance: clip.style.dropShadowDistance,
    });

    container.addChild(text);
  }
}

// SRT 파일 파싱
interface Subtitle {
  index: number;
  startTime: number;                  // 밀리초
  endTime: number;
  text: string;
}

class SRTParser {
  parse(srtContent: string): Subtitle[] {
    const blocks = srtContent.trim().split('\n\n');
    return blocks.map(block => {
      const lines = block.split('\n');
      const index = parseInt(lines[0]);
      const [start, end] = lines[1].split(' --> ').map(this.parseTimecode);
      const text = lines.slice(2).join('\n');
      return { index, startTime: start, endTime: end, text };
    });
  }

  private parseTimecode(timecode: string): number {
    const [time, ms] = timecode.split(',');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours * 3600000 + minutes * 60000 + seconds * 1000 + parseInt(ms);
  }
}
```

### 15.6 Magnetic Timeline & Snapping

```typescript
interface SnapSettings {
  enabled: boolean;
  snapToClips: boolean;               // 다른 클립에 스냅
  snapToPlayhead: boolean;            // 재생 헤드에 스냅
  snapToMarkers: boolean;             // 마커에 스냅
  snapThreshold: number;              // 픽셀 단위
}

class TimelineSnapping {
  findSnapPoints(tracks: Track[], excludeClipId?: string): number[] {
    const snapPoints: number[] = [0]; // 시작점

    for (const track of tracks) {
      for (const clip of track.clips) {
        if (clip.id === excludeClipId) continue;
        snapPoints.push(clip.startTime, clip.endTime);
      }
    }

    return snapPoints.sort((a, b) => a - b);
  }

  snapTime(time: number, snapPoints: number[], threshold: number): number {
    for (const point of snapPoints) {
      if (Math.abs(time - point) < threshold) {
        return point;
      }
    }
    return time;
  }
}
```

### 15.7 Color Grading & LUT

```typescript
interface ColorGrading extends Effect {
  type: 'colorGrading';
  parameters: {
    temperature: number;              // -100 ~ 100
    tint: number;
    exposure: number;
    contrast: number;
    highlights: number;
    shadows: number;
    whites: number;
    blacks: number;
    vibrance: number;
    saturation: number;
    lutPath?: string;                 // LUT 파일 경로 (.cube)
  };
}

class LUTFilter extends PIXI.Filter {
  constructor(lutTexture: PIXI.Texture) {
    const fragment = `
      precision mediump float;
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform sampler2D uLUT;
      uniform float uLutSize;

      void main(void) {
        vec4 color = texture2D(uSampler, vTextureCoord);

        // LUT 적용
        float blueColor = color.b * (uLutSize - 1.0);
        vec2 quad1;
        quad1.y = floor(floor(blueColor) / uLutSize);
        quad1.x = floor(blueColor) - (quad1.y * uLutSize);

        vec2 quad2;
        quad2.y = floor(ceil(blueColor) / uLutSize);
        quad2.x = ceil(blueColor) - (quad2.y * uLutSize);

        vec2 texPos1;
        texPos1.x = (quad1.x + 0.5 + color.r * (uLutSize - 1.0)) / (uLutSize * uLutSize);
        texPos1.y = (quad1.y + 0.5 + color.g * (uLutSize - 1.0)) / uLutSize;

        vec2 texPos2;
        texPos2.x = (quad2.x + 0.5 + color.r * (uLutSize - 1.0)) / (uLutSize * uLutSize);
        texPos2.y = (quad2.y + 0.5 + color.g * (uLutSize - 1.0)) / uLutSize;

        vec4 newColor1 = texture2D(uLUT, texPos1);
        vec4 newColor2 = texture2D(uLUT, texPos2);

        vec4 newColor = mix(newColor1, newColor2, fract(blueColor));
        gl_FragColor = vec4(newColor.rgb, color.a);
      }
    `;

    super(undefined, fragment, {
      uLUT: lutTexture,
      uLutSize: 64, // 일반적인 LUT 크기
    });
  }
}
```

### 15.8 Multi-threaded Rendering (Web Workers + SharedArrayBuffer)

```typescript
// main-thread.ts
class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: RenderTask[] = [];

  constructor(workerCount: number = navigator.hardwareConcurrency || 4) {
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(new URL('./render-worker.ts', import.meta.url));
      worker.onmessage = this.handleWorkerMessage.bind(this);
      this.workers.push(worker);
    }
  }

  async renderFrameRange(startFrame: number, endFrame: number): Promise<FrameData[]> {
    const frames: FrameData[] = [];
    const promises: Promise<FrameData>[] = [];

    for (let frame = startFrame; frame <= endFrame; frame++) {
      promises.push(this.renderFrame(frame));
    }

    return Promise.all(promises);
  }

  private async renderFrame(frameNumber: number): Promise<FrameData> {
    return new Promise((resolve) => {
      const worker = this.getAvailableWorker();
      worker.postMessage({ type: 'render', frameNumber });
      // ... 응답 대기
    });
  }
}

// render-worker.ts
self.onmessage = async (e) => {
  if (e.data.type === 'render') {
    const frameNumber = e.data.frameNumber;
    // OffscreenCanvas를 사용한 렌더링
    const canvas = new OffscreenCanvas(1920, 1080);
    // ... 렌더링 로직

    const imageData = canvas.getContext('2d')!.getImageData(0, 0, 1920, 1080);
    self.postMessage({ type: 'frame', frameNumber, imageData }, [imageData.data.buffer]);
  }
};
```

### 15.9 Auto-save & Crash Recovery

```typescript
class AutoSaveManager {
  private saveInterval: number = 60000; // 1분마다
  private intervalId?: number;

  startAutoSave(project: Project): void {
    this.intervalId = window.setInterval(() => {
      this.saveSnapshot(project);
    }, this.saveInterval);
  }

  private async saveSnapshot(project: Project): Promise<void> {
    const snapshot = {
      ...project,
      metadata: {
        ...project.metadata,
        autoSavedAt: new Date().toISOString(),
      },
    };

    // IndexedDB에 저장
    await this.saveToIndexedDB(`autosave-${project.id}`, snapshot);
  }

  async recoverLastSession(): Promise<Project | null> {
    const keys = await this.getAutoSaveKeys();
    if (keys.length === 0) return null;

    // 가장 최근 자동 저장 찾기
    const latestKey = keys.sort().reverse()[0];
    return this.loadFromIndexedDB(latestKey);
  }

  private async saveToIndexedDB(key: string, data: any): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction('autosave', 'readwrite');
    await tx.objectStore('autosave').put(data, key);
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('VideoEditorDB', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('autosave')) {
          db.createObjectStore('autosave');
        }
      };
    });
  }
}
```

### 15.10 Performance Monitor

```typescript
interface PerformanceMetrics {
  fps: number;
  frameTime: number;                  // 밀리초
  renderTime: number;
  memoryUsage: number;                // MB
  gpuMemory?: number;
  dropFrames: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    dropFrames: 0,
  };

  private frameCount = 0;
  private lastTime = performance.now();

  update(): PerformanceMetrics {
    const now = performance.now();
    const delta = now - this.lastTime;

    this.frameCount++;

    // FPS 계산 (1초마다)
    if (delta >= 1000) {
      this.metrics.fps = Math.round((this.frameCount * 1000) / delta);
      this.frameCount = 0;
      this.lastTime = now;
    }

    // 메모리 사용량
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024);
    }

    return this.metrics;
  }

  measureRenderTime(fn: () => void): number {
    const start = performance.now();
    fn();
    const end = performance.now();
    this.metrics.renderTime = end - start;
    return this.metrics.renderTime;
  }
}

// React 컴포넌트
function PerformanceOverlay({ monitor }: { monitor: PerformanceMonitor }) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(monitor.metrics);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(monitor.update());
    }, 100);

    return () => clearInterval(interval);
  }, [monitor]);

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-2 rounded text-xs font-mono">
      <div>FPS: {metrics.fps}</div>
      <div>Render: {metrics.renderTime.toFixed(2)}ms</div>
      <div>Memory: {metrics.memoryUsage}MB</div>
      <div>Drops: {metrics.dropFrames}</div>
    </div>
  );
}
```

### 15.11 Thumbnail Generator

```typescript
class ThumbnailGenerator {
  async generateVideoThumbnail(videoPath: string, timestamp: number = 0): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = videoPath;
      video.currentTime = timestamp / 1000;

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 90;

        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        resolve(thumbnail);
      };

      video.onerror = reject;
    });
  }

  // 여러 썸네일 생성 (타임라인 미리보기용)
  async generateThumbnailStrip(
    videoPath: string,
    count: number = 10
  ): Promise<string[]> {
    const video = document.createElement('video');
    video.src = videoPath;

    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });

    const duration = video.duration;
    const interval = duration / count;
    const thumbnails: string[] = [];

    for (let i = 0; i < count; i++) {
      const timestamp = i * interval * 1000;
      const thumbnail = await this.generateVideoThumbnail(videoPath, timestamp);
      thumbnails.push(thumbnail);
    }

    return thumbnails;
  }
}
```

## 16. 참고할 오픈소스 프로젝트

### 16.1 Remotion (https://github.com/remotion-dev/remotion)
- **특징**: React 컴포넌트로 비디오 정의, 프로그래매틱 접근
- **배울 점**:
  - React 기반 선언적 비디오 생성
  - 시간 기반 props (`useCurrentFrame()`, `useVideoConfig()`)
  - Composition 기반 구조

### 16.2 Editly (https://github.com/mifi/editly)
- **특징**: JSON 기반 비디오 편집, FFmpeg 사용
- **배울 점**:
  - 간단한 JSON 설정으로 복잡한 편집 가능
  - FFmpeg 파이프라인 최적화
  - 다양한 전환 효과 구현

### 16.3 Olive Video Editor (https://github.com/olive-editor/olive)
- **특징**: Qt 기반, 프로페셔널 기능
- **배울 점**:
  - 노드 기반 효과 시스템
  - 멀티캠 편집
  - 색보정 파이프라인

### 16.4 Clipchamp (Microsoft)
- **특징**: 웹 기반 비디오 에디터
- **배울 점**:
  - 브라우저에서 고성능 렌더링
  - 템플릿 시스템
  - 드래그 앤 드롭 UX

### 16.5 FFCreator (https://github.com/tnfe/FFCreator)
- **특징**: Node.js + FFmpeg, 고성능
- **배울 점**:
  - FFmpeg 최적화 기법
  - 프레임 캐싱 전략
  - 병렬 렌더링

## 17. 추가 고려사항

### 17.1 협업 기능 (선택사항)
- **Y.js** 또는 **Automerge**를 사용한 CRDT 기반 실시간 협업
- WebSocket으로 여러 사용자 동시 편집
- Conflict resolution 전략

### 17.2 클라우드 저장소 통합
- Google Drive, Dropbox API 통합
- 클라우드 렌더링 (AWS MediaConvert, Google Transcoder API)

### 17.3 AI 기능
- **자막 자동 생성**: Whisper API 통합
- **스마트 컷**: 침묵 구간 자동 제거
- **자동 색보정**: AI 기반 LUT 추천
- **Object Tracking**: YOLO 같은 모델로 객체 추적

### 17.4 접근성
- 키보드 단축키 지원
- 스크린 리더 호환
- 고대비 모드

## 18. React 통합 및 구현 가이드

### 18.1 React + PixiJS 통합 패턴

#### 핵심 원칙
- **React**: UI 상태 관리, 타임라인, 속성 패널 등
- **PixiJS**: Canvas 렌더링만 담당 (React 외부에서 실행)
- **분리된 관심사**: React가 PixiJS를 직접 조작하지 않고, 상태 변경만 알림

#### PixiJS Application 생명주기 관리

**마운트 시점**:
- `useRef`로 Canvas DOM 참조 저장
- `useEffect`에서 PixiJS Application 초기화 (마운트 시 한 번만)
- 전역 FactoryManager 인스턴스 생성

**언마운트 시점**:
- `useEffect` cleanup에서 PixiJS Application destroy
- FactoryManager.clearAll() 호출하여 모든 인스턴스 정리

**주의사항**:
- PixiJS Application은 컴포넌트 재렌더링과 무관하게 유지
- `useMemo`나 `useRef`로 PixiJS 인스턴스 보호
- React Strict Mode에서 이중 마운트 대비

### 18.2 상태 관리 전략

#### Zustand 사용 시 구조

**스토어 분리**:
- `useProjectStore`: Project, Timeline, Track, Clip, Asset (순수 JSON)
- `useEditorStore`: currentTime, selectedClips, playbackState 등
- `useHistoryStore`: Undo/Redo 스택
- `useExportStore`: 내보내기 진행상황

**불변성 유지**:
- Immer 통합으로 간편한 상태 업데이트
- 항상 새 객체 반환으로 React 리렌더링 트리거

**선택적 구독**:
- 컴포넌트가 필요한 상태만 구독
- `shallow` 비교로 불필요한 리렌더링 방지

#### 상태 변경 플로우

1. **사용자 액션** (예: 클립 이동)
2. **Zustand action 호출** → JSON 상태 업데이트
3. **React 컴포넌트 리렌더링** (key 기반으로 최소화)
4. **PixiJS 동기화**: 변경된 상태를 감지하여 PixiJS 업데이트

### 18.3 PixiJS와 React 동기화

#### 동기화 시점

**상태 → PixiJS 방향**:
- `useEffect`에서 특정 상태 구독
- 상태 변경 시 PixiJS 객체 업데이트
- 예: `currentTime` 변경 → PixiRenderer.renderFrame() 호출

**PixiJS → 상태 방향**:
- PixiJS 이벤트 리스너에서 Zustand action 호출
- 예: Sprite 드래그 종료 → Transform 상태 업데이트

#### 동기화 최적화

**Debounce/Throttle**:
- `currentTime` 변경 시 매 프레임 렌더링은 throttle 적용
- 타임라인 스크롤 시 debounce로 렌더링 횟수 제한

**Dirty Checking**:
- 상태가 실제로 변경되었을 때만 PixiJS 업데이트
- 깊은 비교 대신 ID 기반 변경 감지

### 18.4 컴포넌트 설계

#### 컴포넌트 계층 구조

```
App
├── EditorLayout
│   ├── PreviewPanel
│   │   └── PixiPreview (PixiJS Application)
│   ├── TimelinePanel
│   │   ├── TimelineRuler
│   │   ├── TimelineTracks
│   │   │   └── TimelineTrack (key={track.id})
│   │   │       └── TimelineClip (key={clip.id})
│   │   └── TimelinePlayhead
│   ├── InspectorPanel
│   │   ├── TransformPanel
│   │   ├── EffectPanel
│   │   └── AnimationPanel
│   └── AssetPanel
│       └── AssetItem (key={asset.id})
```

#### 컴포넌트별 책임

**PixiPreview**:
- PixiJS Application 생명주기 관리
- Canvas DOM 제공
- currentTime 변경 감지하여 렌더링
- 재생/일시정지 제어

**TimelinePanel**:
- 타임라인 UI 렌더링
- 클립 드래그 앤 드롭
- 스냅 기능
- 스크롤/줌 제어

**InspectorPanel**:
- 선택된 클립의 속성 표시/수정
- Transform, Effect, Animation 편집
- 변경사항을 Zustand로 전달

**AssetPanel**:
- Asset 목록 표시
- 파일 드래그 앤 드롭으로 Asset 추가
- 썸네일 표시

### 18.5 성능 최적화 기법

#### React 리렌더링 최적화

**Key 기반 리스트**:
- Track, Clip, Asset 모두 `key={item.id}` 사용
- ID가 변하지 않으면 컴포넌트 재사용

**React.memo 적용**:
- Timeline, Inspector 등 무거운 컴포넌트에 적용
- Props shallow 비교로 불필요한 리렌더링 방지
- 필요시 custom comparison 함수

**useMemo/useCallback**:
- 계산 비용이 큰 값은 useMemo
- 자식에게 전달하는 함수는 useCallback
- 의존성 배열 정확히 관리

**가상 스크롤**:
- 타임라인에 수백 개 클립이 있을 경우
- react-window 또는 react-virtuoso 사용
- 보이는 영역만 렌더링

#### PixiJS 렌더링 최적화

**조건부 렌더링**:
- 재생 중일 때만 requestAnimationFrame
- 일시정지 시에는 상태 변경 시에만 렌더링

**Sprite 재사용**:
- FactoryManager로 이미 생성된 Sprite 재사용
- 매번 새로 생성하지 않음

**Container Culling**:
- 타임라인에서 보이지 않는 클립은 렌더링 스킵
- 현재 시간 범위만 체크

**Texture Atlas**:
- 여러 이미지를 하나의 텍스처로 합치기
- draw call 감소

#### 메모리 관리

**Cleanup 철저히**:
- 컴포넌트 언마운트 시 PixiJS 객체 destroy
- EventListener 제거
- Interval/Timeout 정리

**Asset 언로드**:
- 타임라인에서 제거된 Asset은 일정 시간 후 언로드
- 메모리 임계값 초과 시 자동 정리

**IndexedDB 활용**:
- 큰 파일은 메모리에 로드하지 않고 필요할 때만
- 썸네일, 프록시 등은 IndexedDB 저장

### 18.6 타입 안정성

#### TypeScript 활용

**엄격한 타입**:
- Project, Timeline 등 모든 데이터 구조 인터페이스 정의
- `strict: true` 설정
- `any` 사용 최소화

**제네릭 팩토리**:
- Factory 인터페이스에 제네릭 적용
- 타입 안정성 보장

**Zustand 타입**:
- Store별 타입 정의
- Action의 매개변수 타입 명확히

### 18.7 에러 처리

#### 에러 경계 설정

**React Error Boundary**:
- PixiPreview 컴포넌트를 Error Boundary로 감싸기
- 렌더링 에러 발생 시 폴백 UI 표시

**MediaBunny 에러**:
- WebCodecs 지원하지 않는 브라우저 감지
- Fallback 메시지 표시 또는 FFmpeg 사용

**Asset 로딩 에러**:
- 파일 로드 실패 시 재시도 로직
- 사용자에게 명확한 에러 메시지

### 18.8 단계별 구현 순서

#### Phase 1: 기본 구조 (1-2주)

1. **프로젝트 셋업**:
   - Vite + React + TypeScript
   - Zustand 설치 및 기본 스토어 생성
   - 폴더 구조 생성 (섹션 10 참고)

2. **타입 정의**:
   - `shared/types/project.types.ts`에 모든 인터페이스 작성
   - Project, Timeline, Track, Clip, Asset 등

3. **기본 UI 레이아웃**:
   - EditorLayout 컴포넌트
   - PreviewPanel, TimelinePanel 빈 컴포넌트
   - Tailwind CSS 설정

4. **상태 관리 기본**:
   - useProjectStore 생성
   - 더미 프로젝트 데이터 로드
   - JSON 저장/불러오기 기능

#### Phase 2: PixiJS 통합 (1-2주)

1. **PixiPreview 컴포넌트**:
   - useRef로 Canvas 참조
   - useEffect에서 PixiJS Application 초기화
   - currentTime 변경 감지

2. **Factory 패턴**:
   - FactoryManager 싱글톤 구현
   - AssetFactory 구현
   - VideoAssetInstance, ImageAssetInstance 구현

3. **PixiRenderer 구현**:
   - renderFrame 메서드
   - Track Container 관리
   - 기본 Sprite 렌더링

4. **동기화 테스트**:
   - currentTime 슬라이더로 프레임 이동 테스트
   - 상태 변경 시 PixiJS 업데이트 확인

#### Phase 3: 타임라인 UI (2-3주)

1. **TimelineRuler**:
   - 시간 눈금 표시
   - 마우스 클릭으로 currentTime 이동

2. **TimelineTrack/Clip**:
   - Track 컴포넌트 렌더링
   - Clip 컴포넌트 (key={clip.id})
   - 드래그 앤 드롭 구현
   - 크기 조절 (trim)

3. **Snapping**:
   - TimelineSnapping 유틸 구현
   - 드래그 시 자동 정렬

4. **재생 제어**:
   - 재생/일시정지 버튼
   - requestAnimationFrame으로 currentTime 업데이트
   - 미리보기 FPS 제한 (throttle)

#### Phase 4: Asset 관리 (1주)

1. **AssetPanel**:
   - Asset 목록 표시
   - 파일 드래그 앤 드롭

2. **MediaBunny 메타데이터**:
   - MediaBunnyAssetLoader 구현
   - 비디오/이미지 메타데이터 추출

3. **썸네일 생성**:
   - ThumbnailGenerator 구현
   - Canvas로 썸네일 추출

4. **프록시 생성 (옵션)**:
   - 4K 영상 → 720p 프록시 변환

#### Phase 5: Transform & Effects (2-3주)

1. **Transform 적용**:
   - PixiRenderer에서 Transform 적용
   - InspectorPanel에서 슬라이더로 수정
   - 실시간 미리보기

2. **PixiJS 필터**:
   - 기본 필터 (Blur, ColorMatrix 등)
   - 필터 체인 적용

3. **커스텀 필터**:
   - ChromaKeyFilter 구현
   - WebGL Shader 작성

4. **애니메이션 키프레임**:
   - Keyframe 편집 UI
   - 보간 로직 구현
   - Easing 함수

#### Phase 6: 오디오 (1-2주)

1. **AudioAssetInstance**:
   - Web Audio API 통합
   - AudioContext, SourceNode 관리

2. **오디오 Waveform**:
   - WaveformGenerator 구현
   - Canvas로 파형 표시

3. **오디오 믹싱**:
   - 여러 트랙 믹싱 로직
   - Volume, Pan 조절

#### Phase 7: 내보내기 (2주)

1. **MediaBunny 통합**:
   - MediaBunnyExportPipeline 구현
   - CanvasSource 설정

2. **프레임별 렌더링**:
   - 전체 타임라인 순회
   - 프레임 캡처 및 인코딩

3. **진행상황 UI**:
   - Progress Bar
   - 취소 기능

4. **Export 설정**:
   - 코덱, 비트레이트 선택 UI

#### Phase 8: 최적화 & 마무리 (2-3주)

1. **성능 프로파일링**:
   - React DevTools Profiler
   - Chrome Performance 탭

2. **최적화 적용**:
   - React.memo 적용
   - 가상 스크롤 (필요 시)
   - PixiJS 최적화

3. **Auto-save**:
   - AutoSaveManager 구현
   - IndexedDB 저장

4. **Undo/Redo**:
   - HistoryManager 구현
   - 키보드 단축키 (Cmd+Z)

5. **에러 처리**:
   - Error Boundary
   - 사용자 친화적 에러 메시지

### 18.9 개발 팁

#### 디버깅

**React DevTools**:
- Component 렌더링 횟수 확인
- Props 변경 추적

**PixiJS Inspector**:
- Chrome Extension: PixiJS DevTools
- Stage 계층 구조 확인

**Performance Monitor**:
- 섹션 15.10의 PerformanceMonitor 구현
- FPS, 메모리 실시간 모니터링

#### 테스트

**단위 테스트**:
- 순수 함수 (시간 계산, 보간 등) 테스트
- Vitest 사용

**통합 테스트**:
- Zustand store 액션 테스트
- Factory 생성/삭제 테스트

**E2E 테스트 (옵션)**:
- Playwright로 주요 워크플로우 테스트
- 프로젝트 생성 → 클립 추가 → 내보내기

#### 코드 품질

**ESLint/Prettier**:
- 일관된 코드 스타일
- React Hooks 규칙 강제

**Git 커밋 전략**:
- 기능 단위로 작은 커밋
- Conventional Commits 형식

**문서화**:
- JSDoc으로 함수 설명
- README에 개발 가이드

### 18.10 주의사항 및 함정

#### React + PixiJS 통합 시

**❌ 피해야 할 것**:
- React 컴포넌트에서 PixiJS 객체 직접 생성/조작 (렌더링 때마다 재생성됨)
- PixiJS 이벤트 핸들러에서 setState 남발 (무한 루프)
- Sprite를 React state에 저장 (직렬화 불가능)

**✅ 해야 할 것**:
- PixiJS는 useRef로 관리, 상태는 Zustand에만
- PixiJS → React 동기화는 debounce/throttle 적용
- 팩토리 패턴으로 인스턴스 재사용

#### 성능 최적화 시

**❌ 조기 최적화 금지**:
- 먼저 동작하게 만들고, 프로파일링 후 최적화
- 모든 컴포넌트에 React.memo 적용하지 말 것

**✅ 측정 기반 최적화**:
- React DevTools Profiler로 측정
- 병목 지점만 최적화

#### 메모리 관리

**❌ 메모리 누수**:
- PixiJS 객체 destroy 누락
- EventListener 제거 누락
- Interval/Timeout cleanup 누락

**✅ Cleanup 철저히**:
- useEffect cleanup 함수 작성
- 컴포넌트 언마운트 시 모든 리소스 정리

### 18.11 학습 리소스

**PixiJS**:
- 공식 문서: https://pixijs.com/
- Examples: https://pixijs.com/examples
- 튜토리얼: PixiJS Playground

**MediaBunny**:
- 공식 문서: https://mediabunny.dev/
- GitHub: 예제 코드 참고

**Zustand**:
- 공식 문서: https://zustand-demo.pmnd.rs/
- Immer 통합 가이드

**React + Canvas 통합**:
- react-konva (참고용, 패턴 학습)
- react-three-fiber (참고용, 3D지만 패턴 유사)

---

이 구조는 확장 가능하고 유지보수가 용이하도록 설계되었습니다. 각 단계를 점진적으로 구현하면서 필요에 따라 조정할 수 있습니다.
