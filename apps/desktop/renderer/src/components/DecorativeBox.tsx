import { css } from '@emotion/react';

const patternCss = css`
  border: 1px solid var(--accent-color);
  background-image: repeating-linear-gradient(
    315deg,
    var(--accent-color) 0,
    var(--accent-color) var(--line-width),
    transparent 0px,
    transparent 50%
  );
  background-size: var(--pattern-size) var(--pattern-size);
  background-attachment: fixed;
`;

export function DecorativeBox({
  color = 'rgba(255, 255, 255, 0.2)',
  lineWidth = 1,
  patternSize = 10,
  children,
}: {
  color?: string;
  lineWidth?: number;
  patternSize?: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={
        {
          '--accent-color': color,
          '--line-width': `${lineWidth}px`,
          '--pattern-size': `${patternSize}px`,
        } as React.CSSProperties
      }
      css={patternCss}
    >
      {children}
    </div>
  );
}
