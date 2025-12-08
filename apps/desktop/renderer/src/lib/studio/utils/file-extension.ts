export const VIDEO_FILE_EXTENSIONS = [
  '.mp4',
  '.mov',
  '.avi',
  '.mkv',
  '.flv',
  '.wmv',
  '.webm',
  '.mts',
  '.m2ts',
  '.3gp',
];

export const AUDIO_FILE_EXTENSIONS = [
  '.mp3',
  '.wav',
  '.aac',
  '.flac',
  '.ogg',
  '.m4a',
  '.wma',
];

export const IMAGE_FILE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.tiff',
  // '.svg', // TODO: svg 는 나중에 지원 or 변환 기능 지원하기, ffmprobe 로 메타데이터 추출이 안됨
  '.webp',
];

export const ALL_FILE_EXTENSIONS = [
  ...VIDEO_FILE_EXTENSIONS,
  ...AUDIO_FILE_EXTENSIONS,
  ...IMAGE_FILE_EXTENSIONS,
];
