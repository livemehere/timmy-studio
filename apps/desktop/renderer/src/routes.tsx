import { lazy } from 'react';
import { createHashRouter, RouterProvider } from 'react-router';

const Layout = lazy(() => import('@renderer/components/Layout'));
const HomePage = lazy(() => import('@renderer/pages/HomePage'));
const SettingsPage = lazy(() => import('@renderer/pages/SettingsPage'));
const VideoEditorPage = lazy(() => import('@renderer/pages/VideoEditor'));

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
          {
            path: 'settings',
            element: <SettingsPage />,
          },
          {
            path: 'video-editor',
            element: <VideoEditorPage />,
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
