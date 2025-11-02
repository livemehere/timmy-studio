import {
  Application,
  Assets,
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
      /* texture */
      const texture = await Assets.load<Texture>(src, {
        onProgress: (progress) => {
          console.log('video load progress:', progress);
        },
      });

      /* soure */
      const video = texture.source.resource as HTMLVideoElement;
      setVideoElement(video);

      /* init */
      video.currentTime = 0;
      video.pause();
      video.muted = false;

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
