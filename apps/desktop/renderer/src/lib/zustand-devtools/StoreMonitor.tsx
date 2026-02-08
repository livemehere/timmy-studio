import { useEffect, useState, useRef } from 'react';
import { devtoolsRegistry } from './registry';
import equal from 'fast-deep-equal';
import { JsonTreeView } from './JsonTreeView';

interface StoreMonitorProps {
  storeName: string;
}

export function StoreMonitor({ storeName }: StoreMonitorProps) {
  const [state, setState] = useState<any>(null);
  const [highlightedKeys, setHighlightedKeys] = useState<Set<string>>(
    new Set()
  );
  const highlightedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const entry = devtoolsRegistry.get(storeName);
    if (!entry) return;

    const store = entry.store;

    setState(store.getState());

    const unsubscribe = store.subscribe((newState: any, prevState: any) => {
      const newStateFiltered = filterFunctions(newState);
      const prevStateFiltered = filterFunctions(prevState);

      const diff = findDiff(prevStateFiltered, newStateFiltered, '');

      setState(newState);

      if (diff.size > 0) {
        setHighlightedKeys(diff);

        if (highlightedTimeoutRef.current) {
          clearTimeout(highlightedTimeoutRef.current);
        }

        highlightedTimeoutRef.current = setTimeout(() => {
          setHighlightedKeys(new Set());
        }, 2000);
      }
    });

    return () => {
      unsubscribe();
      if (highlightedTimeoutRef.current) {
        clearTimeout(highlightedTimeoutRef.current);
      }
    };
  }, [storeName]);

  if (state === null) {
    return <div className="text-neutral-500 text-sm">Loading...</div>;
  }

  const filteredState = filterFunctions(state);

  return (
    <div className="font-mono text-xs">
      <JsonTreeView data={filteredState} highlightedKeys={highlightedKeys} />
    </div>
  );
}

function filterFunctions(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => filterFunctions(item));
  }

  const result: Record<string, any> = {};
  for (const key in obj) {
    if (typeof obj[key] !== 'function') {
      result[key] = filterFunctions(obj[key]);
    }
  }
  return result;
}

function findDiff(prev: any, curr: any, path: string): Set<string> {
  const diff = new Set<string>();

  function traverse(p: any, c: any, currentPath: string) {
    if (!equal(p, c)) {
      if (
        p !== null &&
        c !== null &&
        typeof p === 'object' &&
        typeof c === 'object'
      ) {
        const allKeys = new Set([...Object.keys(p), ...Object.keys(c)]);

        for (const key of allKeys) {
          const newPath = currentPath ? `${currentPath}.${key}` : key;
          traverse(p[key], c[key], newPath);
        }
      } else {
        diff.add(currentPath);
      }
    }
  }

  traverse(prev, curr, path);
  return diff;
}
