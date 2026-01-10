import { type CustomScheme, protocol } from 'electron';
import fs from 'node:fs';
import mime from 'mime-types';
import { Readable } from 'node:stream';

/**
 * app 의 'ready' 이벤트 전에 `protocol.registerSchemesAsPrivileged([SOURCE_SCHEME]);` 로 등록 필요
 */
export const SOURCE_SCHEME: CustomScheme = {
  scheme: 'source',
  privileges: {
    bypassCSP: true,
    secure: true,
    stream: true,
    standard: true,
    supportFetchAPI: true,
  },
};

/**
 * app 의 'ready' 이벤트 이후에 호출
 * @example
 * // Query parameter 방식
 * source://any/?path=/path/to/file.mp4
 *
 * // Path 방식 (basePath와 함께 사용 가능)
 * source://path/path/to/file.mp4
 */
export function handleSourceScheme() {
  protocol.handle('source', async (req) => {
    try {
      // Handle OPTIONS request for CORS
      if (req.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          },
        });
      }

      const url = new URL(req.url);
      let filePath = '';

      // 1. Query parameter 방식: source://?path=/path/to/file
      const pathParam = url.searchParams.get('path');
      if (pathParam) {
        filePath = decodeURIComponent(pathParam);
      }
      // 2. Path 방식: source://open/path/to/file
      else if (url.hostname === 'path' && url.pathname) {
        // pathname은 /path/to/file 형태로 시작하므로 그대로 사용
        filePath = decodeURIComponent(url.pathname);
      }

      // 파일 경로가 없거나 파일이 존재하지 않으면 404
      if (!filePath) {
        return new Response('File path not provided', { status: 400 });
      }

      if (!fs.existsSync(filePath)) {
        return new Response('File not found', { status: 404 });
      }

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
      const stream = fs.createReadStream(filePath, {
        start,
        end,
        highWaterMark: 1024 * 1024,
      });

      /** 로깅 원할 시 */
      // stream.on('data', (chunk) => {
      //   console.log('stream data chunk', chunk.length);
      // });

      // stream.on('end', () => {
      //   console.log('stream end');
      // });

      // stream.on('error', (err) => {
      //   console.error('stream error', err);
      // });

      /** 내장 구현 */
      const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;

      /** 직접 구현 */
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
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
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
}
