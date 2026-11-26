import { Button } from 'antd';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RecoveryResult } from './RecoveryResult';

interface State {
  failed: boolean;
}

/**
 * Catches an error thrown while a screen renders, so one broken screen shows
 * a recovery message instead of unmounting the whole app (and the menu with
 * it). The layout keys it by path, so moving to another screen starts fresh.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <RecoveryResult
        icon="notFound"
        title="This screen stopped working"
        text="The rest of the app still works. Open the screen again; anything not yet saved on this screen has to be entered again. If it keeps happening, tell the administrator what you did just before."
        action={
          <Button type="primary" onClick={() => this.setState({ failed: false })}>
            Open the screen again
          </Button>
        }
      />
    );
  }
}
