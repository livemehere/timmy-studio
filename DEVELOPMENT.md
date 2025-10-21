# Development Guide

This is a turborepo monorepo for Timmy Studio.

## Structure

```
timmy-studio/
├── apps/
│   └── desktop/          # Electron desktop application
├── packages/
│   └── electron-utils/   # Shared Vite plugin and utilities for Electron
└── turbo.json            # Turborepo configuration
```

## Getting Started

### Install dependencies

```bash
pnpm install
```

### Build all packages

```bash
pnpm build
```

This will build all packages in the correct order using Turborepo's dependency graph.

## Development Workflow

### Watch Mode with TUI (Recommended)

For active development, use watch mode to automatically rebuild packages when you make changes:

```bash
pnpm dev
```

This command:
- First builds `@timmy-studio/electron-utils` (initial build)
- Then runs all dev tasks in **parallel** with Turborepo's TUI
- Opens an interactive terminal UI with separate panels for each task

#### Using the TUI (Terminal UI)

When you run `pnpm dev`, Turborepo will show you an interactive terminal with:

- **Separate panels** for each running task:
  - `@timmy-studio/electron-utils:dev` - tsup watch mode
  - `desktop:dev` - Vite dev server + Electron app

- **Keyboard navigation:**
  - `↑/↓` or `k/j` - Navigate between task panels
  - `Enter` - Focus on a specific task to see its full output
  - `Esc` - Return to overview
  - `Ctrl+C` - Stop all tasks

#### Example Development Flow

1. **Start watch mode:**
   ```bash
   pnpm dev
   ```

   You'll see the TUI with two panels:
   ```
   ┌─ @timmy-studio/electron-utils:dev ─────┐
   │ CLI tsup v8.5.0                         │
   │ Watching for changes...                 │
   └─────────────────────────────────────────┘
   ┌─ desktop:dev ──────────────────────────┐
   │ VITE v7.1.7  ready in 432 ms            │
   │ ➜  Local:   http://localhost:5173/     │
   └─────────────────────────────────────────┘
   ```

2. **Make changes to `packages/electron-utils`:**
   - Edit `src/vite-plugin.ts` or `src/utils.ts`
   - tsup will automatically rebuild (watch the top panel)
   - Changes are immediately available in `apps/desktop`

3. **Desktop app automatically picks up changes:**
   - The Vite dev server detects the updated dependency
   - Main/preload processes rebuild
   - Electron app restarts automatically

### Building Individual Packages

```bash
# Build electron-utils only
cd packages/electron-utils
pnpm build

# Build desktop app only
cd apps/desktop
pnpm build
```

## Turborepo Features

### Caching

Turborepo automatically caches build outputs. If you rebuild without changes, it will use cached results:

```bash
pnpm build  # First run builds everything
pnpm build  # Second run uses cache (instant!)
```

### Parallel Execution

Turborepo runs tasks in parallel when possible while respecting dependencies:

- `electron-utils` builds first
- `desktop` builds after `electron-utils` is ready

### Clear Cache

If you need to clear the cache:

```bash
pnpm turbo run build --force
```

## Adding New Packages

1. Create new package in `packages/` or `apps/`
2. Add to `pnpm-workspace.yaml` (if needed - already includes `packages/*` and `apps/*`)
3. Add build script to the package's `package.json`
4. Reference it in other packages using `workspace:*` protocol

Example:

```json
{
  "dependencies": {
    "@timmy-studio/your-package": "workspace:*"
  }
}
```

## Useful Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Watch mode for development
pnpm dev

# Lint all packages
pnpm lint

# Run specific package script
pnpm --filter desktop dev
pnpm --filter @timmy-studio/electron-utils build
```

## Tips

1. **Use TUI mode for better debugging** - The interactive terminal UI makes it easy to see which task is causing issues

2. **Navigate between tasks** - Use arrow keys to switch between `electron-utils` and `desktop` output panels

3. **Focus on specific tasks** - Press Enter on a task to see its full output in detail

4. **Turborepo respects package dependencies** - if `desktop` depends on `electron-utils`, turbo will always build `electron-utils` first

5. **Use `workspace:*` protocol** for internal dependencies - this ensures you're always using the local version

6. **Check `.turbo` directory** for build cache - you can add it to `.gitignore`

## Troubleshooting

### TUI not showing?

If the TUI doesn't appear, make sure you're using a recent version of turbo:

```bash
pnpm add -D turbo@latest
```

### Want to see raw output instead of TUI?

You can disable TUI and see raw output with:

```bash
turbo run dev --parallel --no-ui
```

Or set in `turbo.json`:
```json
{
  "ui": "stream"
}
```
