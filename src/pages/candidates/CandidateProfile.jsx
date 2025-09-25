import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useCandidates, useTimeline } from "../../features/candidates/queries";
import { db } from "../../db/dexie";

function Mentions({ text }) {
  if (!text) return null;
  const parts = String(text).split(/(@[a-z0-9_]+)/gi);
  return (
    <p className="whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-100">
      {parts.map((p, i) =>
        p.startsWith("@") ? (
          <span key={i} className="font-medium text-indigo-600 dark:text-indigo-300">{p}</span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </p>
  );
}

function MentionSuggestions({ query, options, onPick }) {
  if (!query) return null;
  const q = query.toLowerCase();
  const list = options
    .filter((u) => u.name.toLowerCase().startsWith(q) || u.id.toLowerCase().startsWith(q))
    .slice(0, 6);
  if (list.length === 0) return null;
  return (
    <div className="absolute z-20 mt-1 w-64 overflow-hidden rounded-lg border border-black/5 bg-white shadow-lg dark:border-white/10 dark:bg-slate-900">
      {list.map((u) => (
        <button
          key={u.id}
          className="block w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-slate-800"
          onClick={() => onPick(u)}
          type="button"
        >
          @{u.id} <span className="text-xs text-slate-500">({u.name})</span>
        </button>
      ))}
    </div>
  );
}

export default function CandidateProfile() {
  const { id } = useParams();
  const qc = useQueryClient();
  const all = useCandidates({ page: 1, pageSize: 9999 }).data?.items || [];
  const cand = all.find((c) => c.id === id);
  const timeline = useTimeline(id).data || [];
  const [users, setUsers] = useState([]);
  useEffect(() => { db.users?.toArray?.().then(setUsers).catch(() => setUsers([])); }, []);
  const [note, setNote] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const textareaRef = useRef(null);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const val = el.value;
    const caret = el.selectionStart ?? val.length;
    const upto = val.slice(0, caret);
    const match = upto.match(/@([a-z0-9_]*)$/i);
    if (match) {
      setMentionQuery(match[1] || "");
      setShowSuggest(true);
    } else {
      setMentionQuery("");
      setShowSuggest(false);
    }
  }, [note]);

  async function addNote() {
    const text = note.trim();
    if (!text) return;
    await db.timelines.add({ candidateId: id, at: Date.now(), type: "note", payload: { text } });
    setNote("");
    setMentionQuery("");
    setShowSuggest(false);
    qc.invalidateQueries({ queryKey: ["timeline", id] });
  }

  function insertMention(user) {
    const el = textareaRef.current;
    if (!el) return;
    const val = el.value;
    const caret = el.selectionStart ?? val.length;
    const upto = val.slice(0, caret);
    const after = val.slice(caret);
    const replaced = upto.replace(/@([a-z0-9_]*)$/i, `@${user.id} `);
    const next = replaced + after;
    setNote(next);
    setShowSuggest(false);
    requestAnimationFrame(() => {
      const pos = replaced.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  const ordered = useMemo(() => [...timeline].sort((a, b) => (b.at || 0) - (a.at || 0)), [timeline]);
  if (!cand) return <div className="text-sm text-slate-600 dark:text-slate-300">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{cand.name}</h2>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{cand.email} · Stage: <b className="capitalize">{cand.stage}</b></div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/30">
            Candidate ID: {cand.id.slice(0, 8)}…
          </div>
        </div>
      </div>

      <div className="relative rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
        <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Add a note</label>
        <div className="relative mt-2">
          <textarea
            ref={textareaRef}
            rows={3}
            placeholder='E.g., Spoke with @ananya — moving to tech screen next week.'
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
          />
          {showSuggest && (
            <div className="absolute left-0 top-full">
              <MentionSuggestions query={mentionQuery} options={users} onPick={insertMention} />
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-end">
          <button
            onClick={addNote}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
          >
            Add note
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
        <h3 className="mb-2 font-medium text-slate-900 dark:text-white">Timeline</h3>
        <ul className="divide-y divide-black/5 rounded-xl border border-black/5 bg-white/70 dark:divide-white/10 dark:border-white/10 dark:bg-slate-900/60">
          {ordered.length === 0 && (
            <li className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">No timeline yet.</li>
          )}
          {ordered.map((ev) => (
            <li key={ev.id || ev.at} className="px-4 py-3">
              <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {new Date(ev.at).toLocaleString()}
              </div>
              {ev.type === "note" ? (
                <Mentions text={ev.payload?.text} />
              ) : ev.type === "stage" || ev.type === "stage_change" ? (
                <div className="text-sm text-slate-800 dark:text-slate-200">
                  Stage → <b className="capitalize">{ev.payload?.stage}</b>
                </div>
              ) : (
                <div className="text-sm text-slate-700 dark:text-slate-300">Event</div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
