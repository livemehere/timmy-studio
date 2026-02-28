# Studio 상태 관리 리팩터링

[English](./REFACTORING.md) | [한국어](./REFACTORING.ko.md)

편집기 상태 대부분을 RxJS에서 Zustand로 옮겼다. 지금 기준으로는 다음처럼 나뉜다.

- `docStore`: 저장 가능한 프로젝트 데이터 — 트랙, 클립, 에셋, 설정
- `engineStore`: 실행 중인 객체 — renderer, audio renderer, timer
- `interactionStore`: 선택이나 드래그 같은 짧게 유지되는 UI 상태
- `bindDocToEngine`: 저장 모델과 런타임 객체 사이의 동기화

React 컴포넌트는 `docStore`에서 필요한 만큼만 골라 읽는다. Timer처럼 자주 바뀌는 값은 계속 React 밖에서 처리할 수 있다.

```tsx
const track = useTrack(trackId);
const settings = useDocStore((state) => state.settings);
const renderer = useEngineStore((state) => state.renderer);
```

이 작업을 한 가장 큰 이유는 거대한 Studio 객체 하나가 모든 것을 들고 있지 않게 만들기 위해서였다. 프로젝트 JSON은 기준 데이터로 남기고 PixiJS와 오디오 객체는 언제든 다시 만들 수 있는 런타임 상태로 본다.

## 바뀐 것

- 컴포넌트의 `useObservable()`을 store selector로 교체
- 기존 중앙 `Studio` 클래스 제거
- 런타임 생성은 `StudioProvider` 안에 유지
- UI 컴포넌트가 renderer를 직접 갱신하는 대신 binding 계층 추가

## 남은 것

- Undo/Redo 경계 정리
- localStorage 밖의 영속 저장 방식
- transform 중 React를 거치는 임시 업데이트 줄이기

현재 결정을 적어 둔 메모일 뿐, 이름과 구조가 계속 그대로라는 뜻은 아니다.
