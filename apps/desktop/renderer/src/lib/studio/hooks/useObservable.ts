import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const subscription = selector
      ? observable
          .pipe(map(selector), distinctUntilChanged())
          .subscribe(setValue)
      : observable.subscribe(setValue);

    return () => subscription.unsubscribe();
  }, [observable, selector]);

  return value;
}
