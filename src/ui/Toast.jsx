import { createContext, useContext, useRef, useState, useMemo, useCallback, useEffect } from "react";

const ToastCtx = createContext({
  push: () => {},
  info: () => {},
  success: () => {},
  warn: () => {},
  error: () => {},
});

const VARIANTS = {
  info: {
    ring: "ring-sky-400/30",
    border: "border-sky-400/40",
    bg: "bg-white/75 dark:bg-slate-900/75",
    accent: "text-sky-600 dark:text-sky-300",
    bar: "bg-sky-500",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2m1 15h-2v-6h2zm0-8h-2V7h2z"/></svg>
    ),
  },
  success: {
    ring: "ring-emerald-400/30",
    border: "border-emerald-400/40",
    bg: "bg-white/75 dark:bg-slate-900/75",
    accent: "text-emerald-600 dark:text-emerald-300",
    bar: "bg-emerald-500",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2m-1.1 14.2l-3.6-3.6l1.4-1.4l2.2 2.2l5-5l1.4 1.4z"/></svg>
    ),
  },
  warn: {
    ring: "ring-amber-400/30",
    border: "border-amber-400/40",
    bg: "bg-white/75 dark:bg-slate-900/75",
    accent: "text-amber-600 dark:text-amber-300",
    bar: "bg-amber-500",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M1 21h22L12 2zm12-3h-2v-2h2zm0-4h-2v-4h2z"/></svg>
    ),
  },
  error: {
    ring: "ring-rose-400/30",
    border: "border-rose-400/40",
    bg: "bg-white/75 dark:bg-slate-900/75",
    accent: "text-rose-600 dark:text-rose-300",
    bar: "bg-rose-500",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2m5 13.6L15.6 17L12 13.4L8.4 17L7 15.6L10.6 12L7 8.4L8.4 7L12 10.6L15.6 7L17 8.4L13.4 12z"/></svg>
    ),
  },
};

function ToastItem({ id, msg, type, title, action, onClose, duration = 3000 }) {
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const start = useRef(Date.now());
  const remaining = useRef(duration);
  const timer = useRef(null);

  const v = VARIANTS[type] || VARIANTS.info;

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const schedule = (ms) => {
    clear();
    timer.current = setTimeout(() => {
      setVisible(false);
      // wait for exit transition then remove
      setTimeout(onClose, 180);
    }, ms);
  };

  useEffect(() => {
    setVisible(true);
    schedule(remaining.current);
    return clear;
  }, []);

  const onMouseEnter = () => {
    setPaused(true);
    remaining.current -= Date.now() - start.current;
    clear();
  };
  const onMouseLeave = () => {
    setPaused(false);
    start.current = Date.now();
    schedule(remaining.current);
  };

  // progress percentage (shrinks to 0)
  const progressPct = Math.max(0, Math.min(100, (remaining.current - (paused ? 0 : Date.now() - start.current)) / duration * 100));

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={[
        "group relative w-[360px] max-w-[90vw]",
        "rounded-2xl border backdrop-blur supports-[backdrop-filter]:bg-opacity-75",
        "shadow-xl ring-1 p-3 sm:p-4",
        v.bg, v.border, v.ring,
        "transition-all duration-200",
        visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95",
      ].join(" ")}
    >
      {/* Accent glow */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/5 dark:ring-white/5" />

      <div className="flex gap-3">
        <div className={`shrink-0 mt-0.5 ${v.accent}`}>{v.icon}</div>
        <div className="min-w-0">
          {title && <div className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</div>}
          <div className="text-sm text-slate-700 dark:text-slate-300 break-words">
            {msg}
          </div>

          {action?.label && (
            <button
              onClick={action.onClick}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium underline-offset-4 hover:underline text-slate-900 dark:text-slate-100"
            >
              {action.label}
            </button>
          )}
        </div>

        <button
          aria-label="Close"
          onClick={() => { setVisible(false); setTimeout(onClose, 180); }}
          className="ml-auto h-7 w-7 rounded-md grid place-items-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M19 6.4L17.6 5L12 10.6L6.4 5L5 6.4L10.6 12L5 17.6L6.4 19L12 13.4L17.6 19L19 17.6L13.4 12z"/></svg>
        </button>
      </div>

      {/* Progress bar (bottom) */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/60">
        <div
          className={`h-full ${v.bar} transition-[width] duration-100`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}

export function ToastProvider({
  children,
  position = "bottom-right", // 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  max = 4,
  defaultDuration = 3000,
}) {
  const [items, setItems] = useState([]);

  const remove = useCallback((id) => {
    setItems((xs) => xs.filter((i) => i.id !== id));
  }, []);

  const push = useCallback((payload, maybeType) => {
    // flexible: push("Saved!") or push({ msg, title, type, duration })
    const base =
      typeof payload === "string"
        ? { msg: payload, type: maybeType || "info" }
        : payload;

    const id = crypto.randomUUID();
    const entry = { id, duration: defaultDuration, ...base };
    setItems((xs) => {
      const next = [...xs, entry];
      return next.slice(Math.max(0, next.length - max));
    });
    return id;
  }, [defaultDuration, max]);

  const api = useMemo(
    () => ({
      push,
      info: (msg, opts) => push({ msg, type: "info", ...opts }),
      success: (msg, opts) => push({ msg, type: "success", ...opts }),
      warn: (msg, opts) => push({ msg, type: "warn", ...opts }),
      error: (msg, opts) => push({ msg, type: "error", ...opts }),
    }),
    [push]
  );

  const pos =
    position === "top-right"
      ? "top-4 right-4"
      : position === "top-left"
      ? "top-4 left-4"
      : position === "bottom-left"
      ? "bottom-4 left-4"
      : "bottom-4 right-4";

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div
        className={[
          "pointer-events-none fixed z-[9999] flex flex-col gap-3",
          pos,
        ].join(" ")}
      >
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem
              {...t}
              onClose={() => remove(t.id)}
              type={t.type || "info"}
              duration={t.duration ?? defaultDuration}
            />
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
