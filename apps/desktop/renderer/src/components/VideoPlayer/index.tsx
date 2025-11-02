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
      videoElement.muted = false;
      videoElement.playsInline = true;

      // 비디오가 재생 가능한 상태가 될 때까지 대기
      await new Promise<void>((resolve, reject) => {
        videoElement.oncanplaythrough = () => {
          // 비디오 재생 시작
          videoElement
            .play()
            .then(() => resolve())
            .catch(reject);
        };
        videoElement.onerror = () => reject(new Error('Failed to load video'));
      });

      // 첫 프레임이 렌더링될 때까지 잠시 대기
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Texture 생성 (비디오가 재생 중일 때)
      const t = Texture.from(videoElement);
      setTexture(t);
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
