# Development Notes

[English](./DEVELOPMENT.md) | [한국어](./DEVELOPMENT.ko.md)

This is a pnpm/Turborepo workspace with two main parts:

```text
apps/desktop/            Electron app
packages/electron-utils/ Shared build and IPC helpers
```

## Usual commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm --filter ./apps/desktop test
```

`pnpm dev` builds `electron-utils` first, then runs its watcher and the desktop app together. Turborepo opens a TUI; use the arrow keys to switch tasks and `Ctrl+C` to stop everything.

To run a single workspace task:

```bash
pnpm --filter @timmy-studio/electron-utils build
pnpm --filter ./apps/desktop dev
```

If the build cache gets in the way:

```bash
pnpm turbo run build --force
```

Internal packages use the `workspace:*` protocol. Build output and Turborepo cache files are not source and should stay untracked.
