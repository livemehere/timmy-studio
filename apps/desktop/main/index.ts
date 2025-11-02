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
import mime from 'mime-types';
import { Readable } from 'node:stream';

log.initialize();
log.info('App starting...');
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'source',
    privileges: {
      bypassCSP: true,
      secure: true,
      stream: true,
      standard: true,
      supportFetchAPI: true,
    },
  },
]);

app.whenReady().then(async () => {
  setupSessionSecurity();
  debug({
    isEnabled: true,
  });
  setupTray();

  protocol.handle('source', async (req) => {
    try {
      const url = new URL(req.url);
      const filePath = decodeURIComponent(url.searchParams.get('path') || '');

      // 파일 존재 확인
      if (!fs.existsSync(filePath)) {
        return new Response('File not found', { status: 404 });
      }

      console.log('req', req);
      console.log('filePath', filePath);

      const stat = fs.statSync(filePath);
      const total = stat.size;

      const range = req.headers.get('range');
      let start = 0;
      let end = total - 1;

      if (range) {
        const m = /bytes=(\d+)-(\d*)/.exec(range);
        if (m) {
          start = parseInt(m[1], 10);
          if (m[2]) {
            end = Math.min(parseInt(m[2], 10), total - 1);
          }
        }
      }

      const chunkSize = end - start + 1;
      const contentType = mime.lookup(filePath) || 'application/octet-stream';

      // NodeJS Stream을 Web ReadableStream으로 변환
      const nodeStream = fs.createReadStream(filePath, {
        start,
        end,
        highWaterMark: 1024 * 1024,
      });

      nodeStream.on('data', (chunk) => {
        console.log('stream data chunk', chunk.length);
      });

      nodeStream.on('end', () => {
        console.log('stream end');
      });

      nodeStream.on('error', (err) => {
        console.error('stream error', err);
      });

      const webStream = Readable.toWeb(
        nodeStream
      ) as ReadableStream<Uint8Array>;

      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Cache-Control': 'public, max-age=3600',
      };

      if (range) {
        headers['Content-Range'] = `bytes ${start}-${end}/${total}`;
        return new Response(webStream, {
          status: 206,
          headers,
        });
      }

      return new Response(webStream, {
        status: 200,
        headers,
      });
    } catch (error) {
      console.error('Media service error:', error);
      return new Response('Internal server error', { status: 500 });
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
