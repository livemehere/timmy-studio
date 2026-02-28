# Studio 모델 메모

[English](./studio.md) | [한국어](./studio.ko.md)

편집기 상태는 세 종류로 나눈다.

- **Doc**: 저장할 수 있는 일반 JSON
- **Engine**: Doc에서 만들어지는 PixiJS, 오디오, Timer 객체
- **Interaction**: 드래그와 선택처럼 잠깐만 필요한 UI 상태

기준 데이터는 Doc이다. Engine은 이전 Doc과 다음 Doc을 비교해 차이를 반영한다. UI 코드가 런타임 객체를 직접 하나씩 추가하고 제거하지 않게 하는 것이 목표다.

드래그 흐름으로 보면 이해하기 쉽다.

1. 포인터가 움직이는 동안 Interaction을 갱신하고 Engine에 바로 미리보기로 반영한다.
2. 포인터를 놓으면 최종 값을 Doc에 기록한다.
3. Doc과 Engine을 다시 동기화한다.

이렇게 하면 모든 포인터 이동을 저장 상태에 넣지 않으면서도 저장되는 모델은 예측 가능하게 유지할 수 있다.

## 폴더 규칙

도메인 코드는 `lib/studio/domains` 아래에 둔다. 저장 가능한 인터페이스는 각 도메인의 `types.ts`에 두고 런타임 동작은 대응하는 클래스가 맡는다.

예시:

- `IClip` → `Clip`
- `IVideoClip` → `VideoClip`
- `ITrack` → `Track`

공용 도메인 동작은 해당 클래스의 static 메서드로 둔다. 생명주기가 실제로 다를 때만 하나의 개념을 `ClipUtils`, `ClipRenderer`, `ClipState`로 나눈다.
