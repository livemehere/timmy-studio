import { useRouteError } from 'react-router';
import { useEffect } from 'react';
import { logger } from '@renderer/utils/logger';

export default function ErrorPage() {
  const error = useRouteError();
  useEffect(() => {
    logger.error('[ErrorPage]', error);
  }, [error]);
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="border border-neutral-700 rounded-lg bg-neutral-900/40 p-4 max-w-[80vw] max-h-[800px] overflow-auto">
        <h1 className="text-xl font-bold mb-4 text-red-500">Error Occurred</h1>
        <pre className="whitespace-pre-wrap">{String(error)}</pre>
      </div>
      <div className="mt-4">
        <button onClick={() => window.location.reload()}>Reload</button>
      </div>
    </div>
  );
}
