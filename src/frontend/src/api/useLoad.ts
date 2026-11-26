import { App } from 'antd';
import { useEffect, useState } from 'react';
import { type ApiError, toApiError } from './errors';

/**
 * Loads data for a screen and reloads it whenever `fetcher` changes. Wrap the
 * fetcher in `useCallback` with the values it depends on (search text,
 * filters), so a new search triggers a new load. A failure shows the API
 * message and the data becomes `fallback`, never the previous query's rows.
 * `error` is then set, so the screen can say the load failed instead of
 * showing an empty list as if there were nothing to do.
 *
 * `loading` is derived from whether the result belongs to the current
 * fetcher, so no state is set synchronously inside the effect.
 */
export function useLoad<T>(fetcher: () => Promise<T>, fallback: T) {
  const { message } = App.useApp();
  const [version, setVersion] = useState(0);
  // A quiet reload (a timer refresh) keeps the rows on screen without a spinner.
  const [quiet, setQuiet] = useState(false);
  const [result, setResult] = useState<{
    fetcher: () => Promise<T>;
    version: number;
    data: T;
    error: ApiError | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetcher().then(
      (data) => {
        if (!cancelled) setResult({ fetcher, version, data, error: null });
      },
      (error: unknown) => {
        if (cancelled) return;
        const apiError = toApiError(error);
        // Several loads fail together when the server is down; one message is enough (#256).
        message.error({
          content: apiError.message,
          key: apiError.code === 'NETWORK' ? 'network' : undefined,
        });
        // Never show the previous query's rows as if they answered this one.
        setResult({ fetcher, version, data: undefined as T, error: apiError });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [fetcher, version, message]);

  const current = result?.fetcher === fetcher && result.version === version;
  return {
    data: result?.data ?? fallback,
    loading: !current && !(quiet && result !== null && result.fetcher === fetcher),
    error: current ? result.error : null,
    reload: () => {
      setQuiet(false);
      setVersion((v) => v + 1);
    },
    /** Reloads without a spinner, keeping the rows on screen (a timer refresh). */
    refreshQuietly: () => {
      setQuiet(true);
      setVersion((v) => v + 1);
    },
  };
}
