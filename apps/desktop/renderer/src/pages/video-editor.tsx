import { StudioProvider } from '@/lib/studio/providers/StudioProvider';
import { StudioApp } from '@/lib/studio/components';
import type { IProject } from '@/lib/studio/types/project';
import { AssetUpdater } from '@/lib/studio/Effects/AssetUpdater';
import { AutoSave } from '@/lib/studio/Effects/AutoSave';
import { DEFAULT_PROJECT } from '@/lib/studio/constants/defaultValues';
import { useMemo } from 'react';
import { toast } from 'sonner';

const AUTO_SAVE_KEY = 'autosave-doc';

export default function VideoEditorPage() {
  // TODO: audo save 데이터가 없다면, 새로운 프로젝트 생성 dialog 띄우기
  const initialProject = useMemo(() => {
    let autoSaved: IProject | null = null;
    try {
      const autoSavedStr = window.localStorage.getItem(AUTO_SAVE_KEY);
      if (!autoSavedStr) throw new Error('No autosave data');
      autoSaved = JSON.parse(autoSavedStr) as IProject;
      toast.success('Auto-saved project loaded');
    } catch (e) {
      autoSaved = null;
    }
    return autoSaved || DEFAULT_PROJECT;
  }, []);

  return (
    <StudioProvider initialProject={initialProject}>
      <AssetUpdater />
      <AutoSave saveKey={AUTO_SAVE_KEY} />
      <StudioApp />
    </StudioProvider>
  );
}
