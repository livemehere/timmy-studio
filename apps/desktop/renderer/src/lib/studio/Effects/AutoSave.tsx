import { useEffect } from 'react';
import { toast } from 'sonner';
import { useStudioStores } from '@/lib/studio/hooks/useStudioStores';

export function AutoSave({ saveKey }: { saveKey: string }) {
  const { docStore } = useStudioStores();

  useEffect(() => {
    const save = () => {
      localStorage.setItem(
        saveKey,
        JSON.stringify(docStore.getState().getProject())
      );
      toast.info('Auto-saved');
    };

    return docStore.subscribe(save);
  }, [docStore, saveKey]);

  return null;
}
