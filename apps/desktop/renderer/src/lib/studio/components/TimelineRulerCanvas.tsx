import { useEffect, useState } from 'react';
import { useDocSettings, useEngineTimer } from '../hooks';
import { motion, type MotionValue, useMotionValueEvent } from 'motion/react';

export function TimelineRulerCanvas({
  scrollXMotionValue,
  leftPadding,
}: {
  scrollXMotionValue: MotionValue<number>;
  leftPadding: number;
}) {
  const settings = useDocSettings();
  const timer = useEngineTimer();
  const [currentMs, setCurrentMs] = useState(0);
  useEffect(() => {
    if (!timer) return;

    return timer.subscribe(({ currentMs }) => {
      setCurrentMs(currentMs);
    });
  }, [timer]);

  return (
    <div
      className={'w-full h-[12px] select-none'}
      style={{
        paddingLeft: leftPadding,
      }}
    >
      <motion.div
        style={{
          left: scrollXMotionValue,
        }}
        className={'w-1 bg-red-500 h-full relative'}
      ></motion.div>
      {/*<input*/}
      {/*  className="w-full"*/}
      {/*  type="range"*/}
      {/*  value={currentMs}*/}
      {/*  onChange={(e) => {*/}
      {/*    const v = Number(e.target.value);*/}
      {/*    timer?.seek(v);*/}
      {/*  }}*/}
      {/*  min={0}*/}
      {/*  step={100}*/}
      {/*  max={settings.duration}*/}
      {/*/>*/}
    </div>
  );
}
