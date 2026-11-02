import { Component } from "react";
import { signOut } from "../data/auth.js";

// Catches a crash while rendering a page and shows what went wrong, instead of leaving a blank screen.
// It clears itself when the student moves to another page (resetKey changes).
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("QueuSC crashed while rendering:", error, info.componentStack);
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  startOver = () => {
    signOut();
    window.location.hash = "#/login";
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="login">
        <div className="login-card crash">
          <h1>Something went wrong</h1>
          <p className="login-sub">
            This page stopped working. Browser extensions that change pages, such as ad blockers or translators, can cause this.
          </p>
          <pre className="crash-msg">{String(this.state.error?.message || this.state.error)}</pre>
          <div className="crash-actions">
            <button className="btn btn-primary" type="button" onClick={() => window.location.reload()}>Reload page</button>
            <button className="btn btn-ghost" type="button" onClick={this.startOver}>Sign out and start over</button>
          </div>
        </div>
      </main>
    );
  }
}
