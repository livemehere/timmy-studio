import type { FfprobeData, FfprobeStream } from 'fluent-ffmpeg';
import type { IAssetMetadata } from '@renderer/lib/studio/types/asset';

/**
 *
 * @param rFrameRate '24000/1001' = ~23.976 fps 로 나눗셈해서 실수 프레임레이트로 변환
 * @returns 실수 프레임레이트, 파싱 실패 시 undefined
 */
function parseFps(rFrameRate?: string): number | undefined {
  if (!rFrameRate) return undefined;
  const [n, d] = rFrameRate.split('/').map(Number);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return undefined;
  const fps = n / d;
  return Number.isFinite(fps) && fps > 0 ? fps : undefined;
}

function isUnreliableFps(stream: FfprobeStream): boolean {
  const avg = parseFps(stream?.avg_frame_rate);
  const r = parseFps(stream?.r_frame_rate);
  console.log('avg', avg);
  console.log('r', r);

  // avg가 0/0 이거나 없음 -> 신뢰 낮음
  if (!avg) {
    // r이 비정상적으로 크면 더 의심
    if (r && r > 240) return true;
    // r도 없으면 완전 불가
    if (!r) return true;
  }

  // avg는 있는데 말도 안 되게 크면
  if (avg && avg > 120) return true;

  return false;
}

/**
 * assetType : video | image | animated-image
 * @param data - ffprobe data
 * @param stream - primary video stream
 */
export function createVideoAssetMetadata(
  data: FfprobeData,
  stream?: FfprobeStream
): IAssetMetadata {
  return {
    // common
    width: stream?.width,
    height: stream?.height,
    codec: stream?.codec_name,
    size: data.format.size ?? 0,
    // video, animated-image
    durationMs: !isNaN(Number(data.format.duration))
      ? Math.round(data.format.duration! * 1000)
      : undefined,
    frameRate: stream
      ? !isUnreliableFps(stream)
        ? parseFps(stream?.r_frame_rate)
        : undefined
      : undefined,
  };
}

/**
 * assetType : audio
 * @param data - ffprobe data
 * @param stream - audio stream
 */
export function createAudioAssetMetadata(
  data: FfprobeData,
  stream?: FfprobeStream
): IAssetMetadata {
  return {
    durationMs: data.format.duration
      ? Math.round(data.format.duration * 1000)
      : undefined,
    codec: stream?.codec_name,
    size: data.format.size ?? 0,
  };
}
