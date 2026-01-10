export function Spacer({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return <div style={{ width: x, height: y }} />;
}
