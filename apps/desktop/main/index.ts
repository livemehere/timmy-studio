import { app, BrowserWindow, protocol, session } from 'electron';
import log from 'electron-log/main';
import { debug } from '@timmy-studio/electron-utils/utils/main';
import { createWindow, setupTray } from './setup-utils';
import {
  checkExtensionServiceWorker,
  loadSingleExtension,
  PIXIJS_DEVTOOLS,
} from '@main/utils/installExtension';
import { userConfigStore } from '@main/store';

import {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import { FileUtils } from '@main/utils/FileUtils';
import { registerIpcHandlers } from './ipc';
import { MediaUtils } from '@main/utils/MediaUtils';
import {
  handleSourceScheme,
  SOURCE_SCHEME,
} from '@timmy-studio/electron-utils/utils/main';

log.initialize();
log.info('App starting...');

console.log();

// app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
// app.commandLine.appendSwitch('enable-accelerated-video-decode');
// app.commandLine.appendSwitch('ignore-gpu-blocklist'); // Optional, but can help in some cases

protocol.registerSchemesAsPrivileged([SOURCE_SCHEME]);

app.whenReady().then(async () => {
  try {
    handleSourceScheme();
    await installExtension([REACT_DEVELOPER_TOOLS]);
    await loadSingleExtension(PIXIJS_DEVTOOLS);
    await checkExtensionServiceWorker();
    log.info(`Added Extension: react`);
  } catch (err) {
    log.info(`Error while installing extension: ${err}`);
  }

  session.defaultSession.setDisplayMediaRequestHandler(
    async (_request, _callback) => {
      // callback 호출하면 고정
      // const resources = await desktopCapturer.getSources({
      //   types: ['screen'],
      // });
      // callback({
      //   video: resources[0],
      //   audio: 'loopback',
      // });
    },
    // 아래 옵션 넣어주면 디스코드처럼 화면 선택 창이 뜸
    { useSystemPicker: true }
  );

  FileUtils.ensureDirectory([
    MediaUtils.THUMBNAILS_DIR,
    MediaUtils.PROXIES_DIR,
    MediaUtils.FILMSTRIPS_DIR,
  ]);

  debug({
    isEnabled: true,
  });
  setupTray();

  console.log('useConfigStore value', userConfigStore.store);
  const savedBounds = userConfigStore.get('bounds');

  const win = await createWindow({
    bounds: savedBounds,
  });

  win.on('moved', () => {
    const bounds = win.getBounds();
    userConfigStore.set('bounds', bounds);
  });

  win.on('resized', () => {
    const bounds = win.getBounds();
    userConfigStore.set('bounds', bounds);
  });

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow({
        bounds: savedBounds,
      });
    }
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
  registerIpcHandlers(win);
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
