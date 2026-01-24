import GUI from 'lil-gui';

export type DebugState = {
  readonly autoSave: boolean;
};
const DEBUG_LS_KEY = 'debugObj';
export const gui = new GUI({ width: 300 });

const DEFAULT_VALUES: DebugState = {
  autoSave: true,
};

const loadFromLs = (): DebugState => {
  try {
    const raw = window.localStorage.getItem(DEBUG_LS_KEY);
    if (!raw) return { ...DEFAULT_VALUES };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_VALUES };
    //@ts-ignore
    return { ...DEFAULT_VALUES, ...(parsed as Partial<DebugState>) };
  } catch {
    return { ...DEFAULT_VALUES };
  }
};

const saveToLs = (obj: DebugState) => {
  window.localStorage.setItem(DEBUG_LS_KEY, JSON.stringify(obj));
};

export const runtimeDebugObj: DebugState = loadFromLs();

Object.keys(runtimeDebugObj).forEach((key: any) => {
  gui.add(runtimeDebugObj, key).onChange(() => {
    saveToLs(runtimeDebugObj);
  });
});
