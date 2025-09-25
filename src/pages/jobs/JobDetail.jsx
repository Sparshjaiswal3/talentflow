import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useJobs, useUpdateJob } from "../../features/jobs/queries";

export default function JobDetail() {
  const { jobId } = useParams();
  const { data, isFetching } = useJobs({ page: 1, pageSize: 999, sort: "order" });
  const job = useMemo(() => (data?.items || []).find((j) => j.id === jobId), [data, jobId]);
  const updateJob = useUpdateJob();

  const [title, setTitle] = useState(job?.title || "");
  const [slug, setSlug] = useState(job?.slug || "");
  const [tagsText, setTagsText] = useState((job?.tags || []).join(", "));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!job) return;
    setTitle(job.title || "");
    setSlug(job.slug || "");
    setTagsText((job.tags || []).join(", "));
  }, [job]);

  if (isFetching && !job) return <div className="text-sm text-slate-600 dark:text-slate-300">Loading…</div>;
  if (!job) return <div className="text-red-600 dark:text-red-400">Job not found.</div>;

  function saveField(patch) {
    setError("");
    updateJob.mutate(
      { id: job.id, patch },
      { onError: (e) => setError(String(e?.message || "Failed to save")) }
    );
  }

  function handleSaveAll() {
    const tags = tagsText.split(",").map((s) => s.trim()).filter(Boolean);
    saveField({ title: title.trim(), slug: slug.trim(), tags });
  }

  const statusColor =
    job.status === "active"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30"
      : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30";

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-600/70">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{job.title}</h1>
          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>ID: {job.id}</span>
            <span className={["inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ring-1", statusColor].join(" ")}>
              {job.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
            onClick={() => saveField({ status: job.status === "active" ? "archived" : "active" })}
            disabled={updateJob.isPending}
          >
            {job.status === "active" ? "Archive" : "Unarchive"}
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">{updateJob.isPending ? "Saving…" : null}</span>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
        <div className="grid gap-4">
          <label className="grid gap-1 text-sm">
            <span className="text-slate-700 dark:text-slate-200">Title</span>
            <input
              className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Frontend Engineer"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-slate-700 dark:text-slate-200">Slug</span>
            <input
              className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="frontend-engineer"
            />
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Must be unique; collisions may return 409.</div>
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-slate-700 dark:text-slate-200">Tags (comma separated)</span>
            <input
              className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="remote, full-time"
            />
          </label>

          <div className="flex items-center gap-2 pt-2">
            <button
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 disabled:opacity-60"
              onClick={handleSaveAll}
              disabled={updateJob.isPending}
            >
              {updateJob.isPending ? "Saving…" : "Save changes"}
            </button>
            <button
              className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border-white/10 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200"
              onClick={() => {
                setTitle(job.title || "");
                setSlug(job.slug || "");
                setTagsText((job.tags || []).join(", "));
                setError("");
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
        <div className="mb-2 font-medium text-slate-900 dark:text-white">Assessments</div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white shadow hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
            to={`/assessments/${job.id}`}
          >
            Builder
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md bg-white px-3 py-1.5 font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:bg-transparent dark:text-indigo-300 dark:ring-indigo-400/40 dark:hover:bg-slate-800/60"
            to={`/assessments/${job.id}/preview`}
          >
            Preview
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md bg-white px-3 py-1.5 font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:bg-transparent dark:text-indigo-300 dark:ring-indigo-400/40 dark:hover:bg-slate-800/60"
            to={`/assessments/${job.id}/run`}
          >
            Run (candidate)
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
        <div className="mb-2 font-medium text-slate-900 dark:text-white">Tags</div>
        <div className="flex flex-wrap gap-2">
          {(job.tags || []).length === 0 ? (
            <span className="text-xs text-slate-500 dark:text-slate-400">No tags yet.</span>
          ) : (
            job.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/30"
              >
                {t}
              </span>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
