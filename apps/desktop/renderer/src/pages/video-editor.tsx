import { StudioProvider } from '@/lib/studio/providers/StudioProvider';
import { StudioApp } from '@/lib/studio/components';
import type { IProject } from '@/lib/studio/types/project';
import { AssetUpdater } from '@/lib/studio/Effects/AssetUpdater';
import { AutoSave } from '@/lib/studio/Effects/AutoSave';
import { DEFAULT_PROJECT } from '@/lib/studio/constants/defaultValues';
import { useMemo } from 'react';
import { toast } from 'sonner';

// let autoSaved: IProject | null = null;
// console.log('load');
// try {
//   const autoSavedStr = window.localStorage.getItem('autosave-doc');
//   if (!autoSavedStr) throw new Error('No autosave data');
//   autoSaved = JSON.parse(autoSavedStr) as IProject;
//   toast.success('Auto-saved project loaded');
// } catch (e) {
//   autoSaved = null;
// }
// const initialProject = autoSaved || DEFAULT_PROJECT;

export default function VideoEditorPage() {
  const initialProject = useMemo(() => {
    let autoSaved: IProject | null = null;
    console.log('load');
    try {
      const autoSavedStr = window.localStorage.getItem('autosave-doc');
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
      <AutoSave saveKey="autosave-doc" />
      <StudioApp />
    </StudioProvider>
  );
}
