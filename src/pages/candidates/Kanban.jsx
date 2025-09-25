// src/pages/candidates/KanbanOneListMovePrompt.jsx
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState } from "react";
import { useCandidates, useUpdateCandidate } from "../../features/candidates/queries";

const STAGES = ["applied", "screen", "tech", "offer", "hired", "rejected"];

// ---------- Color helpers ----------
function hashHue(seed) {
  let h = 0;
  const s = String(seed || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360; // 0..359
}
// Transparent HSL (light/dark friendly)
const hsl = (h, s, l, a = 1) => `hsla(${h} ${s}% ${l}% / ${a})`;

// Stage tint map (very subtle border tint per stage)
const STAGE_TINT = {
  applied: { s: 50, l: 85, hue: 220 },  // slate/indigo-ish
  screen:  { s: 70, l: 88, hue: 260 },  // violet
  tech:    { s: 70, l: 86, hue: 200 },  // blue/cyan
  offer:   { s: 80, l: 88, hue: 150 },  // green
  hired:   { s: 80, l: 88, hue: 140 },  // emerald
  rejected:{ s: 70, l: 90, hue: 355 },  // red/pink
};

function initials(name) {
  const p = String(name || "").trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase();
}

// ---------- Move Prompt ----------
function MovePrompt({ open, candidate, fromStage, onCancel, onConfirm }) {
  const [target, setTarget] = useState("");

  useEffect(() => {
    if (open) {
      const i = Math.max(0, STAGES.indexOf(fromStage));
      const def =
        STAGES.find((s, idx) => idx >= i && s !== fromStage) ||
        STAGES.find((s) => s !== fromStage) ||
        "";
      setTarget(def);
    }
  }, [open, fromStage]);

  if (!open) return null;

  // Use candidate hue to color the primary button
  const hue = hashHue(candidate?.name);
  const primaryBg = hsl(hue, 70, 45);
  const primaryHover = hsl(hue, 70, 40);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl border border-slate-300 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <div className="text-base font-semibold text-slate-900 dark:text-slate-100">Move candidate</div>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Where should <b className="text-slate-900 dark:text-slate-100">{candidate?.name}</b> move?
        </div>
        <div className="mt-4 grid gap-2">
          <label className="text-xs text-slate-500 dark:text-slate-400">Target stage</label>
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            {STAGES.filter((s) => s !== fromStage).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="rounded-md px-3 py-2 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60"
            style={{ background: primaryBg }}
            onMouseOver={(e) => (e.currentTarget.style.background = primaryHover)}
            onMouseOut={(e) => (e.currentTarget.style.background = primaryBg)}
            disabled={!target}
            onClick={() => onConfirm(target)}
          >
            Move
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Card ----------
function CandidateCard({ c }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: c.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  // Per-name color system
  const hue = hashHue(c.name);
  const avatarA = hsl(hue, 80, 80);
  const avatarB = hsl((hue + 35) % 360, 80, 65);
  const softBg = hsl(hue, 75, 92, 0.55);        // translucent card fill
  const softBgDark = hsl(hue, 40, 22, 0.45);    // translucent for dark
  const ring = hsl(hue, 70, 45, 0.6);
  const hoverRing = hsl(hue, 70, 45, 0.9);

  // Stage tint for border
  const tint = STAGE_TINT[c.stage] || STAGE_TINT.applied;
  const borderLight = hsl(tint.hue, tint.s, tint.l, 0.9);
  const borderDark = hsl(tint.hue, 25, 35, 0.35);

  return (
    <article
      ref={setNodeRef}
      style={{
        ...style,
         "--card-border": borderLight,
        "--card-bg-dark": softBgDark,
        boxShadow: isDragging ? `0 0 0 2px ${ring}` : undefined,
  
      }}
      className={[
        "group cursor-grab active:cursor-grabbing rounded-xl border p-3 shadow-sm transition hover:shadow-md",
        // border tint by stage (light/dark variants)

        "dark:bg-[color:var(--card-bg-dark)]",
        isDragging ? "ring-2" : "ring-0",
      ].join(" ")}
      {...attributes}
      {...listeners}
      role="listitem"
      aria-roledescription="Draggable candidate"
      title="Drag to move"
      // CSS variables to swap per-theme values
  
      onMouseEnter={(e) => {
        if (!isDragging) e.currentTarget.style.boxShadow = `0 0 0 2px ${hoverRing}`;
      }}
      onMouseLeave={(e) => {
        if (!isDragging) e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-slate-700 ring-1 ring-slate-200 dark:text-slate-100 dark:ring-slate-700"
          style={{
            background: `linear-gradient(135deg, ${avatarA} 0%, ${avatarB} 100%)`,
          }}
          title={c.name}
        >
          {initials(c.name)}
        </div>
        <div className="min-w-0 grow">
          <div className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
            {c.name}
          </div>
          <div className="truncate text-sm text-slate-700 dark:text-slate-300">{c.email}</div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Stage: <span className="capitalize">{c.stage}</span>
          </div>
        </div>
        <span
          className="ml-auto whitespace-nowrap rounded px-2 py-0.5 text-[11px] ring-1 ring-inset"
          style={{
            background: hsl(hue, 60, 92, 0.7),
            color: hsl(hue, 45, 30),
            borderColor: hsl(hue, 30, 70),
          }}
          title={`Job ${String(c.jobId).slice(0, 8)}`}
        >
          {String(c.jobId).slice(0, 6)}…
        </span>
      </div>
    </article>
  );
}

// ---------- Page ----------
export default function Kanban() {
  const { data, isLoading, isError, error } = useCandidates({ page: 1, pageSize: 9999 });
  const update = useUpdateCandidate();
  const all = data?.items || [];

  // One open column at a time
  const [sourceStage, setSourceStage] = useState("applied");

  // Scope for searching
  const [scope, setScope] = useState("column"); // "column" | "all"

  // Search & sort
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("name"); // name | email

  // Visible cards (filtered)
  const visible = useMemo(() => {
    let base = scope === "column" ? all.filter((c) => c.stage === sourceStage) : all;
    if (q.trim()) {
      const s = q.toLowerCase();
      base = base.filter(
        (c) => c.name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s)
      );
    }
    if (sort === "name") base = [...base].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "email") base = [...base].sort((a, b) => a.email.localeCompare(b.email));
    return base;
  }, [all, q, sort, scope, sourceStage]);

  // Local drag order for the current list
  const [order, setOrder] = useState(() => visible.map((c) => c.id));
  useEffect(() => setOrder(visible.map((c) => c.id)), [visible]);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  );

  // Drag state
  const [activeId, setActiveId] = useState(null);

  // Move prompt state
  const [pendingMove, setPendingMove] = useState(
    /** @type {null | { id: string, fromStage: string }} */ (null)
  );

  function onDragStart(e) {
    setActiveId(e.active.id);
  }

  function onDragOver(e) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.indexOf(active.id);
      const newIndex = prev.indexOf(over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function onDragEnd(e) {
    setActiveId(null);
    const { active } = e;
    if (!active) return;
    const fromStage = all.find((c) => c.id === active.id)?.stage || sourceStage;
    // Ask where to move
    setPendingMove({ id: active.id, fromStage });
  }

  function cancelMove() {
    setPendingMove(null);
  }

  function confirmMove(targetStage) {
    if (!pendingMove) return;
    const { id, fromStage } = pendingMove;
    if (!targetStage || targetStage === fromStage) {
      setPendingMove(null);
      return;
    }

    // Persist
    update.mutate({ id, patch: { stage: targetStage } });

    // Remove from current list when scoping to the column it came from
    if (scope === "column" && sourceStage === fromStage) {
      setOrder((prev) => prev.filter((x) => x !== id));
    }

    // Auto-switch to the target so the user sees it in the destination
    setSourceStage(targetStage);
    setPendingMove(null);
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-48 rounded bg-slate-200 dark:bg-slate-700" />
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
          />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
        {String(error?.message || error)}
      </div>
    );
  }

  const orderedCards = order.map((id) => visible.find((c) => c.id === id)).filter(Boolean);

  // stage chip color
  const stageHue = STAGE_TINT[sourceStage]?.hue ?? 220;
  const chipBg = hsl(stageHue, 60, 92, 0.8);
  const chipText = hsl(stageHue, 35, 32);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Kanban</h1>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-slate-600 dark:text-slate-300">Column</span>
            <select
              className="rounded-md border  bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              value={sourceStage}
              onChange={(e) => setSourceStage(e.target.value)}
              title="Browse this stage"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <span
            className="rounded-full px-2.5 py-1 text-[11px] ring-1 ring-inset"
            style={{ background: chipBg, color: chipText, borderColor: chipBg }}
            title="Current column"
          >
            {orderedCards.length} shown
          </span>

          <label className="flex items-center gap-2 text-sm">
            <span className="text-slate-600 dark:text-slate-300">Scope</span>
            <select
              className="rounded-md border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              title="Search in current column or across all"
            >
              <option value="column">this column</option>
              <option value="all">all columns</option>
            </select>
          </label>

          <input
            className="w-72 rounded-md border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            placeholder={`Search in ${scope === "column" ? sourceStage : "all"}`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            title="Sort results"
          >
            <option value="name">Sort by name</option>
            <option value="email">Sort by email</option>
          </select>
        </div>
      </header>

      {/* List */}
      <DndContext
        sensors={useSensors(
          useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
          useSensor(KeyboardSensor)
        )}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="rounded-xl border  bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 text-sm text-slate-600 dark:text-slate-300">
            Drag a candidate out of the list — you’ll be asked where to move.
          </div>
          {orderedCards.length === 0 ? (
            <div className="grid place-items-center rounded-lg border border-dashed  py-10 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              No candidates match this view.
            </div>
          ) : (
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <ul
                className="nice-scroll max-h-[72vh] space-y-2 overflow-y-auto"
                role="list"
                aria-label="Candidates"
              >
                {orderedCards.map((c) => (
                  <li key={c.id}>
                    <CandidateCard c={c} />
                  </li>
                ))}
              </ul>
            </SortableContext>
          )}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeId ? (
            <div className="rounded-md   bg-white px-3 py-2 text-sm shadow-md  dark:bg-slate-900 dark:text-slate-100">
              {all.find((x) => x.id === activeId)?.name || "Dragging…"}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Move prompt */}
      <MovePrompt
        open={!!pendingMove}
        candidate={pendingMove ? all.find((x) => x.id === pendingMove.id) : null}
        fromStage={pendingMove?.fromStage || sourceStage}
        onCancel={cancelMove}
        onConfirm={confirmMove}
      />
    </div>
  );
}
