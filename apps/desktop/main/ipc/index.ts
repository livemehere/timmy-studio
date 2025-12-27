import type { BrowserWindow } from 'electron';
import { basicIpcHandlers } from './basic';
import { ipc } from '@timmy-studio/electron-utils/ipc/main';
import type { MainIpcContext } from './context';
import { createIpcRouter } from './router';
import { createAppRouter } from './routes/app';
import { createDialogRouter } from './routes/dialog';
import { createAssetRouter } from './routes/asset';
import { createExportRouter } from './routes/export';

export function registerIpcHandlers(win: BrowserWindow) {
  basicIpcHandlers();

  const ctx: MainIpcContext = { win };
  createIpcRouter<MainIpcContext>()
    .use(createAppRouter())
    .use(createDialogRouter())
    .use(createAssetRouter())
    .use(createExportRouter())
    .register(ipc, ctx);
}
