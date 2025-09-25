import { useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { Link, useNavigate } from "react-router-dom";
import { useCandidates } from "../../features/candidates/queries";

function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useMemo(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const STAGES = ["applied", "screen", "tech", "offer", "hired", "rejected"];

const stageStyles = {
  applied:
    "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800/60",
  screen:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800/60",
  tech:
    "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-800/60",
  offer:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800/60",
  hired:
    "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-800/60",
  rejected:
    "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-800/60",
};

function Avatar({ name }) {
  const initials = String(name || "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="grid place-items-center h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-xs font-semibold ring-1 ring-black/5 dark:ring-white/10">
      {initials}
    </div>
  );
}

export default function Candidates() {
  const nav = useNavigate();
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [stage, setStage] = useState("");
  const [page, setPage] = useState(1);
  const { data, isFetching, error } = useCandidates({
    search: debounced,
    stage,
    page,
    pageSize: 50,
  });

  const items = data?.items || [];
  const total = data?.total || 0;

  const quickCounts = useMemo(() => {
    const m = Object.fromEntries(STAGES.map((s) => [s, 0]));
    for (const c of items) m[c.stage] = (m[c.stage] || 0) + 1;
    return m;
  }, [items]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      <aside className="self-start rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm sticky top-24 dark:border-white/10 dark:bg-slate-900/70">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 ring-1 ring-black/5 dark:ring-white/10" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Filters
          </h2>
        </div>

        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          Search
        </label>
        <div className="mt-1 relative">
          <input
            className="w-full rounded-md border border-black/10 bg-white px-3 py-2 pl-9 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
            placeholder="Name or email"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <svg
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="mt-4">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Stage
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setStage("");
                setPage(1);
              }}
              className={`rounded-md px-2 py-1.5 text-xs ring-1 ring-inset transition ${
                stage === ""
                  ? "bg-indigo-600 text-white ring-indigo-600"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-slate-800/60"
              }`}
            >
              All
            </button>
            {STAGES.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStage(s);
                  setPage(1);
                }}
                className={`inline-flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs ring-1 ring-inset transition ${
                  stage === s
                    ? "bg-indigo-600 text-white ring-indigo-600"
                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-slate-800/60"
                }`}
                title={`${s} (${quickCounts[s] || 0} on this page)`}
              >
                <span className="capitalize">{s}</span>
                <span className="rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                  {quickCounts[s] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-2">
          <button
            onClick={() => nav("/candidates/kanban")}
            className="inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:bg-transparent dark:text-indigo-300 dark:ring-indigo-400/40 dark:hover:bg-slate-800/60"
          >
            Open Kanban →
          </button>
        </div>
      </aside>

      <section className="space-y-4">
        <div className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              Candidates
            </h1>
            <div className="ml-auto flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <span>
                Showing{" "}
                <b className="text-slate-900 dark:text-white">{items.length}</b>{" "}
                of{" "}
                <b className="text-slate-900 dark:text-white">{total}</b>
              </span>
              {isFetching && <span className="animate-pulse">Refreshing…</span>}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
            {String(error.message)}
          </div>
        )}

        <div
  className="overflow-hidden  border border-black/5 bg-white/80 shadow-sm dark:border-white/10 dark:bg-slate-900/70 nice-scroll"
  style={{ height: 560 }}
>
          <div className="sticky top-0 z-10 border-b border-black/5 bg-white/80 px-4 py-2 text-[11px] uppercase tracking-wide text-slate-500 backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
            Name • Email • Stage • Job
          </div>
          <Virtuoso
            data={items}
            itemContent={(index, c) => {
              const stageCls =
                stageStyles[c.stage] || stageStyles.applied;
              return (
                <div className=" max-h-[70vh] overflow-y-auto nice-scroll group relative flex items-center gap-3 border-b border-black/5 px-4 py-3 last:border-b-0 dark:border-white/10">
                  <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-transparent via-indigo-300 to-transparent opacity-0 transition group-hover:opacity-100 dark:via-indigo-600/70" />
                  <Avatar name={c.name} />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/candidates/${c.id}`}
                      className="block truncate font-medium text-slate-900 hover:underline dark:text-white"
                    >
                      {c.name}
                    </Link>
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {c.email}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide ring-1 ${stageCls}`}
                  >
                    {c.stage}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-white/10">
                    {String(c.jobId).slice(0, 8)}…
                  </span>
                  <Link
                    to={`/candidates/${c.id}`}
                    className="ml-2 hidden rounded-md px-2 py-1 text-xs text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50 group-hover:inline-flex dark:text-indigo-300 dark:ring-indigo-400/40 dark:hover:bg-slate-800/60"
                    title="Open profile"
                  >
                    View
                  </Link>
                </div>
              );
            }}
            components={{
              Footer: () => (
                <div className="flex items-center gap-2 px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                  {isFetching ? "Loading…" : `${items.length} of ${total} shown`}
                </div>
              ),
              EmptyPlaceholder: () => (
                <div className="grid h-full place-items-center text-sm text-slate-500 dark:text-slate-400">
                  No candidates match your filters.
                </div>
              ),
            }}
          />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {isFetching && "Fetching…"}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md bg-white px-3 py-1.5 text-sm text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:bg-slate-900 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-slate-800"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </button>
            <div className="text-sm text-slate-700 dark:text-slate-300">
              Page {data?.page || 1}
            </div>
            <button
              className="rounded-md bg-white px-3 py-1.5 text-sm text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:bg-slate-900 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-slate-800"
              disabled={(data?.items?.length || 0) < (data?.pageSize || 50)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
