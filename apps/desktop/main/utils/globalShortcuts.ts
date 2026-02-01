import { ipc } from '@timmy-studio/electron-utils/ipc/main';
import { globalShortcut } from 'electron';
export function registerGlobalShortcuts(win: Electron.BrowserWindow) {
  // temp for testing
  globalShortcut.register('Command+F1', () => {
    ipc.send(win.webContents, 'asset:update', {
      id: '8c6d7370',
      name: 'good-2.mp4',
      filePath: '/path/to/sample-media.mp4',
      metadata: {
        size: 11871672,
        durationMs: 35169,
        createdAt: '2025-11-08T08:19:55.130Z',
        width: 1440,
        height: 1920,
        codec: 'h264',
        frameRate: 29.97002997002997,
      },
      type: 'video',
      thumbnailPath:
        '/path/to/sample-media.jpg',
      proxyFilePath:
        '/path/to/sample-media.mp4',
      isProxyReady: true,
    });
  });
}
