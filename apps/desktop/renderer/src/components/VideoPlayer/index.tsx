import { Application, BlurFilter, NoiseFilter, Sprite, Texture } from 'pixi.js';
import { useEffect, useMemo, useRef, useState } from 'react';

export function VideoPlayer({ src }: { src?: string }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const app = useMemo<Application>(() => new Application(), []);
  const [sprite, setSprite] = useState<Sprite | null>(null);

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

      /* init */
      video.currentTime = 0;
      video.pause();
      video.muted = false;

      /* wait for video to be ready */
      await new Promise<void>((resolve, reject) => {
        video.oncanplay = () => {
          resolve();
          video.onerror = null;
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

      /* filter */
      sprite.filters = [new NoiseFilter({ noise: 0.5 })];
    } catch (err) {
      console.error('Failed to load video texture:', err);
    }
  };

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
      <div ref={ref} className="h-[500px]">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}
