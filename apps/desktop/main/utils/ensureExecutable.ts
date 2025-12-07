import fs from 'node:fs';

export function ensureExecutable(p: string) {
  try {
    fs.accessSync(p, fs.constants.X_OK);
  } catch {
    // 실행권한 없으면 부여
    fs.chmodSync(p, 0o755);
  }
}
