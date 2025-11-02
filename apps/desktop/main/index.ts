import { app, BrowserWindow, protocol } from 'electron';
import log from 'electron-log/main';
import {
  isDev,
  setupSessionSecurity,
  debug,
} from '@timmy-studio/electron-utils/utils/main';
import { ipc } from '@timmy-studio/electron-utils/ipc/main';
import { createWindow, setupTray } from './setup-utils';
import fs from 'node:fs';

log.initialize();
log.info('App starting...');
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'source',
    privileges: {
      // standard: true,
      // secure: true,
      bypassCSP: true,
      // supportFetchAPI: true,
      // stream: true,
      // corsEnabled: true,
    },
  },
]);

app.whenReady().then(async () => {
  setupSessionSecurity();
  debug({
    isEnabled: true,
  });
  setupTray();

  protocol.handle('source', (req) => {
    console.log(req);
    console.log('====================');
    const url = new URL(req.url);
    const filePath = decodeURIComponent(url.pathname);
    const range = req.headers.get('range');
    const stat = fs.statSync(filePath);
    console.log('stat', stat);

    if (range) {
      // byte-range 요청 처리 로직 추가 필요
      console.log('한번에 요청 처리', filePath);
      // 전체 파일 응답 처리 로직 추가 필요
      const stream = fs.createReadStream(filePath);
      const webStream = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk) => {
            controller.enqueue(chunk);
            console.log('enqueue chunk', chunk.length);
          });
          stream.on('end', () => {
            controller.close();
            console.log('stream end');
          });
          stream.on('error', (err) => {
            controller.error(err);
            console.error('stream error', err);
          });
        },
        cancel() {
          stream.destroy();
        },
      });

      return new Response(webStream, {
        status: 200,
        headers: {
          'Content-Type': 'video/quicktime',
          'Content-Length': stat.size.toString(),
        },
      });
    } else {
      throw new Error('Range header is required');
    }
  });

  const win = createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('window-all-closed', () => {
    app.quit();
  });

  ipc.handle('getAppInfo', () => {
    return {
      isDev: isDev(),
      isPackaged: app.isPackaged,
      version: app.getVersion(),
    };
  });
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
