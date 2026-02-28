# @timmy-studio/electron-utils

[English](./README.md) | [한국어](./README.ko.md)

이 워크스페이스 안에서 같이 쓰는 작은 Electron 유틸리티 모음이다. 데스크톱 앱 한 곳에 빌드와 IPC 설정이 계속 쌓이는 게 싫어서 따로 뺐다.

```json
{
  "devDependencies": {
    "@timmy-studio/electron-utils": "workspace:*"
  }
}
```

## Export

- `.`: 경로, 창 관련 함수, 환경 확인
- `./vite`: main, preload, renderer용 Vite 빌드 구성
- `./ipc/main`: 타입이 연결된 IPC handler
- `./ipc/preload`: renderer API 노출
- `./ipc/renderer`: renderer 쪽 TypeScript 타입

## Vite

```ts
import { defineConfig } from 'vite';
import { electron } from '@timmy-studio/electron-utils/vite';

export default defineConfig({
  plugins: [
    electron({
      main: {},
      preload: {},
      renderer: {},
    }),
  ],
});
```

플러그인이 Electron의 세 target을 빌드한다. 개발 중에는 파일을 감시하고 main이나 preload 번들이 바뀌면 Electron을 다시 실행한다.

## 경로와 창

```ts
import {
  getAppDataPath,
  getPreloadPath,
  getResourcePath,
  loadWindowUrl,
  setupDevTools,
} from '@timmy-studio/electron-utils';

const win = new BrowserWindow({
  webPreferences: { preload: getPreloadPath() },
});

setupDevTools(win);
await loadWindowUrl(win);

const configPath = getAppDataPath('config.json');
const iconPath = getResourcePath('icons', 'icon.png');
```

## IPC

```ts
// main
import { ipc } from '@timmy-studio/electron-utils/ipc/main';

ipc.handle('add', (_event, a, b) => a + b);
```

```ts
// preload
import { exposeIpcApi } from '@timmy-studio/electron-utils/ipc/preload';

exposeIpcApi();
```

```ts
// renderer
/// <reference types="@timmy-studio/electron-utils/ipc/renderer" />

const result = await window.app.invoke('add', 1, 2);
```

오래 걸리는 작업에는 `handleCancellable`, renderer 요청을 묶어 보낼 때는 `batchInvoke`도 쓸 수 있다. 채널 타입은 앱의 IPC 선언에서 가져온다.

## 패키지 작업

```bash
pnpm build
pnpm dev
```

`tsup`이 CJS와 ESM 빌드 및 타입 선언을 만든다. 루트의 `pnpm dev`를 실행하면 데스크톱 앱과 이 패키지를 함께 감시한다.
