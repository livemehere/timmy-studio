import { AppInfo } from '@renderer/components/AppInfo';
import { Suspense } from 'react';
import { getPublicPath } from '@timmy-studio/electron-utils/utils/renderer';

export function HomePage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1 className="text-4xl font-bold text-red-400">IPC Examples</h1>
      <img src={getPublicPath('/vite.svg')} alt="" />
      <section style={{ marginBottom: '20px' }}>
        <h2 className="text-2xl font-bold">Basic Invoke</h2>
        <Suspense fallback={<div>Loading App Info...</div>}>
          <AppInfo />
        </Suspense>
      </section>
    </div>
  );
}
