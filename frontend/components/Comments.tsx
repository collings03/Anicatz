"use client";
import { useCallback, useEffect, useState } from "react";
import { Avatar, absUrl, authHeaders } from "@/components/Profilemenu";

const API = (
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production" ? "https://anicatz-7v6u.vercel.app/api" : "http://localhost:8000/api")
).replace(/\/+$/, "");

type CommentT = {
  id: number;
  body: string;
  created_at: string;
  username: string;
  avatar: string | null;
  mine: boolean;
  parent: number | null;
  replies: CommentT[];
};

const ago = (iso: string) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const units: [number, string][] = [[31536000, "y"], [2592000, "mo"], [86400, "d"], [3600, "h"], [60, "m"]];
  for (const [n, u] of units) if (s >= n) return `${Math.floor(s / n)}${u} ago`;
  return "just now";
};

function Composer({
  placeholder,
  busy,
  onSubmit,
  onCancel,
  autoFocus,
}: {
  placeholder: string;
  busy: boolean;
  onSubmit: (text: string) => Promise<boolean>;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const send = async () => {
    if (!text.trim() || busy) return;
    if (await onSubmit(text.trim())) setText("");
  };
  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={1000}
        rows={3}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-teal-400"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-white/40">{text.length}/1000</span>
        <div className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="min-h-[40px] rounded-xl px-4 text-sm text-white/70 hover:bg-white/10">
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={send}
            disabled={!text.trim() || busy}
            className="min-h-[40px] rounded-xl bg-teal-400 px-5 text-sm font-semibold text-black transition enabled:hover:brightness-110 disabled:opacity-40"
          >
            {busy ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Comments({ animeId, episode }: { animeId: number; episode?: number }) {
  const [items, setItems] = useState<CommentT[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);

  const query = `anime=${animeId}${episode ? `&episode=${episode}` : ""}`;

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const r = await fetch(`${API}/comments/?${query}&page=${p}`);
        if (!r.ok) throw new Error();
        const data = await r.json();
        setItems((prev) => (p === 1 ? data.results : [...prev, ...data.results]));
        setHasMore(!!data.next);
        setPage(p);
        setError("");
      } catch {
        setError("Could not load comments.");
      } finally {
        setLoading(false);
      }
    },
    [query]
  );

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem("anicatz_access"));
    load(1);
  }, [load]);

  const post = async (body: string, parent: number | null) => {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`${API}/comments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ anime_id: animeId, episode: episode ?? null, parent, body }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const first = (v: unknown) => (Array.isArray(v) ? String(v[0]) : typeof v === "string" ? v : "");
        throw new Error(
          r.status === 401
            ? "Please log in again."
            : r.status === 429
            ? "Slow down a little."
            : first(data.body) || first(data.non_field_errors) || first(data.detail) || "Could not post."
        );
      }
      if (parent) {
        setItems((prev) => prev.map((c) => (c.id === parent ? { ...c, replies: [...c.replies, data] } : c)));
        setReplyTo(null);
      } else {
        setItems((prev) => [data, ...prev]);
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: CommentT) => {
    if (!confirm("Delete this comment?")) return;
    const r = await fetch(`${API}/comments/${c.id}/`, { method: "DELETE", headers: authHeaders() });
    if (!r.ok) return setError("Could not delete.");
    setItems((prev) =>
      c.parent
        ? prev.map((p) => (p.id === c.parent ? { ...p, replies: p.replies.filter((x) => x.id !== c.id) } : p))
        : prev.filter((p) => p.id !== c.id)
    );
  };

  const total = items.reduce((n, c) => n + 1 + c.replies.length, 0);

  const Row = ({ c, isReply }: { c: CommentT; isReply?: boolean }) => (
    <div className="flex gap-3">
      <Avatar
        src={absUrl(c.avatar)}
        name={c.username}
        className={`${isReply ? "h-8 w-8 text-sm" : "h-10 w-10 text-base"} shrink-0 rounded-full`}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-semibold">{c.username}</span>
          <span className="ml-2 text-xs text-white/40">{ago(c.created_at)}</span>
        </p>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-white/85">{c.body}</p>
        <div className="mt-1 flex gap-4 text-xs font-semibold text-white/50">
          {!isReply && loggedIn && (
            <button type="button" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} className="min-h-[32px] hover:text-teal-400">
              Reply
            </button>
          )}
          {c.mine && (
            <button type="button" onClick={() => remove(c)} className="min-h-[32px] hover:text-red-400">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <section aria-label="Comments" className="min-w-0 space-y-5">
      <h2 className="text-lg font-semibold">
        Comments <span className="text-sm font-normal text-white/40">{total > 0 ? `(${total})` : ""}</span>
      </h2>

      {loggedIn ? (
        <Composer placeholder="Share your thoughts..." busy={busy} onSubmit={(t) => post(t, null)} />
      ) : (
        <p className="rounded-xl bg-white/5 px-4 py-3 text-sm text-white/60">Log in to join the conversation.</p>
      )}

      {error && <p className="text-sm text-red-400" role="status">{error}</p>}

      <ul className="space-y-5">
        {items.map((c) => (
          <li key={c.id} className="space-y-3">
            <Row c={c} />
            {(c.replies.length > 0 || replyTo === c.id) && (
              <div className="ml-5 space-y-3 border-l border-white/10 pl-4 sm:ml-12">
                {c.replies.map((r) => (
                  <Row key={r.id} c={r} isReply />
                ))}
                {replyTo === c.id && (
                  <Composer
                    autoFocus
                    placeholder={`Reply to ${c.username}...`}
                    busy={busy}
                    onSubmit={(t) => post(t, c.id)}
                    onCancel={() => setReplyTo(null)}
                  />
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {!loading && items.length === 0 && !error && (
        <p className="text-sm text-white/50">No comments yet. Be the first.</p>
      )}
      {loading && <p className="text-sm text-white/50">Loading...</p>}

      {hasMore && !loading && (
        <button
          type="button"
          onClick={() => load(page + 1)}
          className="min-h-[44px] w-full rounded-xl bg-white/10 text-sm font-semibold hover:bg-white/20"
        >
          Load more comments
        </button>
      )}
    </section>
  );
}