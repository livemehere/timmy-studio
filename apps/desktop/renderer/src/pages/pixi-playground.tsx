import { useEffect, useRef, useState } from 'react';
import { ButtonGroup } from '@/components/ui/button-group';
import { Button } from '@/components/ui/button';
import * as PIXI from 'pixi.js';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from '@/components/ui/field';
import { useMotionValue } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartVertical,
  Eye,
  EyeOff,
  Link2,
} from 'lucide-react';
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
  const [visible, setVisible] = useState(true);

  const [horizontalAlign, setHorizontalAlign] = useState<
    'left' | 'center' | 'right' | 'none'
  >('none');
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
    await PIXI.Assets.init({
      basePath: 'source://',
    });
    const imgUrl = `/path/path/to/sample-media.png`;
    const texture = await PIXI.Assets.load<PIXI.Texture>(imgUrl);

    console.log(PIXI.Assets.cache.get(imgUrl));

    const sprite = new PIXI.Sprite(texture);

    // 렌더링 요소에 추가
    getApp().stage.addChild(sprite);

    // init
    sprite.width = sprite.width / 2;
    sprite.height = sprite.height / 2;

    // binding to react
    spriteRef.current = sprite;
    x.set(sprite.x);
    y.set(sprite.y);
    width.set(sprite.width);
    height.set(sprite.height);

    console.log(appRef.current);
  };

  const swapTexture = async () => {
    const imgUrl = `/path/path/to/sample-media.jpeg`;
    spriteRef.current!.texture = await PIXI.Assets.load<PIXI.Texture>(imgUrl);
    spriteRef.current!.width = spriteRef.current!.texture.width / 2;
    spriteRef.current!.height = spriteRef.current!.texture.height / 2;
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
            <Button
              variant={'outline'}
              onClick={() => {
                spriteRef.current!.parent!.removeChild(spriteRef.current!);
              }}
            >
              Remove
            </Button>
            <Button variant={'outline'} onClick={swapTexture}>
              Swap Texture
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

        <div className="w-full max-w-sm bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
          <FieldGroup>
            <FieldSet>
              <FieldLegend>Position</FieldLegend>
              <FieldGroup>
                <Field>
                  <FieldLabel>Alignment</FieldLabel>
                  <ButtonGroup>
                    <Button
                      size={'icon-sm'}
                      variant={'outline'}
                      className={cn({
                        '[&_svg]:stroke-blue-500': horizontalAlign === 'left',
                      })}
                      onClick={() => {
                        spriteRef.current!.x = 0;
                        x.set(spriteRef.current!.x);
                        setHorizontalAlign('left');
                      }}
                    >
                      <AlignStartVertical size={16} />
                    </Button>
                    <Button
                      size={'icon-sm'}
                      variant={'outline'}
                      className={cn({
                        '[&_svg]:stroke-blue-500': horizontalAlign === 'center',
                      })}
                      onClick={() => {
                        spriteRef.current!.x =
                          (getApp().renderer.width - spriteRef.current!.width) /
                          2;
                        x.set(spriteRef.current!.x);
                        setHorizontalAlign('center');
                      }}
                    >
                      <AlignCenterVertical size={16} />
                    </Button>
                    <Button
                      size={'icon-sm'}
                      variant={'outline'}
                      className={cn({
                        '[&_svg]:stroke-blue-500': horizontalAlign === 'right',
                      })}
                      onClick={() => {
                        spriteRef.current!.x =
                          getApp().renderer.width - spriteRef.current!.width;
                        x.set(spriteRef.current!.x);
                        setHorizontalAlign('right');
                      }}
                    >
                      <AlignEndVertical size={16} />
                    </Button>
                  </ButtonGroup>
                </Field>
                <div className={'flex gap-2'}>
                  <Field>
                    <FieldLabel>X</FieldLabel>
                    <MotionNumberInput
                      value={x}
                      map={(v) => Number(v.toFixed(2))}
                      onChange={(v) => {
                        spriteRef.current!.x = v;
                      }}
                      icon={<div className={'text-sm opacity-50'}>X</div>}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Y</FieldLabel>
                    <MotionNumberInput
                      value={y}
                      map={(v) => Number(v.toFixed(2))}
                      onChange={(v) => {
                        spriteRef.current!.y = v;
                      }}
                      icon={<div className={'text-sm opacity-50'}>Y</div>}
                    />
                  </Field>
                </div>
              </FieldGroup>
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
              <FieldLegend>Size</FieldLegend>
              <FieldGroup>
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
                  <Field>
                    <FieldLabel>Width</FieldLabel>
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
                      icon={<div className={'text-sm opacity-50'}>W</div>}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Height</FieldLabel>
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
                      icon={<div className={'text-sm opacity-50'}>H</div>}
                    />
                  </Field>
                </div>
              </FieldGroup>
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
              <FieldLegend>Appearance</FieldLegend>
              <FieldGroup>
                <Field orientation="horizontal">
                  <FieldLabel>Visible</FieldLabel>
                  <Button
                    size={'icon-sm'}
                    variant={'outline'}
                    className={cn({
                      'bg-blue-500/20 border-blue-500': visible,
                    })}
                    onClick={() => {
                      const newVisible = !visible;
                      setVisible(newVisible);
                      if (spriteRef.current) {
                        spriteRef.current.visible = newVisible;
                      }
                    }}
                  >
                    {visible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </Button>
                </Field>
              </FieldGroup>
            </FieldSet>
          </FieldGroup>
        </div>
      </div>
    </div>
  );
}
