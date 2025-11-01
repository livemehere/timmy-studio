import { AppInfo } from '@renderer/components/AppInfo';
import { Suspense, useEffect, useState } from 'react';
import { getPublicPath } from '@timmy-studio/electron-utils/utils/renderer';
import { Tooltip } from 'radix-ui';
import { AnimatePresence, motion } from 'motion/react';

export function HomePage() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setOpen((prev) => !prev), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ padding: '20px' }}>
      <h1 className="text-4xl font-bold text-red-400">IPC Examples</h1>
      <img src={getPublicPath('/vite.svg')} alt="" />
      <section style={{ marginBottom: '20px' }}>
        <h2 className="text-2xl font-bold">Basic Invoke</h2>
        <Tooltip.Provider delayDuration={0}>
          <Tooltip.Root open={open} onOpenChange={setOpen}>
            <Tooltip.Trigger asChild>
              <div className="bg-blue-800 p-2 text-white rounded inline-block mt-2">
                App Info
              </div>
            </Tooltip.Trigger>
            <AnimatePresence>
              {open && (
                <Tooltip.Portal forceMount>
                  <Tooltip.Content side="bottom" align="start" asChild>
                    <motion.div
                      className="bg-neutral-800 p-4 rounded shadow-lg text-white"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10, scale: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Suspense fallback={<div>Loading App Info...</div>}>
                        <AppInfo />
                      </Suspense>
                    </motion.div>
                  </Tooltip.Content>
                </Tooltip.Portal>
              )}
            </AnimatePresence>
          </Tooltip.Root>
        </Tooltip.Provider>
      </section>
    </div>
  );
}
