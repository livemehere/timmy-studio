import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

const listeners = new Map<string, Set<(...args: any[]) => void>>();

// TODO: 타입 구체적으로 정의
contextBridge.exposeInMainWorld("app", {
  invoke: (channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args),

  // evet, ...args => ...args 로 첫번쨰 인자 제거
  on: (channel: string, listener: (...args: any[]) => void) => {
    const listenerSet = listeners.get(channel) || new Set();
    const wrapped = (_e: IpcRendererEvent, ...args: any[]) => listener(...args);
    listenerSet.add(wrapped);
    listeners.set(channel, listenerSet);
    ipcRenderer.on(channel, wrapped);
    return () => {
      const set = listeners.get(channel);
      if (set) {
        ipcRenderer.removeListener(channel, wrapped);
        set.delete(wrapped);
      }
    };
  },
  off: (channel: string, listener?: (...args: any[]) => void) => {
    const set = listeners.get(channel);
    if (set) {
      if (listener) {
        ipcRenderer.removeListener(channel, listener);
        set.delete(listener);
      } else {
        for (const lst of set) {
          ipcRenderer.removeListener(channel, lst);
        }
        listeners.delete(channel);
      }
    }
  },
});
