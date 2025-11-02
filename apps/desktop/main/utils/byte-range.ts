export function parseRange(
  range: string
): { start?: number; end?: number } | null {
  const match = range.match(/bytes=(\d*)-(\d*)/);
  if (!match) {
    return null;
  }

  const result: { start?: number; end?: number } = {};

  // match[1]이 빈 문자열이 아닐 때만 start 설정
  if (match[1]) {
    result.start = parseInt(match[1], 10);
  }

  // match[2]가 빈 문자열이 아닐 때만 end 설정
  if (match[2]) {
    result.end = parseInt(match[2], 10);
  }

  return result;
}
