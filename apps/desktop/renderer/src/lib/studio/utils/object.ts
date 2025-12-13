export function filterMethods<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (typeof obj[key] !== 'function') {
      result[key] = obj[key];
    }
  }
  return result;
}
