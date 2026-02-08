import { useEffect } from 'react';
import { useDevtoolsStore } from './useDevtoolsStore';
import { registrySubject, devtoolsRegistry } from './registry';
import { StoreMonitor } from './StoreMonitor';
import { Button } from '@/components/ui/button';
import { Settings2, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ZustandDevtools() {
  const { isOpen, toggle, selectedStore, setSelectedStore, stores, setStores } =
    useDevtoolsStore();

  useEffect(() => {
    setStores(
      Array.from(devtoolsRegistry.entries()).map(([name]) => ({
        name,
      }))
    );

    const subscription = registrySubject.subscribe(() => {
      setStores(
        Array.from(devtoolsRegistry.entries()).map(([name]) => ({
          name,
        }))
      );
    });

    return () => subscription.unsubscribe();
  }, [setStores]);

  return (
    <>
      <div id="zustand-devtools" className="fixed bottom-4 left-4 z-999">
        {isOpen ? (
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl w-[400px] h-[500px] flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Settings2 size={16} className="text-neutral-400" />
                <span className="text-sm font-medium text-neutral-200">
                  DevTools
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={toggle}
                className="h-6 w-6"
              >
                <X size={14} />
              </Button>
            </div>

            <div className="flex border-b border-neutral-800">
              {stores.map((entry) => (
                <button
                  key={entry.name}
                  onClick={() =>
                    setSelectedStore(
                      selectedStore === entry.name ? null : entry.name
                    )
                  }
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors',
                    selectedStore === entry.name
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                  )}
                >
                  <ChevronRight
                    size={12}
                    className={cn(
                      'transition-transform',
                      selectedStore === entry.name ? 'rotate-90' : ''
                    )}
                  />
                  {entry.name}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto p-3">
              {selectedStore && <StoreMonitor storeName={selectedStore} />}
              {!selectedStore && (
                <div className="text-center text-neutral-500 text-sm mt-8">
                  Select a store to inspect
                </div>
              )}
            </div>
          </div>
        ) : (
          <Button
            onClick={toggle}
            variant="outline"
            size="icon"
            className="rounded-full h-12 w-12 bg-neutral-900 border-neutral-700 hover:bg-neutral-800 shadow-lg"
          >
            <Settings2 size={20} className="text-neutral-400" />
          </Button>
        )}
      </div>
    </>
  );
}
