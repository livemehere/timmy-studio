import { parseRange } from '@main/utils/byte-range';

describe('parseRange() 함수', () => {
  test('start-end 를 정확히 파싱한다.', () => {
    const rangeHeader = 'bytes=200-1000';
    const match = parseRange(rangeHeader);
    expect(match).not.toBeNull();
    if (match) {
      const { start, end } = match;
      expect(start).toBe(200);
      expect(end).toBe(1000);
    }
  });

  test('start 만 있는 경우를 파싱한다.', () => {
    const rangeHeader = 'bytes=200-';
    const match = parseRange(rangeHeader);
    expect(match).not.toBeNull();
    if (match) {
      const { start, end } = match;
      expect(start).toBe(200);
      expect(end).toBe(0);
    }
  });

  test('end 만 있는 경우를 파싱한다.', () => {
    const rangeHeader = 'bytes=-1000';
    const match = parseRange(rangeHeader);
    expect(match).not.toBeNull();
    if (match) {
      const { start, end } = match;
      expect(start).toBe(0);
      expect(end).toBe(1000);
    }
  });

  test('잘못된 형식의 Range 헤더를 처리한다.', () => {
    const rangeHeader = 'bytes=abc-def';
    const match = parseRange(rangeHeader);
    expect(match).toBeNull();
  });
});
