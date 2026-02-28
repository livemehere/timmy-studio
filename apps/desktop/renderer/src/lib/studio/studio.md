# Studio Model Notes

[English](./studio.md) | [한국어](./studio.ko.md)

The editor has three kinds of state:

- **Doc**: plain JSON that can be saved
- **Engine**: PixiJS, audio, and timer objects created from the Doc
- **Interaction**: temporary UI state such as dragging and selection

The Doc is the source of truth. The Engine compares the previous and next Doc and applies the difference. UI code does not manually add and remove runtime objects.

A drag is the useful example:

1. Pointer movement updates Interaction and previews directly in the Engine.
2. Dropping writes the final value to the Doc.
3. The Doc and Engine synchronize again.

This avoids writing every pointer movement into persistent state while keeping the saved model predictable.

## Folder rule

Domain code lives under `lib/studio/domains`. Each domain keeps its serializable interfaces in `types.ts` and its runtime behavior in the matching class.

Examples:

- `IClip` → `Clip`
- `IVideoClip` → `VideoClip`
- `ITrack` → `Track`

Keep shared domain operations as static methods on those classes. Split a concept across `ClipUtils`, `ClipRenderer`, and `ClipState` only when their lifetimes actually differ.
