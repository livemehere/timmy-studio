import { useSuspenseQuery } from '@tanstack/react-query';

export default function HomePage() {
  const { data } = useSuspenseQuery({
    queryKey: ['appinfo'],
    queryFn: async () => window.app.invoke('getAppInfo'),
  });

  return (
    <div style={{ padding: '20px' }}>
      <h1>Home Page</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
