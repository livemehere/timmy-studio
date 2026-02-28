import { ipc } from '@timmy-studio/electron-utils/ipc/main';
import { app, globalShortcut } from 'electron';
import path from 'node:path';

export function registerGlobalShortcuts(win: Electron.BrowserWindow) {
  // Sample shortcut for quickly checking the asset update flow during development.
  globalShortcut.register('Command+F1', () => {
    const sampleVideoPath = path.join(app.getPath('videos'), 'sample.mp4');
    const cachePath = path.join(app.getPath('userData'), 'contents-cache');

    ipc.send(win.webContents, 'asset:update', {
      id: 'sample-video',
      name: 'sample.mp4',
      filePath: sampleVideoPath,
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
      thumbnailPath: path.join(cachePath, 'thumbnails', 'thumbnail.sample.jpg'),
      proxyFilePath: path.join(cachePath, 'proxies', 'proxy.sample.mp4'),
      isProxyReady: true,
    });
  });
}
