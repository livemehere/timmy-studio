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
  const { duration } = useDocSettings();

  return (
    <div className={'w-full h-[20px] select-none '}>
      <div
        className={'h-full border-t-orange-400/30 border-t'}
        style={{
          marginLeft: leftPadding,
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
    </div>
  );
}
