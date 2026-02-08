import { spawn } from 'child_process';
import { getExtraResourcePath } from '@timmy-studio/electron-utils/utils/main';

const FFMPEG_PATH = getExtraResourcePath('ffmpeg');

/**
 * ffmpeg 진행률 정보를 파싱하는 인터페이스
 */
export interface FfmpegProgress {
  frame?: number; // 현재 프레임 수
  fps?: number; // 초당 프레임 수
  q?: number; // 품질
  size?: string; // 현재 파일 크기 (예: "1024kB")
  time?: string; // 현재 처리된 시간 (예: "00:01:23.45")
  bitrate?: string; // 비트레이트 (예: "1000kbits/s")
  speed?: string; // 처리 속도 (예: "2.5x")
  progress?: number; // 진행률 (0-100)
  eta?: string; // 예상 완료시간 (예: "00:05:30")
}

/**
 * ffmpeg stderr 출력을 파싱해서 진행률 정보를 추출
 */
export function parseFfmpegProgress(
  line: string,
  totalDurationMs?: number
): FfmpegProgress | null {
  if (!line.includes('frame=') || !line.includes('time=')) {
    return null;
  }

  const progress: FfmpegProgress = {};

  // frame 추출
  const frameMatch = line.match(/frame=\s*(\d+)/);
  if (frameMatch) {
    progress.frame = parseInt(frameMatch[1], 10);
  }

  // fps 추출
  const fpsMatch = line.match(/fps=\s*([\d.]+)/);
  if (fpsMatch) {
    progress.fps = parseFloat(fpsMatch[1]);
  }

  // q 추출
  const qMatch = line.match(/q=\s*([\d.]+)/);
  if (qMatch) {
    progress.q = parseFloat(qMatch[1]);
  }

  // size 추출
  const sizeMatch = line.match(/size=\s*([^\s]+)/);
  if (sizeMatch) {
    progress.size = sizeMatch[1];
  }

  // time 추출
  const timeMatch = line.match(/time=\s*([^\s]+)/);
  if (timeMatch) {
    progress.time = timeMatch[1];
  }

  // bitrate 추출
  const bitrateMatch = line.match(/bitrate=\s*([^\s]+)/);
  if (bitrateMatch) {
    progress.bitrate = bitrateMatch[1];
  }

  // speed 추출
  const speedMatch = line.match(/speed=\s*([^\s]+)/);
  if (speedMatch) {
    progress.speed = speedMatch[1];
  }

  // 진행률과 ETA 계산
  if (progress.time && totalDurationMs) {
    const currentTimeMs = parseTimeToMs(progress.time);
    progress.progress = Math.min(100, (currentTimeMs / totalDurationMs) * 100);

    // ETA 계산 (속도 기반)
    if (progress.speed) {
      const speedMultiplier = parseFloat(progress.speed.replace('x', ''));
      if (speedMultiplier > 0) {
        const remainingMs = totalDurationMs - currentTimeMs;
        const etaMs = remainingMs / speedMultiplier;
        progress.eta = formatMsToTime(etaMs);
      }
    }
  }

  return progress;
}

/**
 * 시간 문자열을 밀리초로 변환 (예: "00:01:23.45" -> 83450)
 */
export function parseTimeToMs(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length !== 3) return 0;

  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const seconds = parseFloat(parts[2]) || 0;

  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

/**
 * 밀리초를 시간 문자열로 변환 (예: 83450 -> "00:01:23")
 */
export function formatMsToTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 진행률 모니터링이 가능한 ffmpeg 프로세스를 실행
 */
export function runFfmpegWithProgress({
  args,
  onProgress,
  totalDurationMs,
  onFinish,
  onError,
}: {
  args: string[];
  onProgress?: (_progressData: FfmpegProgress) => void;
  totalDurationMs?: number;
  onFinish?: () => void;
  onError?: (err: unknown) => void;
}) {
  const ff = spawn(FFMPEG_PATH, args, {
    stdio: ['pipe', 'pipe', 'pipe'], // stderr를 캡처하기 위해 pipe 사용
  });

  ff.stderr?.on('data', (data: Buffer) => {
    const line = data.toString();
    const progressData = parseFfmpegProgress(line.trim(), totalDurationMs);
    if (progressData && onProgress) {
      onProgress(progressData);
    }
  });

  ff.on('error', (e) => {
    console.log(e);
    if (onError) onError(e);
  });

  ff.on('close', (code) => {
    console.log(`ffmpeg exited with code ${code}`);
    if (code === 0) {
      if (onFinish) onFinish();
    } else {
      if (onError) onError(new Error(`ffmpeg exited with code ${code}`));
    }
  });
  return ff;
}

export function resolveAppMediaPath(src: string): string {
  // Convert appmedia://open?path=... to filesystem path
  if (src.startsWith('appmedia://')) {
    try {
      const u = new URL(src);
      const p = u.searchParams.get('path');
      if (p) return p;
    } catch {
      // ignore
    }
  }
  return src;
}

// ========== 오디오 믹싱 타입 ==========
export type AudioFade = {
  st: number;
  d: number;
  curve?: 'qsin' | 'tri' | 'exp' | 'log';
};

export type AudioTrackSpec = {
  src: string; // 파일 경로 (appmedia://... 가능) -> resolveAppMediaPath로 실제 경로화
  trimStart: number; // 초
  trimEnd: number; // 초
  startMs?: number; // 타임라인 지연(밀리초)
  volume?: number; // 0.0 ~ 1.0(또는 더 큼)
  fadeIn?: AudioFade;
  fadeOut?: AudioFade;
};

export type MixOptions = {
  outFile: string; // 출력 경로 (m4a 추천)
  totalDurationSec: number; // 최종 길이(초) — 무음 베드 길이
  sampleRate?: number; // 기본 48000
  channelLayout?: 'mono' | 'stereo'; // 기본 stereo
  bitrateKbps?: number; // 기본 192
  normalize?: 0 | 1; // amix normalize, 기본 0
  durationMode?: 'longest' | 'shortest' | 'first'; // amix duration, 기본 longest
};

// ========== 필터 그래프 문자열 빌더 ==========
function buildFilterComplex(
  tracks: AudioTrackSpec[],
  opts: Required<Omit<MixOptions, 'outFile' | 'bitrateKbps'>>
) {
  const {
    totalDurationSec,
    sampleRate,
    channelLayout,
    normalize,
    durationMode,
  } = opts;

  const chains: string[] = [];

  // 1) 무음 베드 [s]
  chains.push(
    [
      `anullsrc=r=${sampleRate}:cl=${channelLayout}`,
      `atrim=0:${totalDurationSec}`,
      `asetpts=PTS-STARTPTS[s]`,
    ].join(',')
  );

  // 2) 각 입력 트랙 체인
  const outLabels: string[] = [];
  tracks.forEach((t, i) => {
    const inLabel = `[${i}:a]`;
    const outLabel = `[a${i}]`;
    outLabels.push(outLabel);

    const c: string[] = [];

    // trim
    const st = Number.isFinite(t.trimStart) ? t.trimStart : 0;
    const ed = Number.isFinite(t.trimEnd) ? t.trimEnd : totalDurationSec;
    c.push(`${inLabel}atrim=${st}:${ed}`);

    // 타임스탬프 리셋
    c.push(`asetpts=PTS-STARTPTS`);

    // volume
    if (typeof t.volume === 'number') {
      c.push(`volume=${t.volume}`);
    }

    // delay (ms)
    if (typeof t.startMs === 'number' && t.startMs > 0) {
      c.push(`adelay=${Math.max(0, Math.round(t.startMs))}:all=1`);
    }

    // fade in/out
    if (t.fadeIn) {
      const { st, d, curve = 'qsin' } = t.fadeIn;
      c.push(`afade=t=in:st=${st}:d=${d}:curve=${curve}`);
    }
    if (t.fadeOut) {
      const { st, d, curve = 'qsin' } = t.fadeOut;
      c.push(`afade=t=out:st=${st}:d=${d}:curve=${curve}`);
    }

    // 포맷 통일
    c.push(
      `aformat=sample_rates=${sampleRate}:channel_layouts=${channelLayout}`
    );
    c.push(`aresample=async=1:first_pts=0`);
    chains.push(c.join(',') + outLabel);
  });

  // 3) amix
  const amixInputs = ['[s]', ...outLabels].join('');
  chains.push(
    `${amixInputs}amix=inputs=${outLabels.length + 1}:normalize=${normalize}:duration=${durationMode}[out]`
  );

  return chains.join(';');
}

// ========== 실행 인자 빌더 ==========
function buildArgs(tracks: AudioTrackSpec[], opts: MixOptions) {
  const {
    outFile,
    totalDurationSec,
    sampleRate = 48000,
    channelLayout = 'stereo',
    bitrateKbps = 192,
    normalize = 0,
    durationMode = 'longest',
  } = opts;

  const args: string[] = ['-y'];
  tracks.forEach((t) => {
    const p = resolveAppMediaPath(t.src);
    args.push('-vn', '-sn', '-i', p);
  });

  const filter = buildFilterComplex(tracks, {
    totalDurationSec,
    sampleRate,
    channelLayout,
    normalize,
    durationMode,
  });

  args.unshift(
    '-nostdin',
    '-hide_banner',
    '-loglevel',
    'error',
    '-xerror',
    '-fflags',
    '+genpts'
  );

  args.push(
    '-filter_complex',
    filter,
    '-map',
    '[out]',
    '-c:a',
    'aac',
    '-b:a',
    `${bitrateKbps}k`,
    outFile
  );

  return args;
}

// ========== API: 진행률 콜백 받으면서 실행 ==========
export function spawnMixAudiosWithProgress(
  tracks: AudioTrackSpec[],
  opts: MixOptions,
  onProgress?: (_progressData: FfmpegProgress) => void,
  onFinish?: () => void,
  onError?: (err: unknown) => void
) {
  if (!tracks?.length) throw new Error('tracks가 비었습니다.');
  if (!opts?.outFile) throw new Error('outFile이 필요합니다.');
  if (!opts?.totalDurationSec || opts.totalDurationSec <= 0) {
    throw new Error('totalDurationSec이 필요합니다.');
  }
  const args = buildArgs(tracks, opts);
  const totalDurationMs = Math.round(opts.totalDurationSec * 1000);
  console.log('args', args.join(' '));
  console.log('totalDurationMs', totalDurationMs);
  return runFfmpegWithProgress({
    args,
    onProgress,
    totalDurationMs,
    onFinish,
    onError,
  });
}

/**
 * 비디오와 오디오를 합치는 함수
 */
export async function mergeVideoAndAudio(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  const args = [
    '-y',
    '-i',
    videoPath,
    '-i',
    audioPath,
    '-c:v',
    'copy', // 비디오는 재인코딩 하지 않음
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-shortest', // 비디오와 오디오 중 짧은 쪽에 맞춤
    outputPath,
  ];

  return new Promise((resolve, reject) => {
    const ff = spawn(FFMPEG_PATH, args, {
      stdio: ['inherit', 'inherit', 'inherit'],
    });
    ff.on('error', reject);
    ff.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}
