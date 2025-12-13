import { useRef, useEffect } from 'react';
import type { IProject } from '../types/types';
import { createDocStore } from '../stores/docStore';
import { createEngineStore } from '../stores/engineStore';
import { bindDocToEngine } from '../stores/bindDocToEngine';
import { StudioContext, type StudioStores } from '../hooks/useStudioStores';
import type { IAsset } from '@renderer/lib/studio/types/asset';

export function StudioProvider({
  children,
  initialProject,
}: {
  children: React.ReactNode;
  initialProject: IProject;
}) {
  const storesRef = useRef<StudioStores | null>(null);
  const unbindRef = useRef<(() => void) | null>(null);

  /** 스토어 최초 생성 */
  if (!storesRef.current) {
    const docStore = createDocStore(initialProject);
    const engineStore = createEngineStore();

    storesRef.current = {
      docStore,
      engineStore,
    };

    // Initialize engine with project
    engineStore
      .getState()
      .init(initialProject, <T extends IAsset = IAsset>(assetId: string) => {
        return docStore.getState().assets.find((a) => a.id === assetId) as
          | T
          | undefined;
      });

    // Bind doc changes to engine
    unbindRef.current = bindDocToEngine(docStore, engineStore);
  }

  // useEffect(() => {
  // TODO: 이건 지원할지 고민, initialProject 를 reactive 하게 반영할것인가?
  // if (storesRef.current) {
  //   storesRef.current.docStore.getState().loadProject(initialProject);
  //   storesRef.current.engineStore
  //     .getState()
  //     .init(initialProject, <T extends IAsset = IAsset>(assetId: string) => {
  //       return storesRef
  //         .current!.docStore.getState()
  //         .assets.find((a) => a.id === assetId) as T | undefined;
  //     });
  // }
  // }, [initialProject]);

  useEffect(() => {
    return () => {
      unbindRef.current?.();
      storesRef.current?.engineStore.getState().destroy();
    };
  }, []);

  return (
    <StudioContext.Provider value={storesRef.current}>
      {children}
    </StudioContext.Provider>
  );
}
