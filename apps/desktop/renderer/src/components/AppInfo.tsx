import { useSuspenseQuery } from '@tanstack/react-query';

export function AppInfo() {
  const { data } = useSuspenseQuery({
    queryKey: ['getAppInfo'],
    queryFn: () => window.app.invoke('app:getInfo'),
  });

  return (
    <div>
      <div>AppInfo</div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
