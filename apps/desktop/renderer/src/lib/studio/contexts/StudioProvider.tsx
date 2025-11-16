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
  const studioRef = useRef<Studio>(null as unknown as Studio);
  const initRef = useRef<boolean>(false);

  if (!studioRef.current) {
    studioRef.current = new Studio(initialProject);
  }

  useEffect(() => {
    /** Skip the first render */
    if (!initRef.current) {
      initRef.current = true;
      return;
    }

    studioRef.current.updateProject(initialProject);
  }, [initialProject]);

  useEffect(() => {
    return () => {
      studioRef.current.destroy();
      studioRef.current = null as unknown as Studio;
      initRef.current = false;
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
