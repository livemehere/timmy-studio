import type { FfprobeData, FfprobeStream } from 'fluent-ffmpeg';

/**
 * ffprobe에서 "video stream"으로 잡히지만
 * 실제로는 커버아트/썸네일(정지 이미지)인 경우가 있음.
 * disposition.attached_pic === 1 이면 그 스트림은 "attached picture"라서 제외해야 정확해짐.
 */
export function getPrimaryVideoStream(
  data: FfprobeData
): FfprobeStream | undefined {
  return data.streams.find(
    (s) =>
      s.codec_type === 'video' &&
      // attached_pic(커버아트/썸네일) 제외
      s.disposition?.attached_pic !== 1
  );
}

export function getAudioStream(data: FfprobeData): FfprobeStream | undefined {
  return data.streams.find((s) => s.codec_type === 'audio');
}
