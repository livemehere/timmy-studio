import type { FfprobeData } from 'fluent-ffmpeg';
import type { AssetType } from '@renderer/lib/studio/types/asset';
import { MediaUtils } from '@main/utils/MediaUtils';

/**
 * "이미지로 보이는 비디오 스트림"을 구분하기 위한 힌트들
 */
const IMAGE_CODEC_NAMES = [
  'png',
  'mjpeg',
  'jpeg',
  'jpg',
  'webp',
  'bmp',
  'tiff',
  'gif',
];

const ANIMATED_FORMAT_HINTS = ['gif', 'apng', 'webp']; // animated webp 포함

/**
 * 정확한 타입 판별
 *
 * 로직 요약:
 * 1) attached_pic 제외한 "진짜 비디오 스트림" 먼저 찾는다.
 * 2) 비디오 스트림 없고 오디오만 있으면 audio
 * 3) 비디오 스트림 없으면 image
 * 4) 비디오 스트림이 있는데:
 *    - 이미지 코덱 + duration 없음/짧음 + nb_frames <= 1  => image
 *    - gif/apng/webp 같은 포맷 + nb_frames > 1          => animated-image
 *    - 그 외                                         => video
 */
export function detectAssetType(data: FfprobeData): AssetType {
  const primaryVideo = MediaUtils.extractPrimaryVideoStream(data);
  const audioStream = MediaUtils.extractAudioStream(data);

  const formatName = (data.format.format_name ?? '').toLowerCase();

  const durationNum = Number(data.format.duration ?? 0);
  const hasRealDuration = Number.isFinite(durationNum) && durationNum > 0.1;

  // 1) 비디오 스트림이 없고 오디오만 있으면 audio
  if (!primaryVideo && audioStream) return 'audio';

  // 2) 비디오 스트림이 없으면 image
  if (!primaryVideo) return 'image';

  // 3) primaryVideo가 있으면 video vs image 계열 판별
  const codec = (primaryVideo.codec_name ?? '').toLowerCase();

  const nbFrames =
    primaryVideo.nb_frames != null ? Number(primaryVideo.nb_frames) : undefined;

  const isImageCodec = IMAGE_CODEC_NAMES.includes(codec);
  const isSingleFrame =
    nbFrames === undefined || !Number.isFinite(nbFrames) || nbFrames <= 1;

  // 3-1) 이미지 코덱 + duration 없음/짧음 + 프레임 1장 => 정지 이미지
  if (isImageCodec && !hasRealDuration && isSingleFrame) {
    return 'image';
  }

  // 3-2) GIF/APNG/WEBP 계열 + 여러 프레임 => animated-image
  const looksAnimatedContainer = ANIMATED_FORMAT_HINTS.some((h) =>
    formatName.includes(h)
  );

  if (looksAnimatedContainer && !isSingleFrame) {
    return 'animated-image';
  }

  // 3-3) 나머지는 비디오
  return 'video';
}
