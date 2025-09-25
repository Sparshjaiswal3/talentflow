import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiGet, apiSend } from "../../lib/api";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useDebouncedCallback } from "../../lib/useDebouncedCallback";
import { loadDraft, saveDraft, clearDraft } from "../../features/assessments/service";
import { useToast } from "../../ui/Toast";
import "./runtime.pcss"; // <-- scoped, visible-only styles for THIS page

function shouldShow(q, values) {
  if (!q?.showIf) return true;
  const [[dep, val]] = Object.entries(q.showIf);
  return values?.[dep] === val;
}

function buildSchema(schema) {
  const shape = {};
  for (const sec of schema.sections || []) {
    for (const q of sec.questions || []) {
      let s;
      switch (q.kind) {
        case "single": {
          const base = z.string();
          s = q.required ? base.min(1, "Required") : base.optional().or(z.literal(""));
          break;
        }
        case "multi": {
          let arr = z.array(z.string());
          if (q.required) arr = arr.min(1, "Select at least one");
          s = arr.default([]);
          break;
        }
        case "short": {
          const max = q.maxLength || 120;
          let str = z.string().max(max, `Max ${max} chars`).or(z.literal(""));
          s = q.required ? str.min(1, "Required") : str;
          break;
        }
        case "long": {
          const max = q.maxLength || 600;
          let str = z.string().max(max, `Max ${max} chars`).or(z.literal(""));
          s = q.required ? str.min(1, "Required") : str;
          break;
        }
        case "number": {
          const min = q.min ?? Number.MIN_SAFE_INTEGER;
          const max = q.max ?? Number.MAX_SAFE_INTEGER;
          const base = z.preprocess(
            (v) => (v === "" || v === undefined ? undefined : Number(v)),
            z.number({ invalid_type_error: "Enter a number" }).min(min, `Min ${min}`).max(max, `Max ${max}`)
          );
          s = q.required ? base : base.optional();
          break;
        }
        case "file":
          s = z.any().optional();
          break;
        default:
          s = z.any();
      }
      shape[q.id] = s;
    }
  }
  return z.object(shape);
}

export default function AssessmentRun() {
  const { jobId } = useParams();
  const candidateId = "demo-candidate";
  const { push } = useToast();
  const [errorSummary, setErrorSummary] = useState([]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["assessment", jobId],
    queryFn: () => apiGet(`/assessments/${jobId}`),
  });

  const schema = data?.schema || { title: "", sections: [] };
  const hasContent = (schema.sections || []).some((s) => (s.questions || []).length > 0);

  const zodSchema = useMemo(() => buildSchema(schema), [schema]);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    getValues,
    setFocus,
    formState: { isSubmitting, errors },
  } = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: {},
    mode: "onSubmit",
  });

  useEffect(() => {
    (async () => {
      const draft = await loadDraft(jobId, candidateId);
      if (draft && Object.keys(draft).length) reset(draft);
    })();
  }, [jobId, candidateId, reset]);

  const debouncedSave = useDebouncedCallback(async (values) => {
    try { await saveDraft(jobId, candidateId, values); } catch {}
  }, 600);

  const values = watch();
  useEffect(() => { debouncedSave(values); }, [values, debouncedSave]);

  const submit = useMutation({
    mutationFn: (payload) => apiSend("POST", `/assessments/${jobId}/submit`, payload),
    onSuccess: async () => {
      await clearDraft(jobId, candidateId);
      push("Assessment submitted");
    },
    onError: (e) => push(e.message || "Submit failed", "error"),
  });

  async function onSubmit() {
    const v = getValues();
    const filtered = { ...v };
    for (const sec of schema.sections) {
      for (const q of sec.questions) {
        if (!shouldShow(q, v)) delete filtered[q.id];
      }
    }
    const parsed = zodSchema.safeParse(filtered);
    if (!parsed.success) {
      const issues = parsed.error.issues || [];
      setErrorSummary(issues.slice(0, 6).map((i) => ({ id: String(i.path?.[0] || ""), msg: i.message })));
      const first = issues[0];
      if (first?.path?.[0]) setFocus(String(first.path[0]));
      push(`Fix: ${first?.path?.[0]} — ${first?.message}`, "error");
      return;
    }
    setErrorSummary([]);
    submit.mutate({ candidateId, answers: filtered });
  }

  if (isLoading) return <div className="tf-assess">Loading assessment…</div>;
  if (isError)
    return (
      <div className="tf-assess a-card p-4">
        <div className="a-error">Failed to load: {String(error?.message || error)}</div>
      </div>
    );

  if (!hasContent) {
    return (
      <div className="tf-assess a-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">No Assessment Yet</h2>
            <p className="mt-1 a-subtle">
              Create an assessment in the builder, then come back to run it here.
            </p>
          </div>
          <Link
            to={`/assessments/${jobId}`}
            className="a-btn"
          >
            Open Builder
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="tf-assess space-y-5">
      {/* sticky header */}
      <header className="a-sticky sticky top-[calc(64px+1px)] -mx-4 px-4 py-3 sm:mx-0 sm:rounded-lg">
        <div className="mx-auto max-w-3xl flex items-center gap-3">
          <h2 className="text-lg font-semibold">{schema.title || "Assessment"}</h2>
          <span className="ms-auto text-xs a-subtle">
            Draft auto-saves · Candidate:{" "}
            <b className="a-muted"> {candidateId}</b>
          </span>
          <button
            className="ms-3 a-btn"
            disabled={isSubmitting || submit.isPending}
            onClick={handleSubmit(onSubmit)}
          >
            {submit.isPending ? "Submitting…" : "Submit"}
          </button>
        </div>
      </header>

      {/* error summary */}
      {errorSummary.length > 0 && (
        <div className="mx-auto max-w-3xl a-card border-red-300/70 bg-red-50/70 p-4 dark:bg-red-900/15">
          <div className="font-semibold mb-1" style={{ color: "#b91c1c" }}>Please fix:</div>
          <ul className="list-disc ms-5 space-y-0.5 text-sm" style={{ color: "#b91c1c" }}>
            {errorSummary.map((e, i) => (
              <li key={i}>
                <button type="button" className="underline decoration-dotted underline-offset-2" onClick={() => setFocus(e.id)}>
                  {e.id}
                </button>{" "}
                — {e.msg}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* sections */}
      <div className="mx-auto max-w-3xl space-y-4">
        {schema.sections.map((sec, sIdx) => (
          <section key={sec.id} className="a-card p-4" aria-labelledby={`sec-${sec.id}`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 id={`sec-${sec.id}`} className="text-sm font-semibold">
                {sec.title || `Section ${sIdx + 1}`}
              </h3>
              <span className="text-[11px] uppercase tracking-wide a-subtle">
                {sec.questions.length} items
              </span>
            </div>

            <ul className="space-y-4">
              {sec.questions.map((q) => {
                const visible = shouldShow(q, values);
                if (!visible) return null;

                return (
                  <li key={q.id}>
                    <div className="grid gap-1.5 text-sm">
                      <label htmlFor={q.id} className="a-label inline-flex items-start gap-1.5">
                        <span>{q.label || "Question"}</span>
                        {q.required && <span className="a-required">REQUIRED</span>}
                      </label>

                      {/* SINGLE */}
                      {q.kind === "single" && (
                        <Controller
                          control={control}
                          name={q.id}
                          defaultValue=""
                          render={({ field }) => (
                            <select id={q.id} className="w-full" {...field}>
                              <option value="">Select…</option>
                              {(q.options || []).map((o) => (
                                <option key={o} value={o}>{o}</option>
                              ))}
                            </select>
                          )}
                        />
                      )}

                      {/* MULTI */}
                      {q.kind === "multi" && (
                        <Controller
                          control={control}
                          name={q.id}
                          defaultValue={[]}
                          render={({ field }) => (
                            <div className="flex flex-wrap gap-2">
                              {(q.options || []).map((o) => {
                                const checked = (field.value || []).includes(o);
                                return (
                                  <label
                                    key={o}
                                    className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5"
                                  >
                                    <input
                                      type="checkbox"
                                      className="size-4"
                                      checked={checked}
                                      onChange={(e) => {
                                        const set = new Set(field.value || []);
                                        e.target.checked ? set.add(o) : set.delete(o);
                                        field.onChange(Array.from(set));
                                      }}
                                    />
                                    <span className="text-xs">{o}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        />
                      )}

                      {/* SHORT */}
                      {q.kind === "short" && (
                        <Controller
                          control={control}
                          name={q.id}
                          defaultValue=""
                          render={({ field }) => (
                            <>
                              <input
                                id={q.id}
                                className="w-full"
                                maxLength={q.maxLength || 120}
                                placeholder="Type your answer"
                                {...field}
                              />
                              {!!q.maxLength && (
                                <div className="a-help text-right">
                                  {(field.value?.length || 0)}/{q.maxLength}
                                </div>
                              )}
                            </>
                          )}
                        />
                      )}

                      {/* LONG */}
                      {q.kind === "long" && (
                        <Controller
                          control={control}
                          name={q.id}
                          defaultValue=""
                          render={({ field }) => (
                            <>
                              <textarea
                                id={q.id}
                                className="w-full nice-scroll"
                                rows={4}
                                maxLength={q.maxLength || 600}
                                placeholder="Type your detailed answer"
                                {...field}
                              />
                              {!!q.maxLength && (
                                <div className="a-help text-right">
                                  {(field.value?.length || 0)}/{q.maxLength}
                                </div>
                              )}
                            </>
                          )}
                        />
                      )}

                      {/* NUMBER */}
                      {q.kind === "number" && (
                        <Controller
                          control={control}
                          name={q.id}
                          render={({ field }) => (
                            <div className="flex items-center gap-2">
                              <input
                                id={q.id}
                                type="number"
                                className="w-44"
                                min={q.min ?? undefined}
                                max={q.max ?? undefined}
                                placeholder={
                                  q.min != null && q.max != null ? `${q.min} – ${q.max}` : "Enter a number"
                                }
                                {...field}
                              />
                              {(q.min != null || q.max != null) && (
                                <span className="a-help">
                                  {q.min != null ? `min ${q.min}` : null}
                                  {q.min != null && q.max != null ? " · " : null}
                                  {q.max != null ? `max ${q.max}` : null}
                                </span>
                              )}
                            </div>
                          )}
                        />
                      )}

                      {/* FILE (stub) */}
                      {q.kind === "file" && (
                        <div className="a-help">Upload disabled in demo</div>
                      )}

                      {/* Field error */}
                      {errors?.[q.id]?.message && (
                        <div className="a-error">{String(errors[q.id].message)}</div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* sticky submit bar */}
      <div className="sticky bottom-4 z-10 mx-auto max-w-3xl">
        <div className="a-sticky p-3 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs a-subtle">
              Review your answers before submitting. Draft is auto-saved.
            </div>
            <button
              className="a-btn"
              disabled={isSubmitting || submit.isPending}
              onClick={handleSubmit(onSubmit)}
            >
              {submit.isPending ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
