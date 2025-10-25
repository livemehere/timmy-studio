import path from 'path';

export function getPreloadPath(): string {
  const rootPath = process.cwd();
  return path.join(rootPath, 'dist/preload.js');
}

/**
 * @description 개발환경에서는 RENDERER_URL 환경변수를 사용하고, 프로덕션 환경에서는 빌드된 index.html 파일을 가리키는 경로를 반환합니다.
 * @returns {string} 렌더러 프로세스의 진입점 경로 process.env.RENDERER_URL || file://{프로젝트 루트}/dist/renderer/index.html
 */
export function getRendererPath(): string {
  const rendererUrl = process.env['RENDERER_URL'];
  if (rendererUrl) {
    return rendererUrl;
  }

  const rootPath = process.cwd();
  return path.join(rootPath, 'dist/renderer/index.html');
}

/**
 * Get resource path (for production builds)
 */
export function getResourcePath(...paths: string[]): string {
  const rootPath = process.cwd();
  return path.join(rootPath, ...paths);
}
