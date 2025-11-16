import { css } from '@emotion/react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Suspense } from 'react';
import { Spinner } from './UI/Spinner';
import { Docks } from './UI/Docks';
import { createDockItems } from '@renderer/configs/dock';

export default function Layout() {
  const navigate = useNavigate();
  const docks = createDockItems({
    navigate,
  });
  const { pathname } = useLocation();

  return (
    <>
      <header
        className="h-9 flex items-center justify-center text-neutral-400 font-bold text-sm"
        css={css`
          app-region: drag;
        `}
      >
        Timmy Studio {import.meta.env.DEV && `(${pathname})`}
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
          <Docks items={docks} />
        </div>
      </main>
    </>
  );
}
