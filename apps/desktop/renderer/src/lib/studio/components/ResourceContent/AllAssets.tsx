import { useDocAssets } from '@renderer/lib/studio/hooks';
import { Assets } from './Assets';

export function AllAssets() {
  const assets = useDocAssets();
  return <Assets assets={assets} emptyMessage="No assets" />;
}
