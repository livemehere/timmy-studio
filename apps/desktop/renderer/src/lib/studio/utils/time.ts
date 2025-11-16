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
