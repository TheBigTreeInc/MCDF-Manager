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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);