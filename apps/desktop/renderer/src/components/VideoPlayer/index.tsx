import { Application, extend } from '@pixi/react';
import { Container, Sprite, Texture } from 'pixi.js';
import { useEffect, useRef, useState } from 'react';

extend({
  Container,
  Sprite,
});

export function VideoPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [texture, setTexture] = useState<Texture | undefined>();
  const [error, setError] = useState<string | undefined>();

  const load = async () => {
    try {
      // 비디오 엘리먼트를 직접 생성
      const videoElement = document.createElement('video');
      videoElement.src = src;
      videoElement.crossOrigin = 'anonymous';
      videoElement.autoplay = true;
      videoElement.loop = true;
      videoElement.muted = true;

      // 비디오 메타데이터 로드 대기
      await new Promise<void>((resolve, reject) => {
        videoElement.onloadedmetadata = () => resolve();
        videoElement.onerror = () => reject(new Error('Failed to load video'));
      });

      // Texture 생성
      const texture = Texture.from(videoElement);
      setTexture(texture);
      setError(undefined);
    } catch (err) {
      console.error('Failed to load video texture:', err);
      setError(err instanceof Error ? err.message : 'Failed to load video');
    }
  };

  useEffect(() => {
    load();
  }, [src]);

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!texture) {
    return <div>Loading video...</div>;
  }

  return (
    <div ref={ref}>
      <Application resizeTo={ref} autoStart>
        <pixiSprite texture={texture} />
      </Application>
    </div>
  );
}
