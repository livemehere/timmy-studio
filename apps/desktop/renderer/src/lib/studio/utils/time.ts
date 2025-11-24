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

export const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
    2,
    '0'
  )}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
};
