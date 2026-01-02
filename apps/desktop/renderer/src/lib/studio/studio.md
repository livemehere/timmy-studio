# studio 라이브러리 개선안

## 기본 골자가 되는 아키텍처

- json 기반의 데이터 모델 = Doc 이라고 칭함
- json -> 인스턴스화 한 객체 = Engine 이라고 칭함
- json 상태(react state) 가 변하면, Engine 과 싱크를 맞추기 위해서, 변화를 감지하고(react) Engine 에 반영하는 과정이 필요
- Engine 은 Doc 을 참조하여, 자신의 상태를 갱신
- 겉으로 본 Doc -> Engine 은 추가/수정/제거 개념이 아니라, 말그대로 전체 sync 개념
- prev doc 과 next doc 의 diff 를 계산하여, 추가/수정/제거 를 Engine 내부에서 판단 및 적용
- 사용자의 UI 인터렉션으로 발생한 선택한 요소, 드래그 상태 등등 의 값은 interaction 이라고 칭함
  - interaction 은 상태의 최종 커밋 단계가 필요할 때 doc 에 반영되고, 실시간으로는 렌더링 최적화를 위해서 Engine 에서 다이렉트로 적용. (예: 드래그 중인 요소의 위치의 델타값을 doc 에 반영하지 않고, Engine 에서만 적용)
  - 이 값은 react state 일수도, ref 로 관리할 수도 있음.

## 예시 흐름

1. project load
   - doc 불러오기
   - engine 인스턴스화
   - doc -> engine sync
2. user action: move element
   - interaction 상태 업데이트 (예: 드래그 중인 요소의 위치 변경)
   - engine 에 interaction 반영 (실시간 렌더링 최적화)
3. user action: drop element
   - interaction 상태 업데이트 (예: 드래그 종료)
   - doc 에 interaction 반영 (최종 커밋)
   - doc -> engine sync (변경된 doc 반영)

이 외에도 doc 상태를 구독하여, Engine 은 싱크를 맞추도록만 함.

## 장점

- json 기반의 doc 모델은 직관적이고, 저장 및 전송이 용이
- engine 은 doc 에 의존하므로, 상태 관리가 단순해짐
- interaction 과 doc 상태를 분리하여, 실시간 렌더링 최적화 가능
- doc 과 engine 간의 싱크를 맞추는 과정이 명확하여, 유지보수가 용이
- 변경 사항 추적 및 디버깅이 쉬움 (doc 의 이전 상태와 현재 상태를 비교 가능)
- 확장성: 새로운 기능 추가 시, doc 모델에만 변경을 가하면 됨

## 현재 상태에서 위 아키텍처로 전환하기 위한 단계

기본적으로 위 구성을 가지고는 있으나, 현재 리팩토링과 구조의 변화가 필요함.

- 각 요소들 Clip, Track, Renderer 등등의 개념이 있고, 이들은 모두 I+ 로시작하는 interface 가정의되어있고, 이 인터페이스가 곧 json 모델 즉 Doc 임.
- 위와 같이 인터페이스가 명확하게 doc 으로 그대로 관리대고, 1:1 매핑이 되기 때문에, Engine 쪽은 말 그대로 이를 인스턴스화 한 I를 제거한 클래스가 존재하면됨. 즉, Doc 모델(interface) 에서 method, 상속 등의 기능을 가지면 아주 단순해질 수 있음.
- 하지만 초기 설계하면서, 이렇게 가져가지않고 지금 처럼 `core/ClipRenderer`, `core/Renderer` 과 같이 분리되어있음.
- 따라서 interface 와 class 간의 1:1 매핑이 되도록 리팩토링이 필요함.

### 명시적인 요구사항(이 외에는 자연스럽게 따라서 작업하도록)

- `lib/studio/*` 하위에 진행할 것.
- `lib/studio/domains/*` 하위에 domain 별로 디렉토리를 만들고, 그 안에 interface 와 class 를 같이 둘 것.
- 예를들어서 현재는 domains/Clip 하위에 types.ts 에 Clip 과 관련된 모든 interface 가 정의되어있는데, 이방식은 유지. 모든 타입,인터페이스는 도메인 하위에 이름 폴더 하위의 types.ts 에 정의.
- 지금 Clss 는 utils.ts 파일에 ClipUtils 라고되어있느데, 이렇게말고 그냥 IClip -> Clip 이 되도록 변경하고, 해당 도메인의 유틸은 그대로 static 을 활용하도록 하고, ClipRenderer 나 ClipState 등과같이 분리된것을 Clip 내부에 적용하도록 할 것.
- 그리고 Clip 과같이 다양한 종류의 클립 videoClip, imageClip 등등 이 존재하는데, 이들은 Clip  을 extends 하도록 할것
- 마찬가지로 Renderer, Track 등등도 동일하게 적용.
