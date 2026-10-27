import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { RecoveryResult, StartPageButton } from '../ui/RecoveryResult';
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
    <RecoveryResult
      icon="lock"
      code="403"
      title="No access"
      text="Your role cannot use this screen. Ask the manager if you need access."
      action={<StartPageButton />}
    />
  );
}

/** The first screen the user may open, used as their start page. */
export function StartPage() {
  const { can } = useAuth();
  const first = Object.keys(SCREEN_PERMISSIONS).find((path) => canOpen(path, can));
  if (!first) {
    // No button: the start page is this screen, so it would only loop.
    return (
      <RecoveryResult
        icon="noScreens"
        title="No screens yet"
        text="Your role has no permissions yet. Ask the manager."
      />
    );
  }
  return <Navigate to={first} replace />;
}
