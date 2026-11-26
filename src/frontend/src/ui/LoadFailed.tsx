import { Alert, Button } from 'antd';
import type { ApiError } from '../api/errors';

/**
 * Shown in place of a list that could not be loaded, so an empty list is
 * never read as "nothing to do" (a safety screen showing no expired batch
 * because the request failed).
 */
export function LoadFailed({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <Alert
      type="error"
      showIcon
      title="This list could not be loaded, so it may not be empty."
      description={error.message}
      action={
        onRetry && (
          <Button size="small" onClick={onRetry}>
            Try again
          </Button>
        )
      }
      style={{ marginBottom: 16 }}
    />
  );
}
