import { useStudio } from '../StudioProvider';

export function PreviewRenderer() {
  const studio = useStudio();
  console.log(studio.project$.value);
  return <div>Preview Renderer</div>;
}
