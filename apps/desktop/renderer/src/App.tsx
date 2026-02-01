import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Suspense } from 'react';
import { AppRoutes } from './routes';
import { Toaster } from './components/ui/sonner';
import { Spinner } from './components/ui/spinner';

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
      <ReactQueryDevtools initialIsOpen={false} />
      <Suspense
        fallback={
          <div className="h-full flex items-center justify-center">
            <Spinner />
          </div>
        }
      >
        <Toaster />
        <AppRoutes />
      </Suspense>
    </QueryClientProvider>
  );
}
