"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const API_ORIGIN = (() => {
  try {
    return new URL(API).origin;
  } catch {
    return "";
  }
})();

export type Profile = { username: string; email: string; avatar: string | null };
type Msg = { type: "ok" | "err"; text: string } | null;

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export const authHeaders = (): Record<string, string> => {
  const t = localStorage.getItem("anicatz_access");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

export const absUrl = (u: string | null) => (u && u.startsWith("/") ? `${API_ORIGIN}${u}` : u);

const CameraIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

const SunIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const MoonIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    className={`h-4 w-4 shrink-0 text-white/60 transition-transform ${open ? "rotate-180" : ""}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export function Avatar({ src, name, className }: { src: string | null; name: string; className: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={`${className} object-cover`} />;
  }
  return (
    <span className={`${className} grid place-items-center bg-gradient-to-br from-[#c8ff3d] to-[#7c5cff] font-display font-black text-black`}>
      {(name.trim()[0] ?? "U").toUpperCase()}
    </span>
  );
}

const inputCls =
  "w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-teal-400";

export default function ProfileSettings({
  profile,
  onUpdate,
  theme,
  onToggleTheme,
  page = false,
}: {
  profile: Profile | null;
  onUpdate: (p: Profile) => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  /** true = full-page mode (used by /profile): always expanded, no accordion header, no card wrapper. */
  page?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const expanded = page || open;
  const [name, setName] = useState(profile?.username ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ old: "", next: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<Msg>(null);

  // Keep the name field in sync when the profile loads or changes.
  useEffect(() => {
    if (profile) setName(profile.username);
  }, [profile]);

  // Free the temporary preview URL.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setMsg({ type: "err", text: "Choose an image file." });
    if (f.size > MAX_AVATAR_BYTES) return setMsg({ type: "err", text: "Image must be under 2 MB." });
    setMsg(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const trimmed = name.trim();
  const dirty = !!file || (trimmed !== "" && trimmed !== profile?.username);

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setMsg(null);
    try {
      const fd = new FormData();
      if (trimmed && trimmed !== profile?.username) fd.set("username", trimmed);
      if (file) fd.set("avatar", file);
      const r = await fetch(`${API}/auth/profile/`, { method: "PATCH", headers: authHeaders(), body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || data?.username?.[0] || data?.avatar?.[0] || "Could not save changes.");
      onUpdate(data);
      setName(data.username);
      setFile(null);
      setPreview(null);
      setMsg({ type: "ok", text: "Profile updated." });
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Could not save changes." });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (pwBusy) return;
    if (pw.next.length < 8) return setPwMsg({ type: "err", text: "New password needs at least 8 characters." });
    setPwBusy(true);
    setPwMsg(null);
    try {
      const r = await fetch(`${API}/auth/change-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ old_password: pw.old, new_password: pw.next }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || data?.old_password?.[0] || data?.new_password?.[0] || "Could not change password.");
      setPw({ old: "", next: "" });
      setPwMsg({ type: "ok", text: "Password changed." });
    } catch (e) {
      setPwMsg({ type: "err", text: e instanceof Error ? e.message : "Could not change password." });
    } finally {
      setPwBusy(false);
    }
  };

  const shownAvatar = preview ?? absUrl(profile?.avatar ?? null);
  const shownName = profile?.username ?? "A";

  return (
    <div className={page ? "" : "mb-3 rounded-2xl bg-white/5 p-2"}>
      {/* Header row (dropdown mode only): click to expand the settings */}
      {!page && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-xl p-1 text-left hover:bg-white/5"
        >
          <Avatar src={absUrl(profile?.avatar ?? null)} name={shownName} className="h-11 w-11 shrink-0 rounded-full text-lg" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{profile?.username ?? "Your profile"}</span>
            <span className="block truncate text-xs text-white/50">Profile settings</span>
          </span>
          <ChevronIcon open={open} />
        </button>
      )}

      {expanded && (
        <div className={page ? "" : "px-1 pb-1 pt-3"}>
          {/* Picture */}
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0">
              <Avatar src={shownAvatar} name={shownName} className="h-16 w-16 rounded-full text-2xl" />
              <button
                type="button"
                aria-label="Change profile picture"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-teal-400 text-black shadow-lg hover:brightness-110"
              >
                <CameraIcon />
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-white/50">{profile?.email}</p>
              <button type="button" onClick={() => fileRef.current?.click()} className="mt-1 text-xs font-semibold text-teal-400 hover:underline">
                Change picture
              </button>
            </div>
          </div>

          {/* Name */}
          <label className="mb-1 mt-4 block px-1 text-xs font-semibold text-white/50" htmlFor="profile-name">
            Display name
          </label>
          <input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={150} className={inputCls} />

          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="mt-3 w-full rounded-xl bg-teal-400 py-2.5 text-sm font-semibold text-black transition enabled:hover:brightness-110 disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          {msg && <p className={`mt-2 px-1 text-xs ${msg.type === "ok" ? "text-teal-400" : "text-red-400"}`} role="status">{msg.text}</p>}

          {/* Appearance */}
          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="mb-2 px-1 text-xs font-semibold text-white/50">Appearance</p>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Theme">
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={theme === t}
                  onClick={() => theme !== t && onToggleTheme()}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                    theme === t ? "bg-teal-400 text-black" : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  {t === "light" ? <SunIcon /> : <MoonIcon />}
                  {t === "light" ? "Light" : "Dark"}
                </button>
              ))}
            </div>
          </div>

          {/* Shortcuts */}
          <div className="mt-3 border-t border-white/10 pt-2">
            <Link href="/watchlist" className="block rounded-xl px-2 py-2 text-sm text-white/80 hover:bg-white/10">
              My watchlist
            </Link>
            <button
              type="button"
              aria-expanded={pwOpen}
              onClick={() => setPwOpen((v) => !v)}
              className="block w-full rounded-xl px-2 py-2 text-left text-sm text-white/80 hover:bg-white/10"
            >
              Change password
            </button>

            {pwOpen && (
              <div className="mt-2 grid gap-2">
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Current password"
                  aria-label="Current password"
                  value={pw.old}
                  onChange={(e) => setPw({ ...pw, old: e.target.value })}
                  className={inputCls}
                />
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="New password"
                  aria-label="New password"
                  value={pw.next}
                  onChange={(e) => setPw({ ...pw, next: e.target.value })}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={changePassword}
                  disabled={!pw.old || !pw.next || pwBusy}
                  className="rounded-xl bg-white/10 py-2.5 text-sm font-semibold transition enabled:hover:bg-white/20 disabled:opacity-40"
                >
                  {pwBusy ? "Updating..." : "Update password"}
                </button>
                {pwMsg && <p className={`px-1 text-xs ${pwMsg.type === "ok" ? "text-teal-400" : "text-red-400"}`} role="status">{pwMsg.text}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}