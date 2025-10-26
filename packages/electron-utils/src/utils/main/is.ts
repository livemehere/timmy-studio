/**
 * @description vite 개발 모드인지 여부
 */
export function isDev(): boolean {
  return process.env.NODE_ENV === 'development';
}
