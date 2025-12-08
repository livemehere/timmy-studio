import type { FfprobeData } from 'fluent-ffmpeg';
import fs from 'fs';

export function getCreatedAt(data: FfprobeData): string | undefined {
  try {
    // 1. ffprobe 메타데이터에서 먼저 시도
    const creationTime = data.format.tags?.creation_time;
    if (creationTime) {
      return creationTime as string;
    }

    // 2. fallback: 파일 시스템에서 가져오기
    const filePath = data.format.filename;
    if (filePath) {
      const stats = fs.statSync(filePath);
      const birthtime = stats.birthtime;
      // birthtime이 유효하면 ISO 문자열로 반환
      if (birthtime.getTime() > 0) {
        return birthtime.toISOString();
      }
      return stats.mtime.toISOString();
    }
  } catch (error) {
    console.error('Error getting createdAt from file system:', error);
    return undefined;
  }
}
