import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Suspense } from 'react';
import { AppRoutes } from './routes';
import { Spinner } from './components/Spinner';
import { ToastProvider } from './components/Toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 1000 * 60,
      refetchOnWindowFocus: false,
    },
  },
});
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ReactQueryDevtools initialIsOpen={false} />
        <Suspense
          fallback={
            <div className="h-full flex items-center justify-center">
              <Spinner />
            </div>
          }
        >
          <AppRoutes />
        </Suspense>
      </ToastProvider>
    </QueryClientProvider>
  );
}
