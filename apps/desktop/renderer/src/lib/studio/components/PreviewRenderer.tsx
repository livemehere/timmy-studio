import { useEffect } from 'react';
import { useProjectSettings } from '../hooks/useProjectSettings';

export function PreviewRenderer() {
  const settings = useProjectSettings();
  useEffect(() => {
    console.log('preview render');
  });

  return (
    <div>
      <div>settings.width: {settings.width}</div>
      <div>settings.height: {settings.height}</div>
    </div>
  );
}
