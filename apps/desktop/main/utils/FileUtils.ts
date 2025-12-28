import fs from 'node:fs';

export class FileUtils {
  static ensureExecutable(path: string) {
    try {
      fs.accessSync(path, fs.constants.X_OK);
    } catch {
      // 실행권한 없으면 부여
      fs.chmodSync(path, 0o755);
    }
  }

  static ensureDirectory(dirPath: string | string[]) {
    const dirs = Array.isArray(dirPath) ? dirPath : [dirPath];
    dirs.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  static getCreatedTime(filePath: string) {
    try {
      const stats = fs.statSync(filePath);

      if (stats.birthtime && stats.birthtime.getTime() > 0) {
        return stats.birthtime.toISOString();
      }

      return stats.mtime.toISOString();
    } catch {
      return undefined;
    }
  }
}
