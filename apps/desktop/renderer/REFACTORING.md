# Studio State Refactor

[English](./REFACTORING.md) | [한국어](./REFACTORING.ko.md)

Most editor state moved from RxJS to Zustand.

- `docStore`: project data that can be saved — tracks, clips, assets, and settings
- `engineStore`: live objects — renderer, audio renderer, and timer
- `interactionStore`: short-lived UI state such as selection and dragging
- `bindDocToEngine`: keeps the saved model and runtime objects in sync

React components read the smallest useful slice of `docStore`. The timer keeps its high-frequency updates outside React.

```tsx
const track = useTrack(trackId);
const settings = useDocStore((state) => state.settings);
const renderer = useEngineStore((state) => state.renderer);
```

Reason: stop one large Studio object from owning everything. Project JSON remains the source of truth; PixiJS and audio objects remain disposable runtime state.

## What changed

- Replaced component-level `useObservable()` calls with store selectors
- Removed the old central `Studio` class
- Kept runtime creation inside `StudioProvider`
- Added a binding layer instead of updating the renderer from UI components

## Still open

- Cleaner Undo/Redo boundaries
- Persistence outside localStorage
- Fewer temporary updates flowing through React during transforms

Names and boundaries may change again while the editor changes.
