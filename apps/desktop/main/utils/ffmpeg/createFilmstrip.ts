import fs from 'node:fs';
import path from 'node:path';
import { FILMSTRIPS_DIR } from '@main/constants/paths';
import { createFfmpeg } from '../ffmpeg';

export const FILMSTRIP_FRAME_HEIGHT_PX = 64;
export const FILMSTRIP_MAX_FRAMES = 120;
// Larger interval => fewer frames (less visually dense) across most zoom levels.
export const FILMSTRIP_MIN_INTERVAL_MS = 1000;

type FilmstripSpec = {
  filePath: string;
  frameCount: number;
  frameHeight: number;
  intervalMs: number;
  assetDurationMs: number;
};

type FilmstripSpecOptions = {
  frameHeight?: number;
  maxFrames?: number;
  minIntervalMs?: number;
};

export function computeFilmstripSpec(
  durationMs: number,
  options?: FilmstripSpecOptions
): Omit<FilmstripSpec, 'filePath'> | null {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return null;

  const frameHeight = options?.frameHeight ?? FILMSTRIP_FRAME_HEIGHT_PX;
  const maxFrames = options?.maxFrames ?? FILMSTRIP_MAX_FRAMES;
  const minIntervalMs = options?.minIntervalMs ?? FILMSTRIP_MIN_INTERVAL_MS;

  const targetFrameCount = Math.ceil(durationMs / minIntervalMs) + 1;
  const frameCount = Math.max(2, Math.min(maxFrames, targetFrameCount));

  const intervalMs = Math.max(1, Math.round(durationMs / (frameCount - 1)));

  return {
    frameCount,
    frameHeight,
    intervalMs,
    assetDurationMs: durationMs,
  };
}

export function getFilmstripPath(
  sourceFilePath: string,
  spec: Omit<FilmstripSpec, 'filePath'>
): string {
  const filename = path.basename(sourceFilePath, path.extname(sourceFilePath));
  const filmstripFilename = `filmstrip.${filename}.h${spec.frameHeight}.fc${spec.frameCount}.iv${spec.intervalMs}.png`;
  return path.join(FILMSTRIPS_DIR, filmstripFilename);
}

export async function createFilmstrip(
  sourceFilePath: string,
  options: { durationMs: number } & FilmstripSpecOptions
): Promise<FilmstripSpec> {
  const spec = computeFilmstripSpec(options.durationMs, options);
  if (!spec) {
    throw new Error('[createFilmstrip] Invalid durationMs');
  }

  const outputPath = getFilmstripPath(sourceFilePath, spec);

  if (fs.existsSync(outputPath)) {
    return {
      ...spec,
      filePath: outputPath,
    };
  }

  await fs.promises.mkdir(FILMSTRIPS_DIR, { recursive: true });

  const fps = 1000 / spec.intervalMs;

  return await new Promise<FilmstripSpec>((resolve, reject) => {
    createFfmpeg(sourceFilePath)
      .on('end', () => {
        resolve({
          ...spec,
          filePath: outputPath,
        });
      })
      .on('error', reject)
      .noAudio()
      .outputOptions(['-frames:v 1', '-vsync 0'])
      .videoFilters([
        `fps=${fps.toFixed(6)}`,
        `scale=-1:${spec.frameHeight}`,
        `tile=${spec.frameCount}x1:nb_frames=${spec.frameCount}:padding=0:margin=0`,
      ])
      .save(outputPath);
  });
}
