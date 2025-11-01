import { css } from '@emotion/react';
import { Outlet } from 'react-router';
import { Suspense } from 'react';
import { Spinner } from './UI/Spinner';
import { Docks } from './UI/Docks';
import { House, Clapperboard } from 'lucide-react';

export default function Layout() {
  return (
    <>
      <header
        className="h-9 flex items-center justify-center text-neutral-400 font-bold text-sm"
        css={css`
          app-region: drag;
        `}
      >
        Timmy Studio
      </header>
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="h-full flex items-center justify-center">
              <Spinner color="tomato" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 m-2">
          <Docks
            items={[
              {
                id: 'home',
                label: 'Home',
                icon: <House size={18} />,
                onClick: () => alert('Home clicked'),
              },
              {
                id: 'settings',
                label: 'Settings',
                icon: <Clapperboard size={18} />,
                onClick: () => alert('Settings clicked'),
              },
            ]}
          />
        </div>
      </main>
    </>
  );
}
