import { createContext, useRef, useContext, useEffect } from 'react';
import { Studio } from '../core/Studio';
import type { IProject } from '../types';

const StudioContext = createContext<Studio | null>(null);

export function StudioProvider({
  children,
  initialProject,
}: {
  children: React.ReactNode;
  initialProject: IProject;
}) {
  const studioRef = useRef<Studio | null>(null);

  if (!studioRef.current) {
    const studio = new Studio({ project: initialProject });
    studioRef.current = studio;
    console.log('[StudioProvider] created');
  }

  useEffect(() => {
    if (studioRef.current && studioRef.current.initialized) {
      studioRef.current.project$.next(initialProject);
      console.log('[StudioProvider] update poject');
    }
  }, [initialProject]);

  useEffect(() => {
    studioRef.current!.initialized = true;
    return () => {
      console.log(studioRef.current);
      studioRef.current?.destroy();
      studioRef.current = null;
      console.log('[StudioProvider] destroy');
    };
  }, []);

  return (
    <StudioContext.Provider value={studioRef.current}>
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio(): Studio {
  const studio = useContext(StudioContext);
  if (!studio) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return studio;
}
