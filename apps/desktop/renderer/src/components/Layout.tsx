import { css } from '@emotion/react';
import { Outlet } from 'react-router';
import { Suspense } from 'react';
import { Spinner } from './UI/Spinner';

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
      </main>
    </>
  );
}
