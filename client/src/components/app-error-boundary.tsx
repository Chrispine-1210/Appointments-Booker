import { Component, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="public-container public-page">
          <div role="alert" className="empty-state">
            <AlertCircle size={32} />
            <h1>Let's get you back to your day.</h1>
            <p>
              This page couldn't open correctly. Reload the latest version to
              continue.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload BookingPro
            </button>
          </div>
        </main>
      );
    return this.props.children;
  }
}
