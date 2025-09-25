// src/main.jsx
import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes/router";
import "./index.css";
import { ToastProvider } from "./ui/Toast";

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
      gcTime: 10 * 60_000,
    },
    mutations: { retry: 0 },
  },
});

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm z-[9998]">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-950/70 px-5 py-3 shadow-xl">
        <span className="h-2 w-2 animate-ping rounded-full bg-sky-500" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Loading app…
        </span>
      </div>
    </div>
  );
}

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md w-[92vw] rounded-2xl border border-rose-200/50 dark:border-rose-500/30 bg-white dark:bg-slate-900 p-6 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="text-rose-600 dark:text-rose-400 mt-0.5">
              <svg viewBox="0 0 24 24" className="h-5 w-5">
                <path
                  fill="currentColor"
                  d="M11 15h2V7h-2zm1-13a10 10 0 1 0 0 20a10 10 0 0 0 0-20m-1 16h2v-2h-2z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Something went wrong
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 break-words">
                {String(error?.message || error)}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => location.reload()}
                  className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  Reload
                </button>
                <button
                  onClick={() => this.setState({ error: null })}
                  className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
          <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-slate-950/90 p-3 text-xs text-slate-100">
            {error?.stack || ""}
          </pre>
        </div>
      </div>
    );
  }
}

async function enableMocks() {
  if (import.meta.env.DEV) {
    try {
      const { worker } = await import("./mocks/browser");
      await worker.start({ onUnhandledRequest: "bypass" });
      console.info("[MSW] Mock service worker running.");
    } catch (e) {
      console.warn("[MSW] Failed to start:", e);
    }
  }
}

// Optional: sync dark mode class on first paint (if you use media/system preference)
(function syncDarkClass() {
  try {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", isDark);
  } catch {}
})();

enableMocks().finally(() => {
  const mount = document.getElementById("root");
  if (!mount) throw new Error("#root not found");
  const root = createRoot(mount);

  const AppTree = (
    <QueryClientProvider client={qc}>
      <ToastProvider position="top-right" defaultDuration={3200} max={4}>
        <Suspense fallback={<LoadingOverlay />}>
          <RouterProvider router={router} />
        </Suspense>
      </ToastProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />}
    </QueryClientProvider>
  );

  // StrictMode in dev only (avoids double effects confusion in some libs)
  if (import.meta.env.DEV) {
    root.render(
      <React.StrictMode>
        <RootErrorBoundary>{AppTree}</RootErrorBoundary>
      </React.StrictMode>
    );
  } else {
    root.render(<RootErrorBoundary>{AppTree}</RootErrorBoundary>);
  }
});
