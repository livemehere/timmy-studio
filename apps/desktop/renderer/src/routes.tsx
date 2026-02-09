import { lazy } from 'react';
import { createHashRouter, RouterProvider } from 'react-router';
import ErrorPage from './pages/error';

const Layout = lazy(() => import('@/components/Layout'));
const HomePage = lazy(() => import('@/pages'));
const VideoPlayerPage = lazy(() => import('@/pages/video-player'));
const VideoEditorPage = lazy(() => import('@/pages/video-editor'));
const SettingsPage = lazy(() => import('@/pages/settings'));
const PixiPlaygroundPage = lazy(() => import('@/pages/pixi-playground'));
const TestPage = lazy(() => import('@/pages/test-page'));

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
            path: 'pixi-playground',
            element: <PixiPlaygroundPage />,
          },
          {
            path: 'settings',
            element: <SettingsPage />,
          },
          {
            path: 'test',
            element: <TestPage />,
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
