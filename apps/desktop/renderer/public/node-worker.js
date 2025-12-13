/**
 * Node-enabled Web Worker for ffmpeg encoding.
 *
 * Requirements:
 * - BrowserWindow.webPreferences.nodeIntegrationInWorker = true
 *
 * Protocol (incoming):
 * - { type: 'set-ffmpeg-path', path: string }
 * - { type: 'spawn-ffmpeg', width: number, height: number, fps: number, output: string, durationMs?: number }
 * - { type: 'ffmpeg-write', buffer: ArrayBuffer, byteOffset?: number, byteLength?: number }
 * - { type: 'ffmpeg-write-batch', buffers: ArrayBuffer[], frameSizeBytes: number }
 * - { type: 'ffmpeg-close' }
 *
 * Protocol (outgoing):
 * - { type: 'ffmpeg-is-spawned', data: boolean }
 * - { type: 'progress', data: object }
 * - { type: 'done', output: string, code: number | null }
 * - { type: 'error', message: string }
 */

/* eslint-disable no-restricted-globals */

const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

/** @type {string | null} */
let FFMPEG_PATH = null;
/** @type {import('child_process').ChildProcessWithoutNullStreams | null} */
let ff = null;
/** @type {Promise<void> | null} */
let pendingDrain = null;
/** @type {string | null} */
let outputPath = null;
/** @type {number | null} */
let durationMs = null;

/** @type {boolean} */
let isSpawning = false;
/** @type {any[]} */
let pendingWrites = [];

/**
 * @param {string} message
 */
function postError(message) {
  postMessage({ type: 'error', message });
}

/**
 * Expand '~' in paths because ffmpeg won't.
 * @param {string} p
 * @returns {string}
 */
function expandHome(p) {
  if (typeof p !== 'string') return String(p);
  if (p === '~') return os.homedir();
  if (p.startsWith('~/') || p.startsWith('~\\')) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

/**
 * @param {Buffer} buffer
 * @returns {Promise<void>}
 */
function writeFrame(buffer) {
  if (!ff) throw new Error('ffmpeg process is not started');
  if (ff.stdin.writableEnded) throw new Error('ffmpeg stdin already ended');

  if (ff.stdin.write(buffer)) return Promise.resolve();

  if (!pendingDrain) {
    pendingDrain = new Promise((resolve, reject) => {
      const onDrain = () => {
        cleanup();
        resolve();
      };
      const onError = (err) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        ff?.stdin.off('drain', onDrain);
        ff?.stdin.off('error', onError);
      };

      ff?.stdin.on('drain', onDrain);
      ff?.stdin.on('error', onError);
    }).finally(() => {
      pendingDrain = null;
    });
  }

  return pendingDrain;
}

/**
 * @param {string} line
 * @param {number | null} totalDurationMs
 * @returns {Record<string, any> | null}
 */
function parseFfmpegProgress(line, totalDurationMs) {
  if (!line.includes('frame=') || !line.includes('time=')) return null;

  /** @type {Record<string, any>} */
  const progress = {};

  const frameMatch = line.match(/frame=\s*(\d+)/);
  if (frameMatch) progress.frame = parseInt(frameMatch[1], 10);

  const fpsMatch = line.match(/fps=\s*([\d.]+)/);
  if (fpsMatch) progress.fps = parseFloat(fpsMatch[1]);

  const qMatch = line.match(/q=\s*([\d.]+)/);
  if (qMatch) progress.q = parseFloat(qMatch[1]);

  const sizeMatch = line.match(/size=\s*([^\s]+)/);
  if (sizeMatch) progress.size = sizeMatch[1];

  const timeMatch = line.match(/time=\s*([^\s]+)/);
  if (timeMatch) progress.time = timeMatch[1];

  const bitrateMatch = line.match(/bitrate=\s*([^\s]+)/);
  if (bitrateMatch) progress.bitrate = bitrateMatch[1];

  const speedMatch = line.match(/speed=\s*([^\s]+)/);
  if (speedMatch) progress.speed = speedMatch[1];

  if (progress.time && totalDurationMs) {
    const currentTimeMs = parseTimeToMs(progress.time);
    progress.progress = Math.min(100, (currentTimeMs / totalDurationMs) * 100);

    if (progress.speed) {
      const speedMultiplier = parseFloat(
        String(progress.speed).replace('x', '')
      );
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
 * @param {string} timeStr
 * @returns {number}
 */
function parseTimeToMs(timeStr) {
  const parts = timeStr.split(':');
  if (parts.length !== 3) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const seconds = parseFloat(parts[2]) || 0;
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

/**
 * @param {number} ms
 * @returns {string}
 */
function formatMsToTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * @param {{width:number,height:number,fps:number,output:string,durationMs?:number}} opts
 */
function spawnFfmpeg(opts) {
  if (!FFMPEG_PATH) throw new Error('FFMPEG_PATH not set');
  if (!opts.output) throw new Error('Output path is required');

  const { width, height, fps } = opts;
  outputPath = expandHome(opts.output);
  durationMs = typeof opts.durationMs === 'number' ? opts.durationMs : null;

  isSpawning = true;

  // H.264 requires even dims; pad + format yuv420p for compatibility.
  const videoFilter = 'pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p';

  // prettier-ignore
  const args = [
    '-y',
    '-f', 'rawvideo',
    '-pix_fmt', 'rgba',
    '-s:v', `${width}x${height}`,
    '-r', String(fps),
    '-i', 'pipe:0',
    '-vf', videoFilter,
    '-an',
    // speed defaults (macOS hardware encoder is also possible, but keep deterministic here)
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outputPath,
  ];

  ff = spawn(FFMPEG_PATH, args, { stdio: ['pipe', 'pipe', 'pipe'] });

  ff.on('error', (e) => {
    postError(String(e));
  });

  ff.stderr?.on('data', (data) => {
    const line = data.toString('utf8').trim();
    const progressData = parseFfmpegProgress(line, durationMs);
    if (progressData) postMessage({ type: 'progress', data: progressData });
  });

  ff.on('close', (code) => {
    postMessage({ type: 'done', output: outputPath, code });

    if (code !== 0) {
      postError(`ffmpeg exited with code ${code}`);
    }

    ff = null;
    pendingDrain = null;
  });

  postMessage({ type: 'ffmpeg-is-spawned', data: !!ff });

  // Flush any queued writes that arrived during spawn.
  const queued = pendingWrites;
  pendingWrites = [];
  isSpawning = false;
  for (const m of queued) {
    // Fire and forget; errors will be surfaced via postError.
    handleMessage(m);
  }
}

/**
 * @param {any} msg
 */
async function handleMessage(msg) {
  switch (msg?.type) {
    case 'set-ffmpeg-path': {
      FFMPEG_PATH = msg.path;
      return;
    }
    case 'spawn-ffmpeg': {
      spawnFfmpeg({
        width: msg.width,
        height: msg.height,
        fps: msg.fps,
        output: msg.output,
        durationMs: msg.durationMs,
      });
      return;
    }
    case 'ffmpeg-write': {
      if (!ff) {
        if (isSpawning) {
          pendingWrites.push(msg);
          return;
        }
        throw new Error('ffmpeg process is not started');
      }
      const ab = msg.buffer;
      const byteOffset = Number.isFinite(msg.byteOffset) ? msg.byteOffset : 0;
      const byteLength = Number.isFinite(msg.byteLength)
        ? msg.byteLength
        : ab?.byteLength;
      if (!(ab instanceof ArrayBuffer)) throw new Error('No buffer provided');
      const buffer = Buffer.from(ab, byteOffset, byteLength);
      await writeFrame(buffer);
      return;
    }
    case 'ffmpeg-write-batch': {
      if (!ff) {
        if (isSpawning) {
          pendingWrites.push(msg);
          return;
        }
        throw new Error('ffmpeg process is not started');
      }
      const buffers = msg.buffers;
      const frameSizeBytes = msg.frameSizeBytes;
      if (!Array.isArray(buffers)) throw new Error('buffers must be an array');
      if (!Number.isFinite(frameSizeBytes) || frameSizeBytes <= 0) {
        throw new Error('invalid frameSizeBytes');
      }

      for (const ab of buffers) {
        if (!(ab instanceof ArrayBuffer)) throw new Error('Invalid buffer');
        if (ab.byteLength !== frameSizeBytes) {
          throw new Error(
            `Invalid frame size: got ${ab.byteLength}, expected ${frameSizeBytes}`
          );
        }
        await writeFrame(Buffer.from(ab));
      }
      return;
    }
    case 'ffmpeg-close': {
      if (!ff) throw new Error('ffmpeg process is not started');
      if (pendingDrain) await pendingDrain;
      ff.stdin.end();
      return;
    }
    default:
      throw new Error('Unknown message type: ' + String(msg?.type));
  }
}

self.onmessage = (e) => {
  Promise.resolve()
    .then(() => handleMessage(e.data))
    .catch((err) => {
      postError(err instanceof Error ? err.message : String(err));
    });
};
