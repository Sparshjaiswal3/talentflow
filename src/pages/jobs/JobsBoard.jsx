import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  KeyboardSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useJobs, useCreateJob, useReorderJob } from "../../features/jobs/queries";
import JobFormModal from "./JobFormModal";

function SortableJobRow({ job, disabled }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: job.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={[
        "group relative grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-xl border p-3",
        "bg-white/90 dark:bg-slate-900/70 border-black/5 dark:border-white/10",
        "shadow-sm hover:shadow transition will-change-transform",
        isDragging ? "ring-2 ring-indigo-400/50 shadow-lg" : "",
      ].join(" ")}
    >
      <button
        className="mt-1 h-7 w-7 shrink-0 select-none rounded-md border border-black/10 dark:border-white/10 text-xs grid place-items-center text-slate-500 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        ⇅
      </button>

      <div className="min-w-0">
        <Link to={`/jobs/${job.id}`} className="block truncate font-medium text-slate-900 dark:text-white hover:underline">
          {job.title}
        </Link>
        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
          {job.slug} · <span className={job.status === "active" ? "text-emerald-600" : "text-amber-600"}>{job.status}</span> · order {job.order}
        </div>
        {!!job.tags?.length && (
          <div className="mt-2 flex flex-wrap gap-1">
            {job.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-400/30 px-2 py-0.5 text-[11px] font-medium"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <Link
        to={`/assessments/${job.id}`}
        className="self-center text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
        title="Open Assessment Builder"
      >
        Assessment →
      </Link>
    </li>
  );
}

export default function JobsBoard() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data, isFetching, error, isLoading } = useJobs({ search: q, status, page, pageSize: 10, sort: "order" });
  const createJob = useCreateJob();
  const reorder = useReorderJob();
  const items = data?.items || [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const ids = useMemo(() => items.map((j) => j.id), [items]);

  const indexById = useMemo(() => {
    const map = new Map();
    items.forEach((j, i) => map.set(j.id, i));
    return map;
  }, [items]);

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIdx = indexById.get(active.id);
    const toIdx = indexById.get(over.id);
    if (fromIdx == null || toIdx == null || fromIdx === toIdx) return;
    const fromOrder = items[fromIdx].order;
    const toOrder = toIdx;
    reorder.mutate({ id: active.id, fromOrder, toOrder });
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-slate-900/70 p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 ring-1 ring-black/5" />
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Jobs</h1>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search title or slug"
            className="w-64 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
          />
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="ml-auto">
          <JobFormModal onSubmit={(payload) => createJob.mutate(payload)} />
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200 p-3">
          {String(error.message)}
        </div>
      )}

      {isLoading ? (
        <ul className="grid gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="h-20 rounded-xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-slate-900/70 animate-pulse" />
          ))}
        </ul>
      ) : (
        <ul className="grid gap-2" aria-live="polite">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              {items.map((j) => (
                <SortableJobRow key={j.id} job={j} disabled={!!reorder.isPending} />
              ))}
            </SortableContext>
          </DndContext>
        </ul>
      )}

      <div className="flex items-center justify-between rounded-xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-slate-900/70 p-3">
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
          {isFetching && <span className="inline-flex items-center gap-1">Loading…</span>}
          {reorder.isPending && <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-300">Saving order…</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            className=" text-white rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </button>
          <div className="text-sm text-slate-600 dark:text-slate-300">Page {data?.page || 1}</div>
          <button
            className=" text-white rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            disabled={(data?.items?.length || 0) < (data?.pageSize || 10)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Drag rows using the handle. Randomized failures are simulated; failed reorders will roll back automatically.
      </p>
    </div>
  );
}
