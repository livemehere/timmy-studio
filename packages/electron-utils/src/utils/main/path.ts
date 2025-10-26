import path from 'path';
import { app } from 'electron';

/**
 * @description 패키징 여부와 성관없이, dist/* 내부의 main.js 경로임. (하나로 번들되기 때문)
 */
function getRootPath(): string {
  return __dirname;
}

export function getPreloadPath(): string {
  return path.join(getRootPath(), 'preload.js');
}

/**
 * @description 개발환경에서는 RENDERER_URL 환경변수를 사용하고, 프로덕션 환경에서는 빌드된 index.html 파일을 가리키는 경로를 반환합니다.
 * @returns {string} 렌더러 프로세스의 진입점 경로 process.env.RENDERER_URL || file://{프로젝트 루트}/erer/index.html
 */
export function getRendererPath(): string {
  const rendererUrl = process.env['RENDERER_URL'];
  if (rendererUrl) {
    return rendererUrl;
  }

  return path.join(getRootPath(), 'renderer/index.html');
}

/**
 * Get resource path (for production builds)
 */
export function getResourcePath(...paths: string[]): string {
  return path.join(getRootPath(), ...paths);
}

export function setAppDataPath(appName: string) {
  const userDataPath = app.getPath('appData');
  const appDataPath = path.join(userDataPath, '..', appName);
  app.setPath('userData', appDataPath);
}
