import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize React Query
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const blockedFunctionKeys = new Set([
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "F9",
  "F10",
  "F11",
  "F12",
]);

function blockBrowserFunctionKeyShortcuts(event: KeyboardEvent) {
  if (!blockedFunctionKeys.has(event.key)) return;
  if (event.altKey || event.metaKey) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

window.addEventListener("keydown", blockBrowserFunctionKeyShortcuts, { capture: true });
window.addEventListener("keyup", blockBrowserFunctionKeyShortcuts, { capture: true });

type RootErrorBoundaryState = {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
};

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  RootErrorBoundaryState
> {
  state: RootErrorBoundaryState = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("MCDF Manager UI render failed", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  resetClientState = () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error("Failed to clear MCDF Manager browser state", error);
    }
    window.location.reload();
  };

  reload = () => window.location.reload();

  render() {
    const { error, errorInfo } = this.state;
    if (!error) return this.props.children;
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100vw",
          boxSizing: "border-box",
          padding: "32px",
          background:
            "radial-gradient(circle at top left, rgba(167, 99, 255, 0.25), transparent 36%), #100817",
          color: "#f6eefe",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          overflow: "auto",
        }}
      >
        <div
          style={{
            maxWidth: "920px",
            margin: "8vh auto",
            border: "1px solid rgba(255, 217, 255, 0.2)",
            borderRadius: "24px",
            padding: "28px",
            background: "rgba(24, 14, 34, 0.92)",
            boxShadow: "0 24px 80px rgba(0, 0, 0, 0.45)",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "#f4a7ff",
              fontSize: "12px",
            }}
          >
            MCDF Manager recovery
          </p>
          <h1 style={{ margin: "0 0 12px", fontSize: "28px" }}>
            The Library view could not render safely.
          </h1>
          <p style={{ color: "#d8c9e6", lineHeight: 1.6 }}>
            This is usually caused by older or malformed Library state in the
            embedded browser profile. The app can clear that browser state and
            reload without deleting MCDF files from disk or changing the registry.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "20px" }}>
            <button
              onClick={this.resetClientState}
              style={{
                border: "1px solid rgba(244, 167, 255, 0.55)",
                background: "linear-gradient(135deg, #b651ff, #f36bd8)",
                color: "white",
                borderRadius: "999px",
                padding: "10px 16px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Reset browser state and reload
            </button>
            <button
              onClick={this.reload}
              style={{
                border: "1px solid rgba(255, 255, 255, 0.22)",
                background: "rgba(255, 255, 255, 0.08)",
                color: "#f6eefe",
                borderRadius: "999px",
                padding: "10px 16px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Reload only
            </button>
          </div>
          <details style={{ marginTop: "24px", color: "#cab6da" }}>
            <summary style={{ cursor: "pointer" }}>Technical details</summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                overflow: "auto",
                maxHeight: "320px",
                marginTop: "12px",
                padding: "16px",
                borderRadius: "14px",
                background: "rgba(0, 0, 0, 0.28)",
                color: "#ffe9ff",
              }}
            >
              {String(error?.stack || error?.message || error)}
              {"\n\n"}
              {errorInfo?.componentStack || ""}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const root = document.getElementById("root");
if (!root) throw new Error("MCDF Manager root element was not found.");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </RootErrorBoundary>
  </React.StrictMode>,
);
