import { motion } from 'motion/react';
import { useDocStore, useInteractionStore } from '../hooks/useStudioStores';
import { useEffect, useRef, useState } from 'react';
import ReactJson from 'react-json-view';

export function StudioDebugger() {
  // const value = useDocStore((state) => state.tracks);
  const value = useInteractionStore((state) => state.selectedClipIds);
  const [old, setOld] = useState<any>(undefined);
  const [fresh, setFresh] = useState<any>(value);
  const init = useRef(false);

  useEffect(() => {
    if (!init.current) {
      init.current = true;
      return;
    }
    setOld(fresh);
    setFresh(value);
  }, [value]);

  return (
    <motion.div
      drag={true}
      dragMomentum={false}
      className={
        'fixed bottom-2 right-2 z-100 bg-black/80 p-2 shadow-xl shadow-white/20 w-[600px] h-[400px] overflow-auto'
      }
    >
      {/*<pre className="text-xs text-white">{JSON.stringify(fresh, null, 2)}</pre>*/}
      <ReactJson src={fresh} theme={'chalk'} />
    </motion.div>
  );
}
