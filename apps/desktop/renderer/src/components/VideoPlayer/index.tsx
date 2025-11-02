import { Application, extend } from '@pixi/react';
import { Assets, Container, Sprite, Texture } from 'pixi.js';
import { useEffect, useRef, useState } from 'react';

extend({
  Container,
  Sprite,
});

export function VideoPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [texture, setTexture] = useState<Texture | undefined>();

  const load = async () => {
    const texture = (await Assets.load(src)) as Texture;
    setTexture(texture);
  };
  useEffect(() => {
    load();
  }, [src]);

  return (
    <div ref={ref}>
      <Application resizeTo={ref}>
        <pixiSprite texture={texture} />
      </Application>
    </div>
  );
}
