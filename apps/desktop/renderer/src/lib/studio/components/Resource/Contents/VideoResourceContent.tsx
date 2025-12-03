import { useDocAssets } from '@renderer/lib/studio/hooks';

export function VideoResourceContent() {
  const assets = useDocAssets();
  console.log('VideoResourceContent assets:', assets);

  return <div>Video Resource Content</div>;
}
