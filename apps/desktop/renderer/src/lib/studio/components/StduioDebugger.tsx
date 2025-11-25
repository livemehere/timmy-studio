import { useDocStore } from '@renderer/lib/studio/hooks';

export function StudioDebugger() {
  const settings = useDocStore((state) => state.settings);
  const updateSettings = useDocStore((state) => state.updateSettings);

  return (
    <div
      className={
        'fixed top-30 left-10 z-10 bg-black/80 p-2 shadow-xl shadow-white/20'
      }
    >
      <pre className="text-xs text-white max-h-[80vh] overflow-auto">
        {JSON.stringify(settings, null, 2)}
      </pre>
      <hr />
      <input
        type="number"
        value={settings.width}
        onChange={(e) => {
          const v = Number(e.target.value);
          updateSettings({ width: v });
        }}
      />
    </div>
  );
}
