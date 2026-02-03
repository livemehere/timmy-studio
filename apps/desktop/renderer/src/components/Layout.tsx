import { css } from '@emotion/react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Suspense, useMemo } from 'react';
import { Docks } from './Docks';
import { createDockItems } from '@/configs/dock';
import { Spinner } from './ui/spinner';

export default function Layout() {
  const { pathname } = useLocation();

  return (
    <>
      <header
        className="h-9 flex items-center justify-center text-neutral-300 font-bold text-sm bg-black"
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
              <Spinner />
            </div>
          }
        >
          <Outlet />
        </Suspense>
        <FixedDockContainer />
      </main>
    </>
  );
}

function FixedDockContainer() {
  const navigate = useNavigate();
  //TODO: 나중에 사용자별로, 권한별로 메뉴가 달라질 예정
  const docks = useMemo(
    () =>
      createDockItems({
        navigate,
      }),
    [navigate]
  );
  return (
    <div className="fixed bottom-2 left-1/2 -translate-x-1/2 m-2">
      <Docks items={docks} />
    </div>
  );
}
