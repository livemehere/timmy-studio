import { useStudio } from '../StudioProvider';
import { produce } from 'immer';

export function Updater() {
  const studio = useStudio();

  return (
    <div>
      <button
        onClick={() =>
          studio.project$.next(
            produce(studio.project$.value, (draft) => {
              draft.settings.width += 100;
            })
          )
        }
      >
        update width
      </button>
    </div>
  );
}
