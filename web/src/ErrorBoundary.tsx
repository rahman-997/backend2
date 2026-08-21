import { Component, type ErrorInfo, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[eventify-web] render failure", { error, componentStack: info.componentStack });
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="runtime-fatal" role="alert">
        <div>
          <span className="runtime-eyebrow">Eventify recovered safely</span>
          <h1>Something went wrong in this view.</h1>
          <p>Your account and bookings are still stored on the server. Reload the interface to continue.</p>
          <button type="button" onClick={() => window.location.reload()}>Reload Eventify</button>
        </div>
      </main>
    );
  }
}
