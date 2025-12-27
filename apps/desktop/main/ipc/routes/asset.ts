import log from 'electron-log/main';
import { createAssetData } from '@main/utils/ffprobe';
import { ffprobePromise } from '@main/utils/ffmpeg';
import { createProxy } from '@main/utils/ffmpeg/createProxy';
import { createFilmstrip } from '@main/utils/ffmpeg/createFilmstrip';
import { createIpcRouter } from '../router';
import type { MainIpcContext } from '../context';

export function createAssetRouter() {
  return createIpcRouter<MainIpcContext>().handle(
    'asset:create',
    async ({ win }, _event, filePath) => {
      const meta = await ffprobePromise(filePath);
      const asset = await createAssetData(meta, { createProxy: false }); // proxy 파일 생성 없이 순수, 메타데이터만 생성

      if (asset.type === 'video' && asset.isProxyReady === false) {
        // 프록시파일이 이미 존재하는 경우 true, 아닌경우, 비동기로 proxy 비디오 생성
        createProxy(filePath)
          .then((proxyFilePath) => {
            // 생성이 끝나면, 렌더러 프로세스에 업데이트된 에셋 정보를 보냄
            win.webContents.send('asset:update', {
              ...asset,
              proxyFilePath,
              isProxyReady: true,
            });
          })
          .catch((err) => {
            log.error('[updateAsset] Failed to create proxy:', err);
          });
      }

      if (asset.type === 'video' && asset.metadata.durationMs != null) {
        createFilmstrip(filePath, { durationMs: asset.metadata.durationMs })
          .then((filmstrip) => {
            win.webContents.send('asset:update', {
              ...asset,
              filmstrip,
              isFilmstripReady: true,
            });
          })
          .catch((err) => {
            log.error('[updateAsset] Failed to create filmstrip:', err);
          });
      }

      return asset;
    }
  );
}
