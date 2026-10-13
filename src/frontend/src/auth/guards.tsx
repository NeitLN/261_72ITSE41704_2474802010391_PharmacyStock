import { Button, Result } from 'antd';
import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { canOpen, SCREEN_PERMISSIONS } from './access';
import { useAuth } from './authContext';

/** Sends a signed-out user to the sign-in page, remembering where they were. */
export function RequireSignIn({ children }: { children: ReactNode }) {
  const { user, signedOutByUser } = useAuth();
  const location = useLocation();
  if (!user) {
    const state = signedOutByUser ? undefined : { from: location.pathname };
    return <Navigate to="/login" replace state={state} />;
  }
  return children;
}

/**
 * Shows a screen only to roles that may use it. Typing the URL of another
 * role's screen shows "no access" instead; the API would refuse its calls
 * anyway (TC-28).
 */
export function RequireScreen({ path, children }: { path: string; children: ReactNode }) {
  const { can } = useAuth();
  if (canOpen(path, can)) return children;
  return (
    <Result
      status="403"
      title="No access"
      subTitle="Your role cannot use this screen."
      extra={
        <Button type="primary">
          <Link to="/">Go to your start page</Link>
        </Button>
      }
    />
  );
}

/** The first screen the user may open, used as their start page. */
export function StartPage() {
  const { can } = useAuth();
  const first = Object.keys(SCREEN_PERMISSIONS).find((path) => canOpen(path, can));
  if (!first) {
    return <Result status="403" title="No screens" subTitle="Your role has no permissions yet. Ask the manager." />;
  }
  return <Navigate to={first} replace />;
}
