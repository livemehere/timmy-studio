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
import { parseRange } from './utils/byte-range';
import mime from 'mime-types';
import { Readable } from 'node:stream';

log.initialize();
log.info('App starting...');
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'source',
    privileges: {
      standard: false,
      secure: true,
      bypassCSP: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
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
    console.log('====================');
    const url = new URL(req.url);
    const filePath = decodeURIComponent(url.pathname);
    const range = req.headers.get('range');
    const parsedRange = range ? parseRange(range) : null;
    const stat = fs.statSync(filePath);
    const totalSize = stat.size;
    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    console.log('filePath', filePath);
    console.log(req.headers);
    console.log('totalSize', totalSize);

    try {
      let start = parsedRange?.start || 0;
      let end = parsedRange?.end || totalSize - 1;
      const contentLength = end - start + 1;

      const stream = fs.createReadStream(filePath, {
        start,
        end,
        // highWaterMark: 1024 * 1024,
      });

      stream.on('data', (chunk) => {
        console.log('stream data chunk', chunk.length);
      });

      stream.on('end', () => {
        console.log('stream end');
      });

      /** 간단 버전, 자체 백프레셔 처리 */
      const webStream = Readable.toWeb(
        stream
      ) as unknown as ReadableStream<Uint8Array>;

      /**  직접 처리, 백프레셔 문제되면 추가 처리 필요 */
      // const webStream = new ReadableStream({
      //   start(controller) {
      //     stream.pause();
      //     stream.on('data', (chunk) => {
      //       controller.enqueue(chunk);
      //       console.log('progress', controller.desiredSize);
      //       if (controller.desiredSize && controller.desiredSize <= 0) {
      //         stream.pause();
      //         console.log('stream pause');
      //       }
      //     });
      //     stream.once('end', () => {
      //       controller.close();
      //     });
      //     stream.once('error', (err) => {
      //       controller.error(err);
      //       console.error('stream error', err);
      //     });
      //   },
      //   pull() {
      //     console.log('stream resume from pull');
      //     if (stream.isPaused()) {
      //       stream.resume();
      //     }
      //   },
      //   cancel() {
      //     stream.destroy();
      //   },
      // });

      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Content-Length': contentLength.toString(),
        'Accept-Ranges': 'bytes',
      };

      if (range) {
        headers['Content-Range'] = `bytes ${start}-${end}/${totalSize}`;
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
      console.error('Read file error', error);
      return new Response('Read file error', { status: 500 });
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
