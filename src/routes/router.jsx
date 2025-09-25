// src/routes/router.jsx
import React, { Suspense, lazy, useEffect, useState } from "react";
import {
  createBrowserRouter,
  Outlet,
  NavLink,
  ScrollRestoration,
  Link,
} from "react-router-dom";

const JobsBoard = lazy(() => import("../pages/jobs/JobsBoard"));
const JobDetail = lazy(() => import("../pages/jobs/JobDetail"));
const Candidates = lazy(() => import("../pages/candidates/Candidates"));
const CandidateProfile = lazy(() => import("../pages/candidates/CandidateProfile"));
const Kanban = lazy(() => import("../pages/candidates/Kanban"));
const AssessmentBuilder = lazy(() => import("../pages/assessments/AssessmentBuilder"));
const AssessmentPreview = lazy(() => import("../pages/assessments/AssessmentPreview"));
const AssessmentRun = lazy(() => import("../pages/assessments/AssessmentRun"));

const cx = (...arr) => arr.filter(Boolean).join(" ");

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "system");
  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const applied = theme === "system" ? (systemDark ? "dark" : "light") : theme;
    root.dataset.theme = applied;
    localStorage.setItem("theme", theme);
  }, [theme]);
  return { theme, setTheme };
}

function RootLayout() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white text-gray-900 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/70 backdrop-blur-md dark:bg-slate-900/70">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-6">
          <NavLink to="/" className="inline-flex items-center gap-2 font-semibold tracking-tight text-indigo-700 dark:text-indigo-300">
            <span className="h-6 w-6 rounded bg-gradient-to-br from-indigo-500 to-violet-500 shadow ring-1 ring-black/5" />
            TalentFlow
          </NavLink>
          <nav aria-label="Primary" className="flex gap-1 text-sm">
            {[
              { to: "/jobs", label: "Jobs" },
              { to: "/candidates", label: "Candidates" },
              { to: "/kanban", label: "Kanban" },
            ].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cx(
                    "px-3 py-1.5 rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60",
                    isActive
                      ? "bg-indigo-600 text-white shadow hover:bg-indigo-600"
                      : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-white"
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:block text-xs text-gray-500 dark:text-slate-400">
              Local-first · MSW + IndexedDB
            </span>
           
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Suspense fallback={<div className="text-sm text-gray-600 dark:text-slate-300">Loading…</div>}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="mt-auto border-t border-black/5 bg-white/60 backdrop-blur dark:bg-slate-900/60">
        <div className="mx-auto max-w-7xl px-4 py-6 text-xs text-gray-500 dark:text-slate-400 flex items-center justify-between">
          <span>© {new Date().getFullYear()} TalentFlow</span>
          <span className="hidden sm:inline">React • Vite • Tailwind • TanStack Query • MSW • Dexie</span>
        </div>
      </footer>
      <ScrollRestoration />
    </div>
  );
}

function Landing() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_10px_30px_-10px_rgba(31,41,55,.25)] dark:bg-slate-900/70 dark:border-white/10">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
      </div>
      <div className="px-6 py-12 md:px-12 md:py-16 grid gap-10 md:gap-12 lg:grid-cols-[1.2fr_1fr] items-center">
        <div className="space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-700 shadow-sm dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-400/30">
            Local-first • Mock API • Pro UI
          </span>
          <h1 className="text-3xl/tight sm:text-4xl/tight lg:text-5xl/tight font-semibold text-slate-900 dark:text-white">
            Hire faster with a polished, accessible, local-first workflow.
          </h1>
          <p className="max-w-prose text-sm sm:text-base text-slate-600 dark:text-slate-300">
            Manage jobs, candidates, and assessments with drag-and-drop, virtualization, and live previews. No backend required—powered by MSW and IndexedDB.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/jobs"
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
            >
              Go to Jobs
            </Link>
            <Link
              to="/kanban"
              className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:bg-transparent dark:text-indigo-300 dark:ring-indigo-400/40 dark:hover:bg-slate-800/60"
            >
              Open Kanban
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
            {[
              { k: "Jobs", v: "25+" },
              { k: "Candidates", v: "1,000+" },
              { k: "Latency", v: "200–1200ms" },
              { k: "Error rate", v: "≈8% writes" },
            ].map((m) => (
              <div key={m.k} className="rounded-lg border border-black/5 bg-white/70 p-3 text-center shadow-sm dark:bg-slate-900/60 dark:border-white/10">
                <div className="text-lg font-semibold text-slate-900 dark:text-white">{m.v}</div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{m.k}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="rounded-xl border border-black/5 bg-gradient-to-br from-indigo-500 to-violet-500 p-1 shadow-lg dark:border-white/10">
            <div className="rounded-[10px] bg-white p-4 dark:bg-slate-900">
              <div className="mb-3 h-4 w-28 rounded bg-slate-200/80 dark:bg-slate-700/70" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-black/5 bg-slate-50 px-3 py-2 dark:bg-slate-800/60 dark:border-white/10">
                    <div>
                      <div className="h-3.5 w-40 rounded bg-slate-200/90 dark:bg-slate-700/70" />
                      <div className="mt-1 h-3 w-24 rounded bg-slate-200/70 dark:bg-slate-700/50" />
                    </div>
                    <div className="h-6 w-14 rounded bg-indigo-500/90 dark:bg-indigo-600" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 rounded-xl border border-black/5 bg-white p-3 shadow-md dark:bg-slate-900 dark:border-white/10">
            <div className="h-3 w-24 rounded bg-slate-200/80 dark:bg-slate-700/70" />
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 w-16 rounded bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-slate-700 dark:to-slate-800" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RouteError() {
  return (
    <div className="mx-auto max-w-2xl bg-red-50 border border-red-200 text-red-700 rounded p-4 dark:bg-red-900/20 dark:border-red-900/40 dark:text-red-200">
      <div className="font-medium mb-1">Something went wrong loading this page.</div>
      <div className="text-sm">Try going back or refreshing.</div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Landing /> },
      {
        path: "jobs",
        children: [
          { index: true, element: <JobsBoard /> },
          { path: ":jobId", element: <JobDetail /> },
        ],
      },
      {
        path: "candidates",
        children: [
          { index: true, element: <Candidates /> },
          { path: ":id", element: <CandidateProfile /> },
        ],
      },
      {
        path: "kanban",
        children: [
          { index: true, element: <Kanban />},
          { path: ":id", element: <CandidateProfile /> },
        ],
      },
      {
        path: "kanban",
        children: [
          { index: true, element: <Kanban /> },
          { path: ":id", element: <CandidateProfile /> },
        ],
      },
      {
        path: "assessments/:jobId",
        children: [
          { index: true, element: <AssessmentBuilder /> },
          { path: "preview", element: <AssessmentPreview /> },
          { path: "run", element: <AssessmentRun /> },
        ],
      },
      { path: "*", element: <div className="text-sm text-gray-600 dark:text-slate-300">Not found.</div> },
    ],
  },
]);
