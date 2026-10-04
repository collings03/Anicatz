"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const input = "w-full rounded bg-[#201f31] px-3 py-2.5 text-white outline-none ring-1 ring-white/10 focus:ring-pink-300";

const firstError = (body: unknown) =>
  Object.values((body ?? {}) as Record<string, unknown>).flat().join(" ") || "Something went wrong.";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const post = (path: string, body: object) =>
      fetch(`${API}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    try {
      if (mode === "register") {
        const r = await post("/auth/register/", { username, email, password });
        if (!r.ok) throw new Error(firstError(await r.json().catch(() => ({}))));
      }
      const t = await post("/auth/token/", { username, password });
      if (!t.ok) throw new Error("Wrong username or password.");
      const { access, refresh } = await t.json();
      localStorage.setItem("anicatz_access", access);
      localStorage.setItem("anicatz_refresh", refresh);
      window.dispatchEvent(new Event("anicatz-auth"));
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-16">
      <h1 className="mb-6 text-3xl font-bold">{mode === "login" ? "Login" : "Create account"}</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className={input} placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
        {mode === "register" && (
          <input className={input} type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        )}
        <input className={input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === "login" ? "current-password" : "new-password"} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={busy} className="w-full rounded bg-pink-300 py-2.5 font-semibold text-black hover:bg-pink-200 disabled:opacity-60">
          {busy ? "Please wait..." : mode === "login" ? "Login" : "Sign up"}
        </button>
      </form>
      <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} className="mt-4 text-sm text-neutral-400 hover:text-white">
        {mode === "login" ? "No account? Sign up" : "Already have an account? Login"}
      </button>
    </main>
  );
}