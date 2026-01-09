import { useEffect, useMemo, useRef } from 'react';
import { ButtonGroup } from '@/components/ui/button-group';
import { Button } from '@/components/ui/button';
import * as PIXI from 'pixi.js';

export default function PixiPlaygroundPage() {
  const parentRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);

  const create = async () => {
    const app = new PIXI.Application();
    appRef.current = app;
    await app.init({
      width: 1920,
      height: 1080,
      resizeTo: parentRef.current!,
    });
    parentRef.current!.appendChild(app.canvas);
  };

  const destroy = async () => {
    appRef.current!.destroy(true);
  };

  useEffect(() => {
    create();
    return () => {
      destroy();
    };
  }, []);

  return (
    <div
      className={
        'relative h-full flex flex-col items-center justify-center gap-4'
      }
    >
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(125% 125% at 50% 100%, #000000 40%, #010133 100%)',
        }}
      />

      <h1 className="relative z-10">PIXI</h1>
      <ButtonGroup className="relative z-10">
        <Button variant={'outline'} onClick={create}>
          Create
        </Button>
        <Button variant={'outline'} onClick={destroy}>
          Destroy
        </Button>
      </ButtonGroup>

      <div
        ref={parentRef}
        className={'relative z-10 border border-neutral-50 w-1/2 h-1/2'}
      ></div>
    </div>
  );
}
