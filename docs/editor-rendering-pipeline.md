# Editor Rendering Pipeline

[English](./editor-rendering-pipeline.md) | [한국어](./editor-rendering-pipeline.ko.md)

PixiJS frame-rendering notes.

## The short version

- A track is a `Container`.
- A clip is a logical object owned by a track.
- An Adjustment Layer is a render rule, not another display-tree node.
- `visible` only answers whether a clip exists at the current time.
- The render queue decides where that clip is drawn.

For each frame:

1. Find the active clips.
2. Check which clips are affected by an Adjustment Layer.
3. Send affected clips through `RenderTexture → Sprite → Filter`.
4. Render the rest to the normal world container.
5. Composite the result with the UI layer.

A clip must use one path per frame. Drawing it to the world first and then drawing it again to a RenderTexture is both wrong and wasteful.

```ts
if (isAffectedByAdjustment(clip, time)) {
  adjustmentQueue.push(clip);
} else {
  normalQueue.push(clip);
}
```

## Layers

```text
Stage
├─ world (Container)
│  ├─ backgroundTrack
│  ├─ videoTrack1
│  ├─ videoTrack2
│  └─ textTrack
└─ uiLayer (RenderLayer)
```

`RenderLayer` is useful as a boundary for UI, overlays, and gizmos. It is not the same thing as offscreen rendering. `RenderTexture` is the expensive part.

No frame-level `addChild` or `removeChild` optimization before measurement. Filters, extra RenderTexture passes, and FBO switches are the likely bottlenecks.

Order: correct render queue → few passes → measurement → diffing or caching if needed.
