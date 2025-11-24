# Studio 리팩토링: RxJS → Zustand

## 개요

비디오 에디터의 상태 관리를 RxJS 기반에서 Zustand 기반으로 마이그레이션했습니다.

## 주요 변경사항

### 1. 3-Store 아키텍처

#### **docStore** (Document Store)

- **목적**: 저주파 상태 관리 (저장되는 정답 상태)
- **관리 항목**: project, tracks, clips, assets, settings, metadata
- **파일**: `src/lib/studio/stores/docStore.ts`
- **특징**: React 컴포넌트가 이 store만 구독하여 렌더링

#### **engineStore** (Engine Store)

- **목적**: 런타임 인스턴스 소유
- **관리 항목**: Timer, Renderer, AudioManager, AssetManager
- **파일**: `src/lib/studio/stores/engineStore.ts`
- **특징**: 프로젝트 로드/교체 시에만 1회 인스턴스화

#### **bindDocToEngine**

- **목적**: docStore의 변경사항을 engineStore에 자동 반영
- **파일**: `src/lib/studio/stores/bindDocToEngine.ts`
- **기능**: settings, tracks, assets 변경 시 해당 engine 인스턴스 업데이트

### 2. StudioProvider 개선

기존 Context 기반 Studio 인스턴스에서 Zustand store 기반으로 전환:

```tsx
// 사용 예시
const tracks = useDocStore((state) => state.tracks);
const addTrack = useDocStore((state) => state.addTrack);
const renderer = useEngineStore((state) => state.renderer);
```

**제공 Hooks**:

- `useDocStore`: docStore 접근
- `useEngineStore`: engineStore 접근
- `useTrack(trackId)`: 개별 track 선택 (리렌더 최소화)
- `useAsset(assetId)`: 개별 asset 선택 (리렌더 최소화)

### 3. 컴포넌트 마이그레이션

모든 컴포넌트에서 RxJS 제거:

| 컴포넌트            | 변경 내용                                                                            |
| ------------------- | ------------------------------------------------------------------------------------ |
| **PreviewRenderer** | `useStudio()` + `useObservable()` → `useDocStore()` + `useEngineStore()`             |
| **TimerActionBar**  | Timer의 BehaviorSubject는 유지하되 engineStore를 통해 접근                           |
| **Tracks**          | `useObservable()` → `useDocStore()`                                                  |
| **StudioDebugger**  | `useObservable()` + `settings$.next()` → `useDocStore()` + `updateProjectSettings()` |

### 4. 제거된 파일

- `src/lib/studio/core/Studio.ts` - 더 이상 필요 없는 중앙 Studio 클래스
- `src/lib/studio/hooks/useObservable.ts` - RxJS Observable을 React state로 변환하는 hook

## 아키텍처 장점

### 1. 성능 최적화

- React 컴포넌트는 필요한 상태만 선택적으로 구독
- id 기반 selector로 불필요한 리렌더 방지
- 고주파 상태(Timer)는 여전히 RxJS로 효율적 처리

### 2. 명확한 책임 분리

- **docStore**: 비즈니스 로직과 데이터
- **engineStore**: 렌더링/오디오/타이머 런타임
- **binding**: doc ↔ engine 동기화

### 3. React 친화적

- Zustand는 React hooks와 자연스럽게 통합
- TypeScript 타입 추론 완벽 지원
- DevTools 지원 (향후 추가 가능)

### 4. 확장 가능

- interactionStore 추가 가능 (향후 인터랙션 처리용)
- Undo/Redo 미들웨어 추가 용이
- 다른 store와 쉽게 조합 가능

## 사용 가이드

### React 컴포넌트에서 doc 읽기

```tsx
function MyComponent() {
  // 전체 tracks 구독
  const tracks = useDocStore((state) => state.tracks);

  // 특정 track만 구독 (리렌더 최소화)
  const track = useTrack('track-id');

  // settings만 구독
  const settings = useDocStore((state) => state.settings);
}
```

### doc 상태 변경

```tsx
function MyComponent() {
  const addTrack = useDocStore((state) => state.addTrack);
  const updateProjectSettings = useDocStore(
    (state) => state.updateProjectSettings
  );

  const handleAddTrack = () => {
    addTrack({
      id: 'new-track',
      name: 'New Track',
      type: 'video',
      // ...
    });
  };

  const handleResize = (width: number, height: number) => {
    updateProjectSettings({ width, height });
    // bindDocToEngine이 자동으로 renderer.resize() 호출
  };
}
```

### Engine 인스턴스 접근

```tsx
function MyComponent() {
  const renderer = useEngineStore((state) => state.renderer);
  const timer = useEngineStore((state) => state.timer);

  useEffect(() => {
    if (renderer && timer) {
      // renderer, timer 사용
    }
  }, [renderer, timer]);
}
```

## 향후 개선 사항

1. **interactionStore 추가** (인터랙션/고주파 상태)
   - dragging, resizing, hover 상태
   - React 리렌더를 유발하지 않고 임시 상태 관리

2. **Undo/Redo 지원**
   - Zustand middleware로 간단히 추가 가능
   - docStore의 모든 action 추적

3. **Persistence**
   - 프로젝트 자동 저장
   - localStorage/IndexedDB 연동

4. **DevTools 통합**
   - Redux DevTools 연동
   - Time-travel debugging

## 마이그레이션 체크리스트

- [x] docStore 구현
- [x] engineStore 구현
- [x] bindDocToEngine 구현
- [x] StudioProvider 마이그레이션
- [x] PreviewRenderer 마이그레이션
- [x] TimerActionBar 마이그레이션
- [x] Tracks 마이그레이션
- [x] StudioDebugger 마이그레이션
- [x] 사용하지 않는 파일 제거 (Studio.ts, useObservable.ts)
- [ ] 인터랙션 처리 (향후)
- [ ] Undo/Redo (향후)
