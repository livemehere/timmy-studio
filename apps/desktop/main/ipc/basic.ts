import { ipc } from '@timmy-studio/electron-utils/ipc/main';
import { isDev } from '@timmy-studio/electron-utils/utils/main';
import { app } from 'electron';

export function basicIpcHandlers() {
  ipc.handle('app:getInfo', () => {
    return {
      isDev: isDev(),
      isPackaged: app.isPackaged,
      version: app.getVersion(),
    };
  });
}
