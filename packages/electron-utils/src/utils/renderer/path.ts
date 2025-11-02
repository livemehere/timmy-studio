///<reference types="vite/client" />

/**
 * 패키징 이후에는 BASE_URL가 적용된 경로를 반환하고,
 * 개발 모드에서는 인자로 받은 경로를 그대로 반환합니다.
 */
export function toPublicPath(path: string) {
  if (import.meta.env.PROD) {
    return `${import.meta.env.BASE_URL}${path}`;
  }
  return path;
}

/**
 * @param filePath - os 파일 시스템의 경로
 * @returns - source://open?path= 스킴을 사용하는 경로
 */
export function toSourcePath(filePath: string): string {
  return `source://open?path=${encodeURIComponent(filePath)}`;
}
