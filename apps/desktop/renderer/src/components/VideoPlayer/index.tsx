import { Application, BlurFilter, NoiseFilter, Sprite, Texture } from 'pixi.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { interval, switchMap } from 'rxjs';
import { Input, ALL_FORMATS, UrlSource, CanvasSink } from 'mediabunny';
import { throttle } from 'lodash-es';

export function VideoPlayer({ src }: { src?: string }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const app = useMemo<Application>(() => new Application(), []);
  const [sprite, setSprite] = useState<Sprite | null>(null);

  // ---
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [maxFrame, setMaxFrame] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [sink, setSink] = useState<CanvasSink | null>(null);
  const [fps, setFps] = useState(0);

  const initApp = async () => {
    if (!ref.current || !canvasRef.current) return;
    await app.init({
      canvas: canvasRef.current,
      resizeTo: ref.current,
    });
  };

  const cleanup = () => {
    if (sprite) {
      app.stage.removeChild(sprite);
      sprite.destroy(true);
      setSprite(null);
    }
  };

  const handleExtractFrame = async () => {
    // const output = app.renderer.extract.pixels(app.stage);

    // const byte = output.pixels.length;
    // const formatMb = (byte / (1024 * 1024)).toFixed(2);
    // console.log(`${formatMb}MB`);

    const sub = interval(4)
      .pipe(
        switchMap((v) => {
          console.time('extract frame');
          const output = app.renderer.extract.canvas(app.stage);
          console.timeEnd('extract frame');
          // output.style.width = '100%';
          // output.style.height = 'auto';
          // const preview = document.getElementById(
          //   'preview'
          // ) as HTMLUListElement;
          // preview.appendChild(output as HTMLCanvasElement);

          return [];
        })
      )
      .subscribe();
  };

  const loadVideo = async () => {
    console.log('loadVideo src:', src);
    if (!src) return;
    cleanup();

    try {
      /* video element */
      const video = document.createElement('video');
      video.src = src;
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';

      /* wait for video to be ready */
      await new Promise<void>((resolve, reject) => {
        video.oncanplay = () => {
          resolve();
          video.onerror = null;
          console.log('videoEl duration:', video.duration);
        };
        video.onerror = (e) => {
          console.error('video error event:', e);
          reject();
        };
      });

      /* texture from video */
      const texture = Texture.from(video);

      /* sprite */
      const sprite = new Sprite(texture);
      sprite.width = app.renderer.width;
      sprite.height = app.renderer.height;
      app.stage.addChild(sprite);
      setSprite(sprite);

      /* video controls */
      video.currentTime = 0;
      video.pause();
      video.muted = false;

      /* filter */
      // sprite.filters = [new NoiseFilter({ noise: 0.5 })];

      /* --- media bunny */
      const input = new Input({
        formats: ALL_FORMATS,
        source: new UrlSource(src),
      });
      console.log(input);
      const duration = await input.computeDuration();
      const videoTrack = await input.getPrimaryVideoTrack();
      if (!videoTrack) throw new Error('No video track found');
      const packetStats = await videoTrack.computePacketStats();
      const totalFrames = packetStats.packetCount;
      const fps = packetStats.averagePacketRate;
      setFps(fps);
      console.log('total frames:', totalFrames);
      console.log('fps:', fps);
      console.log('video duration:', duration);
      setMaxFrame(totalFrames);

      const sink = new CanvasSink(videoTrack, {
        width: 120,
        poolSize: 20,
        // height: 720,
        // fit:true,
        alpha: false,
      });
      setSink(sink);
    } catch (err) {
      console.error('Failed to load video texture:', err);
    }
  };

  const frameIdxToTimestamp = (frameIdx: number, fps: number) => {
    return frameIdx / fps;
  };

  const seekToFrame = useCallback(
    async (frame: number) => {
      console.log('called seekToFrame:', frame);
      if (!sink) return;
      const timestamp = frameIdxToTimestamp(frame, fps);
      sink
        .getCanvas(timestamp)
        .then(async (sample) => {
          const canvas = sample?.canvas;
          if (!canvas) return;
          const newTexture = Texture.from(canvas);
          console.log(frame, canvas);
          sprite!.texture = newTexture;
        })
        .catch((err) => {
          console.error('Error getting canvas from sink:', err);
        });
    },
    [sink, sprite, fps]
  );

  useEffect(() => {
    if (videoElement) {
      videoElement.currentTime = frameIdxToTimestamp(currentFrame, fps);
    }
    // seekToFrame(currentFrame);
  }, [currentFrame, sink, maxFrame, fps]);

  useEffect(() => {
    initApp();
  }, []);

  useEffect(() => {
    loadVideo();
  }, [src]);

  const videoElement = useMemo(() => {
    return sprite?.texture.source.resource as unknown as HTMLVideoElement;
  }, [sprite]);

  return (
    <div ref={parentRef}>
      <button onClick={() => videoElement?.play()}>Play</button>
      <button onClick={() => videoElement?.pause()}>Pause</button>
      <button
        onClick={() => {
          cleanup();
        }}
      >
        remove
      </button>
      <input
        className="w-full"
        type="range"
        min={0}
        max={maxFrame}
        step={1}
        value={currentFrame}
        onChange={(e) => setCurrentFrame(Number(e.target.value))}
      />
      <div>current frame: {currentFrame}</div>
      <div ref={ref} className="h-[500px]">
        <canvas ref={canvasRef}></canvas>
      </div>
      <hr />
      <div>frames</div>
      <div>
        <button onClick={handleExtractFrame}>extract frame</button>
        <div id="preview" className="grid grid-cols-6"></div>
      </div>
    </div>
  );
}
