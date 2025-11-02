import { lazy } from 'react';
import { createHashRouter, RouterProvider } from 'react-router';
import ErrorPage from './pages/error';

const Layout = lazy(() => import('@renderer/components/Layout'));
const HomePage = lazy(() => import('@renderer/pages'));
const VideoPlayerPage = lazy(() => import('@renderer/pages/video-player'));
const VideoEditorPage = lazy(() => import('@renderer/pages/video-editor'));
const SettingsPage = lazy(() => import('@renderer/pages/settings'));

const router = createHashRouter([
  {
    path: '/',
    errorElement: <ErrorPage />,
    children: [
      {
        element: <Layout />,
        children: [
          {
            index: true,
            element: <HomePage />,
          },
          {
            path: 'video-player',
            element: <VideoPlayerPage />,
          },
          {
            path: 'video-editor',
            element: <VideoEditorPage />,
          },
          {
            path: 'settings',
            element: <SettingsPage />,
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
