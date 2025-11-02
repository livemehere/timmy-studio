import { session } from 'electron';

/**
 * 반드시 'ready' 이벤트 이후에 호출되어야 합니다.
 */
export function setupSessionSecurity(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src * 'unsafe-inline' 'unsafe-eval' data: blob: source:;" +
            "script-src * 'unsafe-inline' 'unsafe-eval' data: blob:;" +
            "img-src * data: blob: source:;" +
            "media-src * data: blob: source:;",
        ],
      },
    });
  });
}
