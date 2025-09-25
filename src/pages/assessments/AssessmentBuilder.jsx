// src/pages/assessments/AssessmentBuilder.jsx
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "../../lib/api";
import { useEffect, useMemo, useRef, useState } from "react";
import AssessmentPreview from "./AssessmentPreview";
import { useToast } from "../../ui/Toast";
import { useDebouncedCallback } from "../../lib/useDebouncedCallback";

/* ---------------- UI presets ---------------- */
const KIND_OPTIONS = ["single", "multi", "short", "long", "number", "file"];

const KIND_BADGE = {
  single:
    "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/20",
  multi:
    "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20",
  short:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-400/20",
  long:
    "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-400/20",
  number:
    "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20",
  file:
    "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20",
};
const KIND_LEFT = {
  single: "before:bg-indigo-400",
  multi: "before:bg-violet-400",
  short: "before:bg-emerald-400",
  long: "before:bg-teal-400",
  number: "before:bg-amber-400",
  file: "before:bg-sky-400",
};

const makeQuestion = (kind = "short") => ({
  id: crypto.randomUUID(),
  kind,
  label: "",
  required: false,
  options:
    kind === "single" || kind === "multi" ? ["Option A", "Option B"] : undefined,
  maxLength: kind === "short" ? 120 : kind === "long" ? 600 : undefined,
  min: kind === "number" ? 0 : undefined,
  max: kind === "number" ? 100 : undefined,
  showIf: undefined,
});

const clone = (o) => JSON.parse(JSON.stringify(o));
const json = (o) => JSON.stringify(o);

/* ---------------- Page ---------------- */
export default function AssessmentBuilder() {
  const { jobId } = useParams();
  const qc = useQueryClient();
  const { push } = useToast();

  // Load once (don’t yank focus on window focus)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["assessment", jobId],
    queryFn: () => apiGet(`/assessments/${jobId}`),
    refetchOnWindowFocus: false,
  });

  // Working state
  const [schema, setSchema] = useState({ title: "New Assessment", sections: [] });
  const [dirty, setDirty] = useState(false);
  const prevJsonRef = useRef(json(schema));

  // Sync from server → local when NOT dirty
  useEffect(() => {
    if (!data?.schema) return;
    const server = clone(data.schema);
    const serverJson = json(server);
    if (!dirty && serverJson !== prevJsonRef.current) {
      setSchema(server);
      prevJsonRef.current = serverJson;
    }
  }, [data, dirty]);

  // Optimistic Save (no invalidate ⇒ no remount/focus loss)
  const save = useMutation({
    mutationFn: (next) =>
      apiSend("PUT", `/assessments/${jobId}`, { schema: next }).then(() => next),

    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: ["assessment", jobId] });
      const prev = qc.getQueryData(["assessment", jobId]);
      qc.setQueryData(["assessment", jobId], (old) =>
        old ? { ...old, schema: next } : { schema: next }
      );
      return { prev };
    },

    onError: (e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["assessment", jobId], ctx.prev);
      push(e.message || "Save failed", "error");
    },

    onSuccess: (saved) => {
      prevJsonRef.current = json(saved);
      setDirty(false);
      push("Saved");
    },
  });

  // Debounced autosave (less chatty)
  const autoSave = useDebouncedCallback((next) => {
    const nextJson = json(next);
    if (!dirty) return;
    if (nextJson === prevJsonRef.current) return;
    save.mutate(next);
  }, 1200);

  useEffect(() => {
    if (!isLoading) autoSave(schema);
  }, [schema, isLoading, autoSave]);

  // Mut helpers
  const touch = (producer) =>
    setSchema((s) => {
      const next = typeof producer === "function" ? producer(s) : producer;
      setDirty(true);
      return next;
    });

  // Section ops
  const addSection = () =>
    touch((s) => ({
      ...s,
      sections: [
        ...s.sections,
        {
          id: crypto.randomUUID(),
          title: `Section ${s.sections.length + 1}`,
          questions: [],
        },
      ],
    }));
  const renameSection = (secId, title) =>
    touch((s) => ({
      ...s,
      sections: s.sections.map((sec) => (sec.id === secId ? { ...sec, title } : sec)),
    }));
  const deleteSection = (secId) =>
    touch((s) => ({ ...s, sections: s.sections.filter((sec) => sec.id !== secId) }));
  const moveSection = (secId, dir) =>
    touch((s) => {
      const arr = [...s.sections];
      const idx = arr.findIndex((x) => x.id === secId);
      if (idx < 0) return s;
      const to = idx + dir;
      if (to < 0 || to >= arr.length) return s;
      const [spliced] = arr.splice(idx, 1);
      arr.splice(to, 0, spliced);
      return { ...s, sections: arr };
    });

  // Question ops
  const addQuestionTo = (secId, kind) =>
    touch((s) => ({
      ...s,
      sections: s.sections.map((sec) =>
        sec.id === secId
          ? { ...sec, questions: [...sec.questions, makeQuestion(kind)] }
          : sec
      ),
    }));
  const updateQuestion = (secId, qId, patch) =>
    touch((s) => ({
      ...s,
      sections: s.sections.map((sec) =>
        sec.id === secId
          ? {
              ...sec,
              questions: sec.questions.map((q) => (q.id === qId ? { ...q, ...patch } : q)),
            }
          : sec
      ),
    }));
  const deleteQuestion = (secId, qId) =>
    touch((s) => ({
      ...s,
      sections: s.sections.map((sec) =>
        sec.id === secId ? { ...sec, questions: sec.questions.filter((q) => q.id !== qId) } : sec
      ),
    }));
  const moveQuestion = (secId, qId, dir) =>
    touch((s) => {
      const sections = s.sections.map((sec) => {
        if (sec.id !== secId) return sec;
        const qs = [...sec.questions];
        const idx = qs.findIndex((q) => q.id === qId);
        if (idx < 0) return sec;
        const to = idx + dir;
        if (to < 0 || to >= qs.length) return sec;
        const [card] = qs.splice(idx, 1);
        qs.splice(to, 0, card);
        return { ...sec, questions: qs };
      });
      return { ...s, sections };
    });

  // showIf helpers
  const allQuestionChoices = useMemo(() => {
    const list = [];
    for (const sec of schema.sections) {
      for (const q of sec.questions)
        list.push({
          id: q.id,
          label: q.label || q.id,
          kind: q.kind,
          options: q.options,
        });
    }
    return list;
  }, [schema]);

  const setShowIf = (secId, qId, depId, expectedValue) => {
    if (!depId) updateQuestion(secId, qId, { showIf: undefined });
    else updateQuestion(secId, qId, { showIf: { [depId]: expectedValue } });
  };

  // Guards
  if (isLoading)
    return (
      <div className="text-sm text-slate-600 dark:text-slate-300">Loading builder…</div>
    );
  if (isError)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
        {String(error?.message || error)}
      </div>
    );

  /* ---------------- Render ---------------- */
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)]">
      {/* LEFT — BUILDER */}
      <div className="space-y-5">
        {/* Top bar */}
        <div className="sticky top-0 z-10 -mx-4 border-b border-black/5 bg-gradient-to-r from-indigo-600/10 via-fuchsia-600/10 to-cyan-500/10 px-4 py-3 backdrop-blur dark:border-white/10 lg:mx-0 lg:rounded-2xl lg:border">
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="w-full flex-1 rounded-md border border-black/10 bg-white px-3 py-2 text-lg font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border-white/10 dark:bg-slate-900 dark:text-white"
              value={schema.title || ""}
              onChange={(e) => touch((s) => ({ ...s, title: e.target.value }))}
              placeholder="Assessment title"
            />
            <div className="flex items-center gap-2">
              <Link
                to={`/assessments/${jobId}/preview`}
                className="rounded-md bg-white px-3 py-2 text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:bg-transparent dark:text-indigo-300 dark:ring-indigo-400/40 dark:hover:bg-slate-800/60"
              >
                Preview
              </Link>
              <Link
                to={`/assessments/${jobId}/run`}
                className="rounded-md bg-white px-3 py-2 text-sm font-medium text-violet-700 ring-1 ring-inset ring-violet-200 hover:bg-violet-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 dark:bg-transparent dark:text-violet-300 dark:ring-violet-400/40 dark:hover:bg-slate-800/60"
              >
                Runtime
              </Link>
              <button
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 disabled:opacity-60"
                onClick={() => save.mutate(schema)}
                disabled={save.isPending}
              >
                {save.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px]">
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 ring-1 ring-inset",
                dirty
                  ? "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-400/30"
                  : "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-400/30",
              ].join(" ")}
            >
              {dirty ? "Unsaved changes" : "All changes saved"}
            </span>
            <span className="text-slate-500 dark:text-slate-400">· Job ID: {jobId}</span>
          </div>
        </div>

        {/* Section controls */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Sections</h2>
          <button
            className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-3 py-2 text-sm font-medium text-white shadow hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
            onClick={addSection}
          >
            + Add Section
          </button>
        </div>

        {/* Sections list */}
        <div className="grid gap-5">
          {schema.sections.map((sec, sIdx) => (
            <section
              key={sec.id}
              className="rounded-2xl border border-black/5 bg-white/80 shadow-sm dark:border-white/10 dark:bg-slate-900/70"
            >
              {/* Section header */}
              <div className="flex flex-wrap items-center gap-2 border-b border-black/5 bg-gradient-to-r from-indigo-50/60 via-white to-white px-4 py-3 dark:border-white/10 dark:from-slate-800/50 dark:via-slate-900 dark:to-slate-900">
                <input
                  className="w-full flex-1 rounded-md border border-black/10 bg-white px-3 py-2 text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                  value={sec.title}
                  onChange={(e) => renameSection(sec.id, e.target.value)}
                  placeholder="Section title"
                />
                <div className="ml-auto flex items-center gap-1">
                  <button
                    className="text-white rounded-md border border-black/10 bg-white px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border-white/10 dark:bg-slate-900 dark:hover:bg-slate-800"
                    disabled={sIdx === 0}
                    onClick={() => moveSection(sec.id, -1)}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="text-white rounded-md border border-black/10 bg-white px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border-white/10 dark:bg-slate-900 dark:hover:bg-slate-800"
                    disabled={sIdx === schema.sections.length - 1}
                    onClick={() => moveSection(sec.id, +1)}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 dark:border-white/10 dark:bg-slate-900 dark:hover:bg-red-900/20"
                    onClick={() => {
                      if (confirm("Delete this section?")) deleteSection(sec.id);
                    }}
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Kind toolbar */}
              <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                {KIND_OPTIONS.map((k) => (
                  <button
                    key={k}
                    className={[
                      "text-white rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60",
                      KIND_BADGE[k],
                    ].join(" ")}
                    onClick={() => addQuestionTo(sec.id, k)}
                  >
                    + {k}
                  </button>
                ))}
              </div>

              {/* Questions */}
              <ul className="grid gap-3 border-t border-black/5 px-4 py-4 dark:border-white/10">
                {sec.questions.map((q, qIdx) => (
                  <li
                    key={q.id}
                    className={[
                      "relative rounded-xl border border-black/5 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-900",
                      "before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:rounded-l-xl",
                      KIND_LEFT[q.kind],
                    ].join(" ")}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                            KIND_BADGE[q.kind],
                          ].join(" ")}
                          title={`Question type: ${q.kind}`}
                        >
                          {q.kind}
                        </span>
                        <select
                          className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                          value={q.kind}
                          onChange={(e) => updateQuestion(sec.id, q.id, { kind: e.target.value })}
                        >
                          {KIND_OPTIONS.map((k) => (
                            <option key={k} value={k}>
                              {k}
                            </option>
                          ))}
                        </select>
                        <label className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            className="accent-indigo-600"
                            checked={!!q.required}
                            onChange={(e) => updateQuestion(sec.id, q.id, { required: e.target.checked })}
                          />
                          required
                        </label>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className="text-white rounded-md border border-black/10 bg-white px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border-white/10 dark:bg-slate-900 dark:hover:bg-slate-800"
                          disabled={qIdx === 0}
                          onClick={() => moveQuestion(sec.id, q.id, -1)}
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          className="text-white rounded-md border border-black/10 bg-white px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border-white/10 dark:bg-slate-900 dark:hover:bg-slate-800"
                          disabled={qIdx === sec.questions.length - 1}
                          onClick={() => moveQuestion(sec.id, q.id, +1)}
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 dark:border-white/10 dark:bg-slate-900 dark:hover:bg-red-900/20"
                          onClick={() => {
                            if (confirm("Delete this question?")) deleteQuestion(sec.id, q.id);
                          }}
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Label */}
                    <input
                      className="mt-2 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                      placeholder="Question label"
                      value={q.label}
                      onChange={(e) => updateQuestion(sec.id, q.id, { label: e.target.value })}
                    />

                    {/* Editors by kind */}
                    {["single", "multi"].includes(q.kind) && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          Options (comma separated)
                        </div>
                        <textarea
                          className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                          rows={2}
                          value={(q.options || []).join(", ")}
                          onChange={(e) =>
                            updateQuestion(sec.id, q.id, {
                              options: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      </div>
                    )}

                    {q.kind === "short" && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-slate-600 dark:text-slate-400">Max length</span>
                        <input
                          type="number"
                          className="w-28 rounded-md border border-black/10 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                          value={q.maxLength ?? 120}
                          onChange={(e) =>
                            updateQuestion(sec.id, q.id, { maxLength: Number(e.target.value) || 0 })
                          }
                        />
                      </div>
                    )}

                    {q.kind === "long" && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-slate-600 dark:text-slate-400">Max length</span>
                        <input
                          type="number"
                          className="w-28 rounded-md border border-black/10 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                          value={q.maxLength ?? 600}
                          onChange={(e) =>
                            updateQuestion(sec.id, q.id, { maxLength: Number(e.target.value) || 0 })
                          }
                        />
                      </div>
                    )}

                    {q.kind === "number" && (
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300">
                          min
                          <input
                            type="number"
                            className="w-24 rounded-md border border-black/10 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                            value={q.min ?? ""}
                            onChange={(e) =>
                              updateQuestion(sec.id, q.id, {
                                min: e.target.value === "" ? undefined : Number(e.target.value),
                              })
                            }
                          />
                        </label>
                        <label className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300">
                          max
                          <input
                            type="number"
                            className="w-24 rounded-md border border-black/10 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                            value={q.max ?? ""}
                            onChange={(e) =>
                              updateQuestion(sec.id, q.id, {
                                max: e.target.value === "" ? undefined : Number(e.target.value),
                              })
                            }
                          />
                        </label>
                      </div>
                    )}

                    {q.kind === "file" && (
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        File upload is a stub in runtime.
                      </div>
                    )}

                    {/* Conditional */}
                    <fieldset className="mt-3 rounded-lg border border-black/10 p-2 dark:border-white/10">
                      <legend className="px-1 text-xs text-slate-600 dark:text-slate-400">
                        Conditional (showIf)
                      </legend>
                      <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                          Depends on
                          <select
                            className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                            value={q.showIf ? Object.keys(q.showIf)[0] : ""}
                            onChange={(e) => {
                              const depId = e.target.value;
                              if (!depId) return setShowIf(sec.id, q.id, null, null);
                              const dep = allQuestionChoices.find((d) => d.id === depId);
                              const def =
                                dep?.kind === "single"
                                  ? dep.options?.[0] ?? ""
                                  : dep?.kind === "multi"
                                  ? dep.options?.[0] ?? ""
                                  : "";
                              setShowIf(sec.id, q.id, depId, def);
                            }}
                          >
                            <option value="">(none)</option>
                            {allQuestionChoices
                              .filter((d) => d.id !== q.id)
                              .map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.label} ({d.kind})
                                </option>
                              ))}
                          </select>
                        </label>

                        {q.showIf && (
                          <>
                            <span className="text-xs text-slate-500 dark:text-slate-400">=</span>
                            {(() => {
                              const depId = Object.keys(q.showIf)[0];
                              const dep = allQuestionChoices.find((d) => d.id === depId);
                              const val = q.showIf[depId];
                              if (dep?.kind === "single" || dep?.kind === "multi") {
                                return (
                                  <select
                                    className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                                    value={val ?? ""}
                                    onChange={(e) => setShowIf(sec.id, q.id, depId, e.target.value)}
                                  >
                                    {(dep.options || []).map((o) => (
                                      <option key={o} value={o}>
                                        {o}
                                      </option>
                                    ))}
                                  </select>
                                );
                              }
                              return (
                                <input
                                  className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                                  value={val ?? ""}
                                  onChange={(e) => setShowIf(sec.id, q.id, depId, e.target.value)}
                                />
                              );
                            })()}

                            <button
                              className="text-red-500 ml-auto rounded-md border border-black/10 bg-white px-2 py-1 text-xs hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border-white/10 dark:bg-slate-900 dark:hover:bg-slate-800"
                              onClick={() => setShowIf(sec.id, q.id, null, null)}
                              type="button"
                            >
                              Clear
                            </button>
                          </>
                        )}
                      </div>
                    </fieldset>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      {/* RIGHT — PREVIEW */}
      <aside className="lg:sticky lg:top-24 h-max">
        <div className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Live Preview
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Read-only mock
            </span>
          </div>
          <AssessmentPreview schema={schema} onChange={() => {}} />
        </div>
      </aside>
    </div>
  );
}
