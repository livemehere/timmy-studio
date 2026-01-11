import gsap from 'gsap';
import { initDevtools } from '@pixi/devtools';
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
  TriangleRight,
} from 'lucide-react';
import { MotionNumberInput } from '@/components/motion-number-input';
import { BlurFilter, Graphics, NoiseFilter } from 'pixi.js';
import { css } from '@emotion/react';
import { animate } from 'motion';

class Item {
  readonly container: PIXI.Container;
  readonly sprite: PIXI.Sprite;

  private _x: number = 0;
  private _y: number = 0;

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
    this.sprite.texture = await PIXI.Assets.load(filePath); // 자동으로 filePath 기준으로 cache 관리됨
    this.syncTransform();
    this.drawDebug();
  }

  // getter
  get x() {
    return this._x;
  }
  get y() {
    return this._y;
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
  get opacity() {
    return this.container.alpha;
  }

  // setter
  set x(value: number) {
    this._x = value;
    this.syncTransform();
  }
  set y(value: number) {
    this._y = value;
    this.syncTransform();
  }
  set w(value: number) {
    if (value === this.sprite.width) return;
    this.sprite.width = value;
    this.syncTransform();
    this.drawDebug();
  }
  set h(value: number) {
    if (value === this.sprite.height) return;
    this.sprite.height = value;
    this.syncTransform();
    this.drawDebug();
  }
  set rotation(angle: number) {
    if (angle === this.container.rotation) return;
    this.container.rotation = angle;
  }
  set visible(value: boolean) {
    if (value === this.container.visible) return;
    this.container.visible = value;
  }
  set opacity(value: number) {
    if (value === this.container.alpha) return;
    this.container.alpha = value;
  }

  private syncTransform() {
    const w = this.sprite.width;
    const h = this.sprite.height;

    // contianer 중점을 항상 중앙으로
    this.container.pivot.set(w / 2, h / 2);

    // 논리적 좌표계는 좌상든을 유지하기 위해서, 절반만큼 항상 더해줌
    this.container.x = this._x + w / 2;
    this.container.y = this._y + h / 2;
  }

  removeDebug() {
    this.container.removeChild(
      this.container.children.filter((c) => c.label === 'debug')[0]
    );
  }

  drawDebug() {
    this.removeDebug();

    const g = new PIXI.Graphics();
    g.label = 'debug';

    // --- 1. 로컬 bounds (중요!)
    const bounds = this.container.getLocalBounds();

    // 🟦 bounds 사각형
    g.beginPath();
    g.setStrokeStyle({ width: 10, color: 0xff0000, alpha: 0.8 });
    g.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    g.stroke();
    g.closePath();

    // container 좌표
    g.fill('red');
    g.circle(this.container.x, this.container.y, 10);
    g.fill();

    // sprite 좌표
    g.fill('blue');
    g.circle(this.sprite.x, this.sprite.y, 10);
    g.fill();

    this.container.addChild(g);
    this.container.sortChildren();
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
  const rotation = useMotionValue(0);
  const opacity = useMotionValue(1);
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
    if (appRef.current) {
      destroy();
    }

    await PIXI.Assets.init({
      basePath: 'source://',
    });
    const app = new PIXI.Application();
    appRef.current = app;
    await app.init({
      width,
      height,
      background: '#1e1e1e',
      antialias: false,
      resolution: 1,
      autoDensity: false,
      powerPreference: 'high-performance',
    });

    initDevtools({ app });

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

    app.stage.on('pointerdown', (e) => {
      console.log(e);
    });
  };

  const destroy = async () => {
    if (appRef.current) {
      appRef.current.destroy(true);
      appRef.current = null;
    }
  };

  const initRender = async () => {
    const imgUrl = `/path/path/to/sample-media.png`;

    const item = new Item();
    await item.load(imgUrl);
    itemRef.current = item;

    // 렌더링 요소에 추가
    item.mount(getApp().stage);

    item.w = item.texture.width / 2;
    item.h = item.texture.height / 2;
    item.x = (getApp().renderer.width - item.w) / 2;
    item.y = (getApp().renderer.height - item.h) / 2;

    x.set(item.x);
    y.set(item.y);
    width.set(item.w);
    height.set(item.h);
    rotation.set(item.rotation);
    opacity.set(item.opacity);

    /* masking */
    // const rect = new Graphics();
    // rect.rect(0, 0, 400, 400).fill('#000000');
    //
    // item.get().mask = rect;

    /* filter */
    // const filter = new PIXI.BlurFilter({
    //   strength: 20,
    //   quality: 4,
    // });
    // item.get().filters = [filter];

    /* tint */
    // item.get().tint = 'dodgerblue';

    /* blend mode */
    // item.get().blendMode = 'multiply';

    item.get().interactive = true;
    item.get().on('pointerdown', (e) => {
      console.log('pointerdown', e);
      const point = new PIXI.Graphics();
      point.circle(0, 0, 10);
      point.fill('red');
      point.x = e.globalX;
      point.y = e.globalY;
      getApp().stage.addChild(point);
    });

    // item.get().onRender = () => {
    //   item.get().rotation += 0.001;
    // };

    /* tiling */
    // const tile = new PIXI.TilingSprite({
    //   texture: PIXI.Texture.from(imgUrl),
    //   width: 800,
    //   height: 200,
    // });
    // tile.x = 100;
    // tile.y = 100;
    // getApp().stage.addChild(tile);

    /* texture 로 칠하기 (마스킹느낌) */
    // const g = new Graphics().rect(0, 0, 500, 500).fill({
    // texture: PIXI.Texture.from(imgUrl),
    // textureSpace: 'global',
    // matrix: new PIXI.Matrix().scale(0.5, 0.5),
    // });

    // 원을 로컬 좌표계 (0, 0)에 그리고, 그라디언트도 원의 범위에 맞춤
    // const g = new Graphics().circle(0, 0, 250).fill(
    //   new PIXI.FillGradient({
    //     type: 'linear',
    //     start: { x: 0, y: 0 }, // 0~1
    //     end: { x: 1, y: 0 }, // 0~1
    //     // start: { x: -250, y: -250 }, // global 인 경우
    //     // end: { x: 250, y: 250 }, // global 인 경우
    //     // textureSpace: 'global',
    //     colorStops: [
    //       { offset: 0, color: 'yellow' },
    //       { offset: 1, color: 'red' },
    //     ],
    //   })
    // );
    //
    // g.x = 100;
    // g.y = 600;
    // getApp().stage.addChild(g);

    const style = new PIXI.TextStyle({
      fontSize: 200,
      fill: '#fff',
      fontFamily: 'Arial',
      stroke: {
        color: 'red',
        width: 10,
      },
      dropShadow: {
        color: 'blue',
        blur: 10,
        distance: 30,
        angle: Math.PI / 6,
      },
      fontStyle: 'italic',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 1000,
      letterSpacing: 10,
      breakWords: true,
      fontWeight: 'bold',
    });

    const t = new PIXI.SplitText({
      text: '안녕하세요 오늘의 먹방은\n맛있는 MacBook 입니다',
      style,
      autoSplit: true,
      lineAnchor: {
        x: 0.5,
        y: 0.5,
      },
    });

    t.chars.forEach((c, i) => {
      gsap.from(c, {
        y: -100,
        delay: i * 0.05,
      });
    });

    t.eventMode = 'static';
    t.on('pointerdown', (e) => {
      console.log(e);
    });

    t.filters = [
      new BlurFilter({ strength: 4 }),
      new NoiseFilter({ noise: 1.2 }),
    ];

    // const t = new PIXI.HTMLText({
    //   text: `<div style="box-sizing:border-box; max-width:1000px; background:#232323;padding-left:80px; padding-right:80px; word-break: break-all; white-space: break-spaces;">hello world!오늘의 먹방은!🙏안녕하세요!</div>`,
    //   style: {
    //     fontSize: 100,
    //     fontWeight: 'bold',
    //     fill: '#ffffff',
    //     fontFamily: 'Arial',
    //   },
    // });
    //
    // t.x = 100;
    // t.y = 100;
    // t.onRender = () => {
    //   t.width += 0.1;
    // };

    // const rect = new PIXI.Graphics();
    // rect.rect(0, 0, 500, 500).fill('#ffffff');
    // rect.zIndex = 10;
    // rect.alpha = 0.9;
    // rect.blendMode = 'overlay';
    // rect.filters = [new BlurFilter({ strength: 90 })];
    //
    // getApp().stage.addChild(rect);
    //
    // // 모자이크 처리: sample-image 이미지의 특정 영역에만 적용
    // const mosaicArea = new PIXI.Container();
    //
    // // 원본 이미지와 동일한 위치에 배치
    // mosaicArea.x = item.x;
    // mosaicArea.y = item.y;
    // mosaicArea.zIndex = item.get().zIndex + 1; // item 위에 위치
    //
    // // 모자이크할 영역의 스프라이트 (같은 텍스처 사용)
    // const mosaicSprite = new PIXI.Sprite(item.texture);
    // mosaicSprite.width = item.w;
    // mosaicSprite.height = item.h;
    // mosaicSprite.anchor.set(0.5, 0.5); // item과 동일한 중심점
    //
    // // 강한 블러로 모자이크 효과
    // const mosaicBlur = new BlurFilter({
    //   strength: 30,
    //   quality: 2,
    // });
    // mosaicSprite.filters = [mosaicBlur];
    //
    // // 마스크: 특정 영역(예: 오른쪽 절반)만 보이게
    // const mosaicMask = new PIXI.Graphics();
    // // 이미지의 오른쪽 절반을 모자이크 처리
    // mosaicMask.rect(0, -item.h / 2, item.w / 2, item.h).fill('#000000');
    //
    // mosaicArea.addChild(mosaicSprite);
    // mosaicArea.addChild(mosaicMask);
    // mosaicSprite.mask = mosaicMask;
    //
    // getApp().stage.addChild(mosaicArea);
    //
    // getApp().stage.eventMode = 'static';
    //
    // getApp().stage.on('pointermove', (e) => {
    //   rect.position.copyFrom(e.global);
    // });
    //
    // getApp().stage.addChild(t);
    //
    // const element = document.createElement('textarea');
    //
    // element.value = 'Type here...';
    //
    // const dom = new PIXI.DOMContainer({
    //   element,
    // });
    // dom.zIndex = 20;
    // dom.x = 1920 / 2;
    // dom.y = 300;
    // getApp().stage.addChild(dom);

    await PIXI.Assets.load('/path/path/to/sample-media.svg');

    // gap이 있는 타일 패턴 만들기
    const logoTexture = PIXI.Texture.from(
      '/path/path/to/sample-media.svg'
    );

    const tileSize = 150; // 로고 크기
    const gap = 150; // 타일 사이 간격
    const patternSize = tileSize + gap;

    // 패턴용 컨테이너 생성
    const patternContainer = new PIXI.Container();
    const logoSprite = new PIXI.Sprite(logoTexture);
    logoSprite.width = tileSize;
    logoSprite.height = tileSize;
    patternContainer.addChild(logoSprite);

    // RenderTexture로 패턴 생성
    const renderTexture = PIXI.RenderTexture.create({
      width: patternSize,
      height: patternSize,
    });

    getApp().renderer.render({
      container: patternContainer,
      target: renderTexture,
    });

    const bg = new PIXI.TilingSprite({
      texture: renderTexture,
      width: getApp().renderer.width,
      height: getApp().renderer.height,
    });

    // 우하단으로 계속 이동
    bg.onRender = () => {
      bg.tilePosition.x += 0.5; // 오른쪽으로 이동 속도
      bg.tilePosition.y += 0.5; // 아래로 이동 속도
    };

    getApp().stage.addChildAt(bg, 0);
  };

  const swapTexture = async () => {
    const imgUrl = `/path/path/to/sample-media.jpeg`;
    await itemRef.current!.load(imgUrl);

    // 크기 조정
    itemRef.current!.w = itemRef.current!.texture.width / 2;
    itemRef.current!.h = itemRef.current!.texture.height / 2;

    width.set(itemRef.current!.w);
    height.set(itemRef.current!.h);
  };

  const umount = () => {
    if (itemRef.current) {
      itemRef.current.unmount();
    }
  };

  const recordAudio = async () => {
    const output = await window.app.invoke('record:systemAudio');
    console.log(output);
  };

  const stopRecordingAudio = async () => {
    await window.app.invoke('record:stopSystemAudio');
    console.log('done!');
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
              Record System Audio
            </Button>
            <Button variant={'outline'} onClick={stopRecordingAudio}>
              Stop Recording Audio
            </Button>
          </ButtonGroup>
          <ButtonGroup className="relative z-10">
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
                <Field>
                  <FieldLabel>Position</FieldLabel>
                  <div className={'flex gap-2'}>
                    <MotionNumberInput
                      value={x}
                      map={(v) => Number(v.toFixed(2))}
                      onChange={(v) => {
                        itemRef.current!.x = v;
                      }}
                      icon={<div className={'text-sm opacity-50'}>X</div>}
                    />
                    <MotionNumberInput
                      value={y}
                      map={(v) => Number(v.toFixed(2))}
                      onChange={(v) => {
                        itemRef.current!.y = v;
                      }}
                      icon={<div className={'text-sm opacity-50'}>Y</div>}
                    />
                  </div>
                </Field>
                <Field>
                  <FieldLabel>Rotation</FieldLabel>
                  <MotionNumberInput
                    value={rotation}
                    map={(v) => Number(v.toFixed(2))}
                    step={0.01}
                    sensitivity={0.5}
                    onChange={(v) => {
                      itemRef.current!.rotation = v;
                    }}
                    icon={<TriangleRight size={16} />}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
              <FieldLegend>Layout</FieldLegend>
              <FieldGroup>
                <Field>
                  <FieldLabel>Dimensions</FieldLabel>
                  <div className={'flex gap-2'}>
                    <Button
                      size={'icon-sm'}
                      variant={'outline'}
                      className={cn({
                        '[&_svg]:stroke-blue-500': aspectRatio !== null,
                      })}
                      onClick={() => {
                        if (aspectRatio !== null) {
                          setAspectRatio(null);
                        } else {
                          const currentAspectRatio = width.get() / height.get();
                          setAspectRatio(currentAspectRatio);
                        }
                      }}
                    >
                      <Link2 size={16} />
                    </Button>
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
                  </div>
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
              <FieldLegend>Appearance</FieldLegend>
              <FieldGroup>
                <Field>
                  <FieldLabel>Opacity</FieldLabel>
                  <MotionNumberInput
                    value={opacity}
                    map={(v) => Math.max(0, Math.min(1, Number(v.toFixed(2))))}
                    onChange={(v) => {
                      const clampedValue = Math.max(0, Math.min(1, v));
                      itemRef.current!.opacity = clampedValue;
                      opacity.set(clampedValue);
                    }}
                    icon={<div className={'text-sm opacity-50'}>%</div>}
                  />
                </Field>
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
