import { Subject } from 'rxjs';

export interface DevtoolsRegistryEntry {
  store: any;
  name: string;
}

export const devtoolsRegistry = new Map<string, DevtoolsRegistryEntry>();

export const registrySubject = new Subject<string>();

export function devtools<T>(store: T, name: string): T {
  devtoolsRegistry.set(name, { store, name });
  registrySubject.next(name);
  return store;
}

export function devtoolsStore() {
  return devtoolsRegistry;
}
