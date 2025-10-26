import { session } from 'electron';

export function setupSessionSecurity(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src * 'unsafe-inline' data: blob:;",
        ],
      },
    });
  });
}
