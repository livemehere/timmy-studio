import { createContext, useRef, useContext, useEffect } from 'react';
import { Studio } from './Studio';
import type { IProject } from './types';

const StudioContext = createContext<Studio | null>(null);

export function StudioProvider({
  children,
  project,
  onChangeProject,
}: {
  children: React.ReactNode;
  project: IProject;
  onChangeProject: (project: IProject) => void;
}) {
  const studioRef = useRef<Studio | null>(null);
  if (!studioRef.current) {
    const studio = new Studio({ project });
    studioRef.current = studio;
    studio.project$.subscribe((newProject) => {
      onChangeProject(newProject);
    });
  }

  useEffect(() => {
    return () => {
      studioRef.current?.destroy();
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
