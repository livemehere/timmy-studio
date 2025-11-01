import { css } from '@emotion/react';
import { Outlet } from 'react-router';
import { DecorativeBox } from './DecorativeBox';

export default function Layout() {
  return (
    <>
      <header
        className="h-9"
        css={css`
          app-region: drag;
        `}
      >
        <DecorativeBox />
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
