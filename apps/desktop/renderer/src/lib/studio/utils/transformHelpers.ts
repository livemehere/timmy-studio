export type JsonPrimitive = string | number | boolean | null;
export type JsonPath = Array<string | number>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Updates a nested value in an object/array structure immutably
 */
export function updateTransformAtPath(
  root: unknown,
  path: JsonPath,
  nextValue: unknown
): unknown {
  if (path.length === 0) return nextValue;

  const [head, ...rest] = path;
  const isIndex = typeof head === 'number';

  if (isIndex) {
    const arr = Array.isArray(root) ? [...root] : [];
    arr[head] = updateTransformAtPath(arr[head], rest, nextValue);
    return arr;
  }

  const obj = isPlainObject(root)
    ? { ...(root as Record<string, unknown>) }
    : {};
  (obj as any)[head] = updateTransformAtPath(
    (obj as any)[head],
    rest,
    nextValue
  );
  return obj;
}
