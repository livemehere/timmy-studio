# @timmy-studio/electron-utils

Vite plugin and utility functions for Electron development in Timmy Studio monorepo.

## Installation

This package is part of the Timmy Studio workspace and should be installed via workspace protocol:

```json
{
  "devDependencies": {
    "@timmy-studio/electron-utils": "workspace:*"
  }
}
```

## Usage

### Vite Plugin

In your `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import { electron } from "@timmy-studio/electron-utils";

export default defineConfig({
  plugins: [
    electron({
      main: {},
      preload: {},
      renderer: {
        // Your renderer-specific Vite config
      },
    }),
  ],
});
```

### Utility Functions

```typescript
import {
  // Path utilities
  getPreloadPath,
  getRendererUrl,
  getResourcePath,
  getAppDataPath,
  getLogsPath,
  getTempPath,

  // Window utilities
  loadWindowUrl,
  setupDevTools,

  // Environment checks
  isDev,
  isPackaged,
} from "@timmy-studio/electron-utils";

// In your main process
const mainWindow = new BrowserWindow({
  webPreferences: {
    preload: getPreloadPath(),
  },
});

// Setup DevTools with keyboard shortcuts (dev mode only)
setupDevTools(mainWindow); // F5: reload, F12: toggle DevTools

// Load renderer with automatic dev/prod URL handling
await loadWindowUrl(mainWindow);

// Get various paths
const configPath = getAppDataPath("config.json");
const logPath = getLogsPath("app.log");
const tempFile = getTempPath("cache", "data.json");
const iconPath = getResourcePath("assets", "icon.png");

// Environment checks
if (isDev()) {
  console.log("Running in development mode");
}

if (isPackaged()) {
  console.log("Running as packaged app");
}
```

## Features

### Vite Plugin
- **Automatic build orchestration** for main, preload, and renderer processes
- **Hot Reload** support in development mode
- **Process Management**: Automatic Electron restart during development
- **Watch Mode**: Automatic rebuild on file changes

### Utility Functions

#### Path Utilities
- `getPreloadPath()` - Get compiled preload script path
- `getRendererUrl()` - Get renderer URL (dev server or file://)
- `getResourcePath()` - Get resource files path
- `getAppDataPath()` - Get platform-specific user data directory
- `getLogsPath()` - Get logs directory
- `getTempPath()` - Get temp directory

#### Window Utilities
- `loadWindowUrl()` - Load renderer with automatic env detection
- `setupDevTools()` - Setup DevTools with F5/F12 shortcuts (dev only)

#### Environment Checks
- `isDev()` - Check if running in development mode
- `isPackaged()` - Check if running as packaged app

### TypeScript
- Full TypeScript support with type definitions
- Dual format output (CJS + ESM)

## Development

### Build the package

```bash
pnpm build
```

This uses **tsup** to bundle the package into both CommonJS and ESM formats with TypeScript declarations.

### Watch mode for development

When developing the package alongside your Electron app:

```bash
# From the root of the monorepo
pnpm dev
```

This will:
1. Build `@timmy-studio/electron-utils` first
2. Start `tsup --watch` for the package (auto-rebuild on changes)
3. Start the desktop app dev server in parallel

Any changes to `@timmy-studio/electron-utils` will automatically rebuild and be available in dependent packages.

### Build Output

```
dist/
├── index.js          # CommonJS bundle
├── index.mjs         # ESM bundle
├── index.d.ts        # TypeScript declarations (CJS)
└── index.d.mts       # TypeScript declarations (ESM)
```

### Structure

```
src/
├── index.ts          # Barrel exports
├── vite-plugin.ts    # Vite plugin for Electron
└── utils.ts          # Utility functions
```

### Technology

- **tsup**: Fast TypeScript bundler powered by esbuild
- **Dual format**: Outputs both CJS and ESM for maximum compatibility
- **Type-safe**: Generates TypeScript declarations automatically
