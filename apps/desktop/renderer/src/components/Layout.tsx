import { css } from '@emotion/react';
import { Outlet } from 'react-router';
import { patterns } from '@renderer/utils/svg-patterns';

export default function Layout() {
  return (
    <>
      <header
        className="h-[64px]"
        css={css`
          background-image: url('${patterns.grid('#9C92AC', 0.4)}');
        `}
      >
        header
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
