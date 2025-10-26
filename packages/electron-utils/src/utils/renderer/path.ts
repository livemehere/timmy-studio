///<reference types="vite/client" />

/**
 * 패키징 이후에는 BASE_URL가 적용된 경로를 반환하고,
 * 개발 모드에서는 인자로 받은 경로를 그대로 반환합니다.
 */
export function getPublicPath(path: string) {
  if (import.meta.env.PROD) {
    return `${import.meta.env.BASE_URL}${path}`;
  }
  return path;
}
