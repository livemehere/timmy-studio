import { lazy } from 'react';
import { createHashRouter, RouterProvider } from 'react-router';

const Layout = lazy(() => import('@renderer/components/Layout'));
const HomePage = lazy(() => import('@renderer/pages/home-page'));

const router = createHashRouter([
  {
    path: '/',
    children: [
      {
        element: <Layout />,
        children: [
          {
            index: true,
            element: <HomePage />,
          },
        ],
      },

      /** 아예 독립적인 서브 라우트 */
      {
        path: 'sub',
        children: [
          {
            path: 'sample',
            element: <div>Sub Sample Page</div>,
          },
        ],
      },
    ],
  },
]);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}
