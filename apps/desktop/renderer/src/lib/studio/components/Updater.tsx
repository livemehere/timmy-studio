import { useStudio } from '../contexts/StudioProvider';
import { produce } from 'immer';

export function Updater() {
  const studio = useStudio();

  return (
    <div>
      <button
        onClick={() =>
          studio.project$.next(
            produce(studio.project$.value, (draft) => {
              draft.name += '!';
            })
          )
        }
      >
        update width
      </button>
    </div>
  );
}
