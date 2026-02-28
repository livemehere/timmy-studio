# 편집기 렌더링 파이프라인

[English](./editor-rendering-pipeline.md) | [한국어](./editor-rendering-pipeline.ko.md)

편집기의 PixiJS 쪽에서 한 프레임을 어떻게 그릴지 정리하면서 남긴 메모다.

## 짧게 정리하면

- 트랙은 `Container`다.
- 클립은 트랙이 소유하는 논리 객체다.
- Adjustment Layer는 Display Tree 노드가 아니라 렌더 규칙이다.
- `visible`은 현재 시간에 클립이 존재하는지만 판단한다.
- 실제로 어디에 그릴지는 렌더 큐가 결정한다.

프레임마다 다음 순서로 처리한다.

1. 현재 활성화된 클립을 찾는다.
2. Adjustment Layer의 영향을 받는 클립을 구분한다.
3. 영향을 받는 클립은 `RenderTexture → Sprite → Filter`로 보낸다.
4. 나머지는 일반 world container에 그린다.
5. 결과와 UI layer를 합성한다.

한 클립은 한 프레임에 하나의 경로만 사용해야 한다. world에 그린 뒤 RenderTexture에 다시 그리는 방식은 결과도 틀리고 비용도 낭비한다.

```ts
if (isAffectedByAdjustment(clip, time)) {
  adjustmentQueue.push(clip);
} else {
  normalQueue.push(clip);
}
```

## 레이어 구성

```text
Stage
├─ world (Container)
│  ├─ backgroundTrack
│  ├─ videoTrack1
│  ├─ videoTrack2
│  └─ textTrack
└─ uiLayer (RenderLayer)
```

`RenderLayer`는 UI, Overlay, Gizmo의 경계를 나눌 때 쓴다. 오프스크린 렌더링과는 다르다. 비용이 큰 쪽은 `RenderTexture`다.

측정 전에는 프레임 단위 `addChild`, `removeChild`를 최적화하지 않는다. 필터, 추가 RenderTexture 패스, FBO 전환이 우선 확인할 병목이다.

순서: 정확한 렌더 큐 → 적은 패스 → 측정 → 필요할 때 diff 또는 캐싱.
