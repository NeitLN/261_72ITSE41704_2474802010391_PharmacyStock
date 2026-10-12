import { App } from 'antd';
import { useEffect, useState } from 'react';
import { toApiError } from './errors';

/**
 * Loads data for a screen and reloads it whenever `fetcher` changes. Wrap the
 * fetcher in `useCallback` with the values it depends on (search text,
 * filters), so a new search triggers a new load. A failure shows the API
 * message and the data becomes `fallback`, never the previous query's rows.
 *
 * `loading` is derived from whether the result belongs to the current
 * fetcher, so no state is set synchronously inside the effect.
 */
export function useLoad<T>(fetcher: () => Promise<T>, fallback: T) {
  const { message } = App.useApp();
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    fetcher: () => Promise<T>;
    version: number;
    data: T;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetcher().then(
      (data) => {
        if (!cancelled) setResult({ fetcher, version, data });
      },
      (error: unknown) => {
        if (cancelled) return;
        message.error(toApiError(error).message);
        // Never show the previous query's rows as if they answered this one.
        setResult({ fetcher, version, data: undefined as T });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [fetcher, version, message]);

  return {
    data: result?.data ?? fallback,
    loading: result?.fetcher !== fetcher || result.version !== version,
    reload: () => setVersion((v) => v + 1),
  };
}
