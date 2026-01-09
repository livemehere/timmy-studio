import { useEffect, useRef, useState } from 'react';
import { ButtonGroup } from '@/components/ui/button-group';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import * as PIXI from 'pixi.js';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import {
  motion,
  type MotionValue,
  useMotionValue,
  useMotionValueEvent,
} from 'motion/react';
import { cn } from '@/lib/utils';
import { Link2 } from 'lucide-react';
import { MotionNumberInput } from '@/components/motion-number-input';

export default function PixiPlaygroundPage() {
  const parentRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);

  const spriteRef = useRef<PIXI.Sprite | null>(null);

  // sprite values
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const width = useMotionValue(0);
  const height = useMotionValue(0);
  const [sizeChained, setSizeChained] = useState(false);
  // ---

  const getApp = () => {
    return appRef.current!;
  };

  const create = async (width: number, height: number) => {
    const app = new PIXI.Application();
    appRef.current = app;
    await app.init({
      width,
      height,
      background: '#000000',
      antialias: true,
      resolution: 1,
      autoDensity: false,
    });
    const aspectRatio = width / height;
    if (aspectRatio > 1) {
      app.canvas.style.maxWidth = '100%';
      app.canvas.style.maxHeight = '100%';
      app.canvas.style.width = 'auto';
      app.canvas.style.height = 'auto';
    } else {
      app.canvas.style.maxHeight = '100%';
      app.canvas.style.maxWidth = '100%';
      app.canvas.style.width = 'auto';
      app.canvas.style.height = 'auto';
    }
    app.canvas.style.display = 'block';

    parentRef.current!.appendChild(app.canvas);

    await initRender();
  };

  const destroy = async () => {
    appRef.current!.destroy(true);
    appRef.current = null;
  };

  const initRender = async () => {
    const image = new Image();
    image.src = 'file:///path/to/sample-media.png';
    await image.decode();
    const texture = PIXI.Texture.from(image);
    const sprite = new PIXI.Sprite(texture);
    spriteRef.current = sprite;

    getApp().stage.addChild(sprite);

    x.set(sprite.x);
    y.set(sprite.y);
    width.set(sprite.width);
    height.set(sprite.height);
  };

  useEffect(() => {
    create(1920, 1080);
    return () => {
      destroy();
    };
  }, []);

  return (
    <div className={'relative h-full flex items-center justify-center gap-4'}>
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(125% 125% at 50% 100%, #000000 40%, #010133 100%)',
        }}
      />

      <div className="relative z-10 w-full grid grid-cols-[350px_1fr_350px] gap-4 px-4">
        <div></div>

        <div className={'flex flex-col items-center gap-4'}>
          <ButtonGroup className="relative z-10">
            <Button variant={'outline'} onClick={() => create(1920, 1080)}>
              Create
            </Button>
            <Button variant={'outline'} onClick={destroy}>
              Destroy
            </Button>
          </ButtonGroup>
          {/* 가운데 - Renderer */}
          <div
            ref={parentRef}
            className={
              'relative border border-neutral-50 bg-neutral-900 flex items-center justify-center'
            }
          ></div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldSet>
              <FieldLegend>Position</FieldLegend>
              <div className={'flex gap-2'}>
                <MotionNumberInput
                  value={x}
                  map={(v) => Number(v.toFixed(2))}
                  onChange={(v) => {
                    spriteRef.current!.x = v;
                  }}
                  icon={<div className={'text-sm'}>X</div>}
                />
                <MotionNumberInput
                  value={y}
                  map={(v) => Number(v.toFixed(2))}
                  onChange={(v) => {
                    spriteRef.current!.y = v;
                  }}
                  icon={<div className={'text-sm'}>Y</div>}
                />
              </div>
            </FieldSet>
            <FieldSet className={'mt-4'}>
              <FieldLegend>Size</FieldLegend>
              <div className={'flex gap-2'}>
                <Button
                  size={'icon-sm'}
                  variant={'outline'}
                  className={cn({
                    '[&_svg]:stroke-blue-500': sizeChained,
                  })}
                  onClick={() => {
                    setSizeChained(!sizeChained);
                  }}
                >
                  <Link2 size={16} />
                </Button>
                <MotionNumberInput
                  value={width}
                  map={(v) => Math.max(0, Number(v.toFixed(2)))}
                  onChange={(v) => {
                    spriteRef.current!.width = v;

                    if (sizeChained) {
                      const aspectRatio =
                        spriteRef.current!.texture.width /
                        spriteRef.current!.texture.height;
                      const newHeight = v / aspectRatio;
                      spriteRef.current!.height = newHeight;
                      height.set(newHeight);
                    }
                  }}
                  icon={<div className={'text-sm'}>W</div>}
                />
                <MotionNumberInput
                  value={height}
                  map={(v) => Math.max(0, Number(v.toFixed(2)))}
                  onChange={(v) => {
                    spriteRef.current!.height = v;
                    if (sizeChained) {
                      const aspectRatio =
                        spriteRef.current!.texture.width /
                        spriteRef.current!.texture.height;
                      const newWidth = v * aspectRatio;
                      spriteRef.current!.width = newWidth;
                      width.set(newWidth);
                    }
                  }}
                  icon={<div className={'text-sm'}>H</div>}
                />
              </div>
            </FieldSet>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
