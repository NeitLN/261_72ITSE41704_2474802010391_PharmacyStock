import { useEffect, useState } from 'react';
import { apiClient } from './client';

/** The server's business date and when it was read; kept for a few minutes. */
let known: { today: string; readAt: number } | null = null;
const FRESH_MS = 5 * 60 * 1000;

function browserToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

/**
 * Today's business date, `YYYY-MM-DD`, as the server's `Clock` has it (#255,
 * DEC-01), so a form defaults to the date the API will validate against even
 * when the PC's clock is wrong or the server runs a demo date. Until the
 * server answers, and if it cannot be reached, the browser's date in
 * Asia/Ho_Chi_Minh stands in; the form's own request then reports the error.
 */
export function useBusinessToday(): string {
  const [today, setToday] = useState(() => known?.today ?? browserToday());

  useEffect(() => {
    if (known && Date.now() - known.readAt < FRESH_MS) return;
    let cancelled = false;
    apiClient.get<{ today: string }>('/clock').then(
      ({ data }) => {
        known = { today: data.today, readAt: Date.now() };
        if (!cancelled) setToday(data.today);
      },
      () => {
        // Keep the browser's date; see above.
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return today;
}
