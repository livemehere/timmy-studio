export const msToSec = (ms: number, fixed?: number): number => {
  const sec = ms / 1000;
  if (typeof fixed === 'number' && Number.isFinite(fixed)) {
    return parseFloat(sec.toFixed(Math.max(0, Math.trunc(fixed))));
  }
  return sec;
};

export const secToMs = (sec: number): number => {
  return sec * 1000;
};

export type TimeFormatStyle = 'full' | 'short' | 'compact';

export interface FormatTimeOptions {
  /**
   * 포맷 스타일
   * - 'full': HH:MM:SS.cs (센티초 포함, 기본값)
   * - 'short': MM:SS (분:초)
   * - 'compact': M:SS 또는 MM:SS (1시간 미만일 때 앞 0 생략)
   */
  style?: TimeFormatStyle;
  /**
   * 입력 단위
   * - 'ms': 밀리초 (기본값)
   * - 'sec': 초
   */
  unit?: 'ms' | 'sec';
}

/**
 * 시간을 포맷팅합니다.
 * @param time 시간 값
 * @param options 포맷 옵션
 * @returns 포맷된 시간 문자열
 *
 * @example
 * formatTime(65000) // "00:01:05.00" (기본: full, ms)
 * formatTime(65000, { style: 'short' }) // "01:05"
 * formatTime(65, { style: 'short', unit: 'sec' }) // "01:05"
 * formatTime(65000, { style: 'compact' }) // "1:05"
 */
export const formatTime = (
  time: number,
  options: FormatTimeOptions = {}
): string => {
  const { style = 'full', unit = 'ms' } = options;

  const totalMs = unit === 'sec' ? time * 1000 : time;
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad2 = (n: number) => String(n).padStart(2, '0');

  switch (style) {
    case 'full': {
      const centiseconds = Math.floor((totalMs % 1000) / 10);
      return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}.${pad2(centiseconds)}`;
    }
    case 'short':
      return `${pad2(minutes)}:${pad2(seconds)}`;
    case 'compact':
      return `${minutes}:${pad2(seconds)}`;
    default:
      return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  }
};
