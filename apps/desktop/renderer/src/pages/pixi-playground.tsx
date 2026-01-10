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

class Item {
  private readonly container: PIXI.Container;
  private readonly sprite: PIXI.Sprite;

  constructor() {
    this.container = new PIXI.Container();
    this.sprite = new PIXI.Sprite();
    this.container.addChild(this.sprite);
  }

  get() {
    return this.container;
  }

  get texture() {
    return this.sprite.texture;
  }

  async load(filePath: string) {
    if (PIXI.Assets.cache.has(filePath)) {
      this.sprite.texture = PIXI.Assets.cache.get(filePath) as PIXI.Texture;
    } else {
      this.sprite.texture = await PIXI.Assets.load(filePath);
    }
    this.syncPivot();
  }

  // getter
  get y() {
    return this.container.y;
  }
  get x() {
    return this.container.x;
  }
  get w() {
    return this.sprite.width;
  }
  get h() {
    return this.sprite.height;
  }
  get rotation() {
    return this.container.rotation;
  }

  get visible() {
    return this.container.visible;
  }

  // setter
  set x(value: number) {
    if (value === this.container.x) return;
    this.container.x = value;
  }
  set y(value: number) {
    if (value === this.container.y) return;
    this.container.y = value;
  }
  set w(value: number) {
    if (value === this.sprite.width) return;
    this.sprite.width = value;
    this.syncPivot();
  }
  set h(value: number) {
    if (value === this.sprite.height) return;
    this.sprite.height = value;
    this.syncPivot();
  }
  set rotation(angle: number) {
    if (angle === this.container.rotation) return;
    this.container.rotation = angle;
  }
  set visible(value: boolean) {
    if (value === this.container.visible) return;
    this.container.visible = value;
  }

  private syncPivot() {
    const w = this.sprite.width;
    const h = this.sprite.height;

    this.sprite.x = w / 2;
    this.sprite.y = h / 2;
    this.container.pivot.set(w / 2, h / 2);
  }

  debugPosition() {
    console.log(
      `container - pos: (${this.container.x},${this.container.y}), globalPos: (${this.container.getGlobalPosition().x},${this.container.getGlobalPosition().y})`
    );
    console.log(
      `sprite - pos: (${this.sprite.x},${this.sprite.y}), globalPos: (${this.sprite.getGlobalPosition().x},${this.sprite.getGlobalPosition().y})`
    );
  }

  debugSize() {
    console.log(
      `container - size: (${this.container.width},${this.container.height}), scale: (${this.container.scale.x}, ${this.container.scale.y})`
    );
    console.log(
      `sprite - size: (${this.sprite.width},${this.sprite.height}), scale: (${this.sprite.scale.x}, ${this.sprite.scale.y})`
    );
  }

  mount(parent: PIXI.Container) {
    parent.addChild(this.container);
  }

  unmount() {
    this.container.parent!.removeChild(this.container);
  }
}

export default function PixiPlaygroundPage() {
  const parentRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const itemRef = useRef<Item | null>(null);

  // sprite values
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const width = useMotionValue(0);
  const height = useMotionValue(0);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [visible, setVisible] = useState(true);

  const [horizontalAlign, setHorizontalAlign] = useState<
    'left' | 'center' | 'right' | 'none'
  >('none');
  // ---

  const getApp = () => {
    return appRef.current!;
  };

  const create = async (width: number, height: number) => {
    await PIXI.Assets.init({
      basePath: 'source://',
    });
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
    const imgUrl = `/path/path/to/sample-media.png`;

    const item = new Item();
    await item.load(imgUrl);
    itemRef.current = item;

    // 렌더링 요소에 추가
    item.mount(getApp().stage);

    // item.w = item.texture.width / 2;
    // item.h = item.texture.height / 2;

    x.set(item.x);
    y.set(item.y);
    width.set(item.w);
    height.set(item.h);

    item.debugPosition();
    item.debugSize();
  };

  const swapTexture = async () => {
    const imgUrl = `/path/path/to/sample-media.jpeg`;
    await itemRef.current!.load(imgUrl);

    // 크기 조정
    itemRef.current!.w = itemRef.current!.texture.width / 2;
    itemRef.current!.h = itemRef.current!.texture.height / 2;

    width.set(itemRef.current!.w);
    height.set(itemRef.current!.h);

    itemRef.current!.debugPosition();
    itemRef.current!.debugSize();
  };

  const umount = () => {
    itemRef.current!.unmount();
  };

  const recordAudio = async () => {
    const output = await window.app.invoke('record:systemAudio');
    console.log(output);
  };

  const stopRecordingAudio = () => {
    window.app.invoke('record:stopSystemAudio');
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
            <Button variant={'outline'} onClick={umount}>
              Unmount
            </Button>
            <Button variant={'outline'} onClick={swapTexture}>
              Swap Texture
            </Button>
            <Button variant={'outline'} onClick={recordAudio}>
              Recording audio
            </Button>
            <Button variant={'outline'} onClick={stopRecordingAudio}>
              Stop Recording audio
            </Button>
            <Button
              variant={'outline'}
              onClick={async () => {
                // video
                const res = await navigator.mediaDevices.getDisplayMedia({
                  audio: true,
                  video: true,
                });
                console.log(res.getVideoTracks());
                const audioTracks = res.getVideoTracks();
                const audioStream = new MediaStream(audioTracks);
                const recorder = new MediaRecorder(audioStream);
                recorderRef.current = recorder;
                let chunks: BlobPart[] = [];

                recorder.ondataavailable = (e) => {
                  chunks.push(e.data);
                };

                recorder.onstop = () => {
                  const blob = new Blob(chunks, { type: 'video/webm' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.style.display = 'none';
                  a.href = url;
                  a.download = 'recorded_audio.webm';
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                };

                recorder.start();
              }}
            >
              Recording Screen
            </Button>
            <Button
              variant={'outline'}
              onClick={() => {
                recorderRef.current?.stop();
              }}
            >
              Stop Recording
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
                        itemRef.current!.x = 0;
                        x.set(itemRef.current!.x);
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
                        itemRef.current!.x = getApp().renderer.width / 2;
                        x.set(itemRef.current!.x);
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
                        itemRef.current!.x = getApp().renderer.width;
                        x.set(itemRef.current!.x);
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
                        itemRef.current!.x = v;
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
                        itemRef.current!.y = v;
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
                      '[&_svg]:stroke-blue-500': aspectRatio !== null,
                    })}
                    onClick={() => {
                      if (aspectRatio !== null) {
                        // 체인을 푸는 경우
                        setAspectRatio(null);
                      } else {
                        // 체인을 잠그는 경우 - 현재 비율을 저장
                        const currentAspectRatio = width.get() / height.get();
                        setAspectRatio(currentAspectRatio);
                      }
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
                        itemRef.current!.w = v;

                        if (aspectRatio !== null) {
                          const newHeight = v / aspectRatio;
                          itemRef.current!.h = newHeight;
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
                        itemRef.current!.h = v;

                        if (aspectRatio !== null) {
                          const newWidth = v * aspectRatio;
                          itemRef.current!.w = newWidth;
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
                      itemRef.current!.visible = newVisible;
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
