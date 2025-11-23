import { useEffect, useEffectEvent, useState } from 'react';
import { Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';

export function useObservable<T>(observable: Observable<T>, initialValue: T): T;
export function useObservable<T, R>(
  observable: Observable<T>,
  initialValue: R,
  selector: (value: T) => R
): R;

export function useObservable<T, R = T>(
  observable: Observable<T>,
  initialValue: T | R,
  selector?: (value: T) => R
): T | R {
  const [value, setValue] = useState<T | R>(initialValue);
  const memoizedSelector = useEffectEvent(
    selector ?? ((v: T) => v as unknown as R)
  );

  useEffect(() => {
    const subscription = selector
      ? observable
          .pipe(map(memoizedSelector), distinctUntilChanged())
          .subscribe(setValue)
      : observable.subscribe(setValue);

    return () => subscription.unsubscribe();
  }, [observable]);

  return value;
}
