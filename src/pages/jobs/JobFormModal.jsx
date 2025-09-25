import { useEffect, useMemo, useState } from "react";
import { useJobs } from "../../features/jobs/queries";

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function JobFormModal({ onSubmit }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [touched, setTouched] = useState(false);

  const { data } = useJobs({ page: 1, pageSize: 9999, sort: "order" });
  const allJobs = data?.items || [];
  const existingSlugs = useMemo(() => new Set(allJobs.map((j) => j.slug)), [allJobs]);

  useEffect(() => {
    if (!slugEdited) setSlug(slugify(title));
  }, [title, slugEdited]);

  const errors = {};
  if (!title.trim()) errors.title = "Title is required";
  if (!slug) errors.slug = "Slug is required";
  else if (existingSlugs.has(slug)) errors.slug = "Slug already exists";
  const isInvalid = Object.keys(errors).length > 0;

  function resetForm() {
    setTitle("");
    setSlug("");
    setSlugEdited(false);
    setTags([]);
    setTagInput("");
    setTouched(false);
  }

  function addTagFromInput() {
    const t = tagInput.trim();
    if (!t) return;
    if (!tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  }

  function onKeyDownTag(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTagFromInput();
    } else if (e.key === "Backspace" && !tagInput) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  async function handleCreate() {
    setTouched(true);
    if (isInvalid) return;
    onSubmit?.({ title: title.trim(), slug, tags });
    setOpen(false);
    resetForm();
  }

  return (
    <>
      <button
        className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
        onClick={() => setOpen(true)}
      >
        + New Job
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="job-create-title"
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-black/5 bg-white shadow-2 dark:bg-slate-900 dark:border-white/10">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-white">
              <h2 id="job-create-title" className="text-base font-semibold tracking-wide">
                Create Job
              </h2>
            </div>

            <div className="p-5 space-y-4">
              <label className="grid gap-1 text-sm">
                <span className="text-slate-700 dark:text-slate-200">Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="e.g., Frontend Engineer"
                  autoFocus
                  className="rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
                  aria-invalid={touched && !!errors.title}
                />
                {touched && errors.title && (
                  <span className="text-xs text-red-600 dark:text-red-400">{errors.title}</span>
                )}
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-slate-700 dark:text-slate-200">Slug</span>
                <div className="flex items-center gap-2">
                  <input
                    value={slug}
                    onChange={(e) => {
                      setSlugEdited(true);
                      setSlug(slugify(e.target.value));
                    }}
                    onBlur={() => setTouched(true)}
                    placeholder="frontend-engineer"
                    className="flex-1 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
                    aria-invalid={touched && !!errors.slug}
                  />
                  {!slugEdited && (
                    <button
                      type="button"
                      onClick={() => setSlugEdited(true)}
                      className="rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
                      title="Edit slug"
                    >
                      Edit
                    </button>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Preview: <code>/{slug || "…"}</code>
                </div>
                {touched && errors.slug && (
                  <span className="text-xs text-red-600 dark:text-red-400">{errors.slug}</span>
                )}
              </label>

              <div className="text-sm">
                <div className="text-slate-700 dark:text-slate-200">Tags</div>
                <div className="mt-1 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-slate-900 px-2 py-1">
                  <div className="flex flex-wrap items-center gap-1">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-full border border-indigo-200 dark:border-indigo-400/30 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-300"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                          className="leading-none text-indigo-600/80 hover:text-indigo-700 dark:text-indigo-300/80 dark:hover:text-indigo-200"
                          aria-label={`Remove ${t}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      className="flex-1 min-w-[8rem] bg-transparent px-1 py-1 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
                      placeholder="Type a tag and press Enter"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={onKeyDownTag}
                      onBlur={addTagFromInput}
                    />
                  </div>
                </div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Use <b>Enter</b> or <b>,</b> to add a tag.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-black/5 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 px-5 py-3">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Slug must be unique.
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-md border text-white border-black/10 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 disabled:opacity-60"
                  onClick={handleCreate}
                  disabled={isInvalid}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
