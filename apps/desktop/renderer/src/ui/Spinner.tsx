import { motion } from 'motion/react';

export function Spinner({
  color = 'white',
  size = 36,
  strokeWidth = 4,
}: {
  color?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <motion.svg
      width={size}
      height={size}
      animate={{
        rotate: 360,
        transition: {
          repeat: Infinity,
          ease: 'linear',
          duration: 2,
        },
      }}
    >
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} />
          <stop offset="50%" stopColor={color} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={'url(#grad1)'}
        filter={'url(#glow)'}
        strokeWidth={strokeWidth}
        fill={'transparent'}
        animate={{
          strokeDasharray: [
            `1 ${circumference}`,
            `${circumference * 0.7} ${circumference}`,
            `${circumference * 0.7} ${circumference}`,
          ],
          strokeDashoffset: [0, -circumference * 0.35, -circumference],
        }}
        transition={{
          duration: 1.4,
          ease: 'easeInOut',
          repeat: Infinity,
          times: [0, 0.5, 1],
        }}
      />
    </motion.svg>
  );
}
