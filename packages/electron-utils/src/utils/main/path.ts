import path from 'path';
import { app } from 'electron';

/**
 * 패키징 여부와 성관없이, dist/* 내부의 main.js 경로임. (하나로 번들되기 때문)
 */
function getRootPath(): string {
  return __dirname;
}

export function getPreloadPath(): string {
  return path.join(getRootPath(), 'preload.js');
}

/**
 * 개발환경에서는 RENDERER_URL 환경변수를 사용하고, 프로덕션 환경에서는 빌드된 index.html 파일을 가리키는 경로를 반환합니다.
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
 * 패키징 할 때, extra-resources 폴더의 경로를 반환합니다.
 */
export function toExtraResourcePath(...pahts: string[]): string {
  if (app.isPackaged) {
    /** 패키징 된 경우 asar 경로에서 한번 나가야함 */
    return path.join(app.getAppPath(), '..', 'extra-resources', ...pahts);
  }

  /** vite 개발 모드인 경우, packge.json 의 경로 */
  return path.join(app.getAppPath(), 'extra-resources', ...pahts);
}
