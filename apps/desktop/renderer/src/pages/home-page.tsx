import { css } from '@emotion/react';
import { DecorativeBox } from '@renderer/components/DecorativeBox';
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
export default function HomePage() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setOpen((prev) => !prev), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ padding: '20px' }}>
      <h1>Home Page</h1>
      <Spinner />
    </div>
  );
}

function Spinner({
  r = 40,
  color = 'white',
  size = 100,
  strokeWidth = 3,
}: {
  r?: number;
  color?: string;
  size?: number;
  strokeWidth?: number;
}) {
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
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={strokeWidth}
        fill={'transparent'}
        css={css`
          animation: spin 1.4s ease-in-out infinite;
          transform-origin: center;

          @keyframes spin {
            0% {
              stroke-dasharray: 1 ${circumference};
              stroke-dashoffset: 0;
            }
            50% {
              stroke-dasharray: ${circumference * 0.7} ${circumference};
              stroke-dashoffset: -${circumference * 0.35};
            }
            100% {
              stroke-dasharray: ${circumference * 0.7} ${circumference};
              stroke-dashoffset: -${circumference};
            }
          }
        `}
      />
    </motion.svg>
  );
}
