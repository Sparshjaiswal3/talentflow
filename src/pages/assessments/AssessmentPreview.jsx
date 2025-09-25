import { useState, useEffect, useMemo } from "react";
import "./preview.pcss"; // <-- scoped styles only for this component

const EMPTY = Object.freeze({});

function shouldShow(q, answers) {
  if (!q?.showIf) return true;
  const [[dep, val]] = Object.entries(q.showIf);
  return (answers ?? EMPTY)[dep] === val;
}

export default function AssessmentPreview({
  schema,
  initialAnswers,
  onChange,
  readOnly = false,
  className = "",
}) {
  const [answers, setAnswers] = useState(() => initialAnswers ?? EMPTY);

  useEffect(() => {
    if (initialAnswers !== undefined && initialAnswers !== answers) {
      setAnswers(initialAnswers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAnswers]);

  const visibleMap = useMemo(() => {
    const m = new Set();
    for (const sec of schema?.sections || []) {
      for (const q of sec.questions || []) {
        if (shouldShow(q, answers)) m.add(q.id);
      }
    }
    return m;
  }, [schema, answers]);

  function update(id, value) {
    setAnswers((prev) => {
      const next = { ...prev, [id]: value };
      // clear dependent answers that are no longer visible
      for (const sec of schema?.sections || []) {
        for (const q of sec.questions || []) {
          if (!shouldShow(q, next) && next[q.id] !== undefined) delete next[q.id];
        }
      }
      onChange?.(next);
      return next;
    });
  }

  return (
    <div className={`tf-ap space-y-4 ${className}`}>
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight a-fg">
          {schema?.title || "Assessment Preview"}
        </h3>

        {!readOnly && (
          <button
            type="button"
            className="a-btn a-btn-ghost"
            onClick={() => {
              setAnswers(EMPTY);
              onChange?.({});
            }}
            title="Reset answers"
          >
            Reset
          </button>
        )}
      </header>

      {(schema?.sections || []).map((sec, si) => (
        <section
          key={sec.id}
          className="a-card"
          aria-labelledby={`sec-${sec.id}`}
          role="group"
        >
          <div className="a-card-head">
            <h4
              id={`sec-${sec.id}`}
              className="a-sec-title"
            >
              {sec.title || `Section ${si + 1}`}
            </h4>
            <span className="a-sec-count" aria-label="Question count">
              {(sec.questions || []).length} items
            </span>
          </div>

          <ul className="a-q-list">
            {(sec.questions || []).map((q) => {
              if (!visibleMap.has(q.id)) return null;
              const val = answers[q.id];
              const disabled = readOnly;

              return (
                <li key={q.id} className="a-q-item">
                  <div className="grid gap-1.5 text-sm">
                    <label
                      htmlFor={q.id}
                      className="a-label"
                    >
                      <span className="font-medium">{q.label || "Untitled question"}</span>
                      {q.required && (
                        <span
                          className="a-required"
                          aria-label="Required"
                          title="Required"
                        >
                          REQUIRED
                        </span>
                      )}
                    </label>

                    {/* SINGLE */}
                    {q.kind === "single" && (
                      <select
                        id={q.id}
                        className="a-input w-full"
                        disabled={disabled}
                        value={val || ""}
                        onChange={(e) => update(q.id, e.target.value)}
                      >
                        <option value="">Select…</option>
                        {(q.options || []).map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* MULTI */}
                    {q.kind === "multi" && (
                      <div className="flex flex-wrap gap-2">
                        {(q.options || []).map((o) => {
                          const checked = Array.isArray(val) && val.includes(o);
                          return (
                            <label key={o} className="a-chip">
                              <input
                                type="checkbox"
                                className="a-checkbox"
                                disabled={disabled}
                                checked={!!checked}
                                onChange={(e) => {
                                  const set = new Set(Array.isArray(val) ? val : []);
                                  e.target.checked ? set.add(o) : set.delete(o);
                                  update(q.id, Array.from(set));
                                }}
                              />
                              <span className="text-xs">{o}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* SHORT */}
                    {q.kind === "short" && (
                      <>
                        <input
                          id={q.id}
                          className="a-input w-full"
                          disabled={disabled}
                          maxLength={q.maxLength || 120}
                          value={val || ""}
                          onChange={(e) => update(q.id, e.target.value)}
                          placeholder="Type your answer"
                        />
                        {!!q.maxLength && (
                          <div className="a-help text-right">
                            {(val?.length || 0)}/{q.maxLength}
                          </div>
                        )}
                      </>
                    )}

                    {/* LONG */}
                    {q.kind === "long" && (
                      <>
                        <textarea
                          id={q.id}
                          className="a-input w-full nice-scroll"
                          disabled={disabled}
                          rows={4}
                          maxLength={q.maxLength || 600}
                          value={val || ""}
                          onChange={(e) => update(q.id, e.target.value)}
                          placeholder="Type your detailed answer"
                        />
                        {!!q.maxLength && (
                          <div className="a-help text-right">
                            {(val?.length || 0)}/{q.maxLength}
                          </div>
                        )}
                      </>
                    )}

                    {/* NUMBER */}
                    {q.kind === "number" && (
                      <div className="flex items-center gap-2">
                        <input
                          id={q.id}
                          type="number"
                          className="a-input w-40"
                          disabled={disabled}
                          min={q.min ?? undefined}
                          max={q.max ?? undefined}
                          value={val ?? ""}
                          onChange={(e) => update(q.id, e.target.value)}
                          placeholder={
                            q.min != null && q.max != null
                              ? `${q.min} – ${q.max}`
                              : "Enter a number"
                          }
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

                    {/* FILE (preview only) */}
                    {q.kind === "file" && (
                      <div className="a-help">File upload is disabled in preview.</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
