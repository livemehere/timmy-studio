import {
  Application,
  BlurFilter,
  Container,
  Sprite,
  Texture,
  VideoSource,
} from 'pixi.js';
import { useEffect, useMemo, useRef, useState } from 'react';

export function VideoPlayer({ src }: { src?: string }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const app = useMemo<Application>(() => new Application(), []);
  const [sprite, setSprite] = useState<Sprite | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null
  );

  const initApp = async () => {
    if (!ref.current || !canvasRef.current) return;
    await app.init({
      canvas: canvasRef.current,
      resizeTo: ref.current,
    });
  };

  const loadVideo = async () => {
    if (!src) return;
    try {
      /* video element */
      const video = document.createElement('video');
      video.src = src;
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      setVideoElement(video);

      /* init */
      video.currentTime = 0;
      video.pause();
      video.muted = false;

      /* wait for video to be ready */
      await new Promise<void>((resolve, reject) => {
        video.oncanplay = () => {
          resolve();
        };
        video.onerror = (err) => {
          console.error('video load error:', err);
          reject(err);
        };
        // 이미 canplay 상태라면 즉시 resolve
        // if (video.readyState >= video.HAVE_FUTURE_DATA) {
        //   resolve();
        // }
      });

      /* texture from video */
      const texture = Texture.from(video);

      /* sprite */
      const sprite = new Sprite(texture);
      sprite.width = app.renderer.width;
      sprite.height = app.renderer.height;
      app.stage.addChild(sprite);
      setSprite(sprite);
      console.log('sprite added', sprite);

      /* filter */
      const blurFilter = new BlurFilter();
      sprite.filters = [blurFilter];

      let cnt = 0;
      app.ticker.add(() => {
        cnt += 0.005;
        blurFilter.strength = Math.sin(cnt) * 10;
      });
    } catch (err) {
      console.error('Failed to load video texture:', err);
    }
  };

  useEffect(() => {
    initApp();
  }, []);

  useEffect(() => {
    loadVideo();
    return () => {
      if (sprite) {
        app.stage.removeChild(sprite);
        sprite.destroy(true);
      }
    };
  }, [src]);

  return (
    <div ref={parentRef}>
      <button onClick={() => videoElement?.play()}>Play</button>
      <button onClick={() => videoElement?.pause()}>Pause</button>
      <div ref={ref} className="h-[500px]">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}
