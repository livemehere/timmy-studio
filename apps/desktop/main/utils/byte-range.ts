export function parseRange(
  range: string
): { start: number; end: number } | null {
  const match = range.match(/bytes=(\d*)-(\d*)/);
  if (!match) {
    return null;
  }

  let start = parseInt(match[1], 10);
  let end = parseInt(match[2], 10);

  if (isNaN(start)) {
    start = 0;
  }
  if (isNaN(end)) {
    end = 0;
  }

  return { start, end };
}
