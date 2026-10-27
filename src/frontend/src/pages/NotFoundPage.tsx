import { RecoveryResult, StartPageButton } from '../ui/RecoveryResult';

/**
 * A signed-in user opened an address that is no screen. Saying so beats
 * silently landing on another screen (ui-design.md §4).
 */
export function NotFoundPage() {
  return (
    <RecoveryResult
      icon="notFound"
      code="404"
      title="Page not found"
      text="This address does not match a screen. Check it, or go to your start page."
      action={<StartPageButton />}
    />
  );
}
