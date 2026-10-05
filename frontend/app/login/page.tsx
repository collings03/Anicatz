"use client";
// Save as: frontend/app/login/page.tsx
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Uses NEXT_PUBLIC_API_URL when set. Otherwise: the deployed backend in production, localhost in dev.
const API = (
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production" ? "https://anicatz-7v6u.vercel.app/api" : "http://localhost:8000/api")
).replace(/\/+$/, "");

const input =
  "w-full rounded-2xl bg-[#0f0e24] px-4 py-3 text-white placeholder:text-white/35 outline-none ring-1 ring-white/10 transition focus:ring-2 focus:ring-[#d9f96a]";

const firstError = (body: unknown) =>
  Object.values((body ?? {}) as Record<string, unknown>).flat().join(" ") || "Something went wrong.";

/** Reads a failed response: shows the server's own message, or the HTTP status if it crashed (HTML reply). */
const failMsg = async (r: Response) => {
  const text = await r.text();
  try {
    return firstError(JSON.parse(text));
  } catch {
    return `Server error (HTTP ${r.status}). Check the backend logs.`;
  }
};

type Mood = "happy" | "hiding" | "worried";

/** Your exact Anicatz mark (public/anicatz-mark.png). Paws cover its eyes while typing a password; it shakes on errors. */
function Cat({ mood, className = "h-32 w-32" }: { mood: Mood; className?: string }) {
  const paw = "absolute h-[17%] w-[24%] rounded-full bg-[#2a2852] ring-[3px] ring-[#d9f96a] will-change-transform [transition:transform_.5s_cubic-bezier(.22,1,.36,1),opacity_.3s_ease]";
  const hidden = mood !== "hiding";
  const pawStyle = { opacity: hidden ? 0 : 1, transform: hidden ? "translateY(60px)" : "none" };
  return (
    <div className={`relative ${className} ${mood === "worried" ? "animate-[anishake_.4s_ease-in-out]" : ""}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/anicatz-mark.png" alt="" className="h-full w-full object-contain" draggable={false} />
      <span className={paw} style={{ left: "29%", top: "42.5%", ...pawStyle }} />
      <span className={paw} style={{ left: "57.5%", top: "42.5%", ...pawStyle }} />
    </div>
  );
}

/* Pairs of cat eyes glowing in the dark: [x%, y%, scale] */
const EYES = [
  [5, 10, 1.1], [17, 22, 0.8], [8, 38, 1.25], [20, 50, 0.7], [5, 64, 1], [17, 78, 0.85], [9, 90, 1.2],
  [80, 8, 1.2], [88, 24, 0.9], [81, 40, 0.75], [89, 54, 1.3], [81, 68, 0.8], [90, 80, 1.1], [80, 91, 0.9],
] as const;

/**
 * Desktop-only left panel. Cats watch from the dark: every pupil tracks your cursor,
 * the big logo leans toward it, the eyes open one by one on load, and they all
 * squeeze into happy arcs while you type a password.
 */
function Watchers({ mood, markRef }: { mood: Mood; markRef: React.RefObject<HTMLDivElement | null> }) {
  const eyeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const closed = mood === "hiding";
  const worried = mood === "worried";

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const eyes = eyeRefs.current.filter(Boolean) as HTMLDivElement[];
    const pupils = eyes.map((el) => Array.from(el.querySelectorAll<HTMLElement>("[data-pupil]")));
    const centers = eyes.map(() => ({ x: 0, y: 0 }));
    const cur = eyes.map(() => ({ x: 0, y: 0 }));
    const mark = { x: 0, y: 0, r: 0 };
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let raf = 0;
    let last = 0;

    // measure once (and on resize) instead of every frame, so nothing forces layout while animating
    const measure = () => {
      eyes.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        centers[i] = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
    };

    const tick = (now: number) => {
      const dt = Math.min(now - last || 16.7, 64);
      last = now;
      // frame-rate independent easing: same feel on 60Hz and 144Hz screens
      const ease = (k: number) => 1 - Math.pow(1 - k, dt / 16.7);
      const kEye = ease(0.1);
      const kMark = ease(0.06);
      let moving = false;

      eyes.forEach((_, i) => {
        const dx = mouse.x - centers[i].x;
        const dy = mouse.y - centers[i].y;
        const a = Math.atan2(dy, dx);
        const d = Math.min(1, Math.hypot(dx, dy) / 320);
        const tx = Math.cos(a) * 6 * d;
        const ty = Math.sin(a) * 5 * d;
        cur[i].x += (tx - cur[i].x) * kEye;
        cur[i].y += (ty - cur[i].y) * kEye;
        if (Math.abs(tx - cur[i].x) > 0.01 || Math.abs(ty - cur[i].y) > 0.01) moving = true;
        const t = `translate3d(${cur[i].x.toFixed(2)}px, ${cur[i].y.toFixed(2)}px, 0)`;
        pupils[i].forEach((p) => (p.style.transform = t));
      });

      const nx = (mouse.x / window.innerWidth - 0.5) * 2;
      const ny = (mouse.y / window.innerHeight - 0.5) * 2;
      mark.x += (nx * 8 - mark.x) * kMark;
      mark.y += (ny * 6 - mark.y) * kMark;
      mark.r += (nx * 3 - mark.r) * kMark;
      if (Math.abs(nx * 8 - mark.x) > 0.02 || Math.abs(ny * 6 - mark.y) > 0.02) moving = true;
      if (markRef.current) {
        markRef.current.style.transform = `translate3d(${mark.x.toFixed(2)}px, ${mark.y.toFixed(2)}px, 0) rotate(${mark.r.toFixed(3)}deg)`;
      }

      raf = moving ? requestAnimationFrame(tick) : 0; // sleeps when everything has settled
    };

    const wake = () => {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      wake();
    };
    const onResize = () => {
      measure();
      wake();
    };

    measure();
    wake();
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 hidden lg:block" aria-hidden="true">
      {EYES.map(([x, y, sc], i) => {
        const delay = 300 + i * 140;
        const blinkEvery = 5 + ((i * 7) % 5);
        return (
          <div
            key={i}
            ref={(el) => {
              eyeRefs.current[i] = el;
            }}
            className="absolute z-0 flex gap-3"
            style={{ left: `${x}%`, top: `${y}%`, transform: `scale(${sc})` }}
          >
            {[0, 1].map((side) => (
              <span key={side} className="relative block h-6 w-6">
                <span
                  className="anieye absolute inset-0 overflow-hidden rounded-full bg-[#d9f96a] transition-opacity duration-300 ease-out"
                  style={{
                    opacity: closed ? 0 : 1,
                    animation: `aniopen .7s cubic-bezier(.22,1,.36,1) ${delay}ms both, aniblink ${blinkEvery}s ease-in-out ${delay + 1000}ms infinite`,
                  }}
                >
                  <span
                    data-pupil
                    className="absolute left-1/2 top-1/2 -mt-2.5 rounded-full bg-black/80 will-change-transform [transition:width_.3s_ease,margin_.3s_ease]"
                    style={{ height: 20, width: worried ? 12 : 7, marginLeft: worried ? -6 : -3.5 }}
                  />
                </span>
                <span
                  className="absolute inset-x-0 top-1.5 h-3 rounded-t-full border-t-[5px] border-[#d9f96a] transition-[opacity,transform] duration-300 ease-out"
                  style={{ opacity: closed ? 1 : 0, transform: closed ? "scaleY(1)" : "scaleY(.4)" }}
                />
              </span>
            ))}
          </div>
        );
      })}

    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [typingPassword, setTypingPassword] = useState(false);

  const markRef = useRef<HTMLDivElement>(null);
  const mood: Mood = error ? "worried" : typingPassword ? "hiding" : "happy";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const post = (path: string, body: object) =>
      fetch(`${API}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    try {
      if (mode === "register") {
        const r = await post("/auth/register/", { username, email, password });
        if (!r.ok) throw new Error(await failMsg(r));
      }
      const t = await post("/auth/token/", { username, password });
      if (!t.ok) throw new Error(t.status >= 500 ? await failMsg(t) : "Wrong username or password.");
      const { access, refresh } = await t.json();
      localStorage.setItem("anicatz_access", access);
      localStorage.setItem("anicatz_refresh", refresh);
      window.dispatchEvent(new Event("anicatz-auth"));
      router.push("/");
    } catch (err) {
      setError(
        err instanceof TypeError
          ? `Can't reach the server at ${API}. Check that the backend is running and allows this site (CORS).`
          : err instanceof Error
            ? err.message
            : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  }

  const switchMode = (m: "login" | "register") => {
    setMode(m);
    setError("");
  };

  return (
    <main className="relative isolate flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-6 py-10">
      <style>{`
        @keyframes anishake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
        @keyframes aniopen{from{transform:scaleY(0)}to{transform:scaleY(1)}}
        @keyframes aniblink{0%,92%,100%{transform:scaleY(1)}95.5%{transform:scaleY(.08)}}
        @media (prefers-reduced-motion: reduce){.anieye{animation:none!important}}
      `}</style>
      <Watchers mood={mood} markRef={markRef} />
      <div className="flex w-full max-w-sm flex-col items-center lg:max-w-md">
        <div ref={markRef} className="relative z-10 -mb-14 will-change-transform">
          <Cat mood={mood} className="h-32 w-32 lg:h-36 lg:w-36" />
        </div>

      <div className="w-full rounded-[2rem] bg-[#1a1938] px-6 pb-7 pt-20 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
        <h1 className="text-center text-3xl font-extrabold tracking-tight text-white">
          {mode === "login" ? "Welcome back" : "Join "}
          {mode === "register" && (
            <>
              <span>ani</span>
              <span className="text-[#d9f96a]">catz</span>
            </>
          )}
        </h1>
        <p className="mb-6 mt-1 text-center text-sm text-white/50">
          {mode === "login" ? "Pick up where you left off." : "Save your list and keep track of what you watch."}
        </p>

        <div className="mb-5 grid grid-cols-2 rounded-full bg-[#0f0e24] p-1 text-sm font-semibold" role="tablist">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={`rounded-full py-2 transition ${
                mode === m ? "bg-[#d9f96a] text-[#0f0e24]" : "text-white/55 hover:text-white"
              }`}
            >
              {m === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            className={input}
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
          {mode === "register" && (
            <input
              className={input}
              type="email"
              placeholder="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          )}
          <input
            className={input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setTypingPassword(true)}
            onBlur={() => setTypingPassword(false)}
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />

          {error && (
            <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            disabled={busy}
            className="w-full rounded-2xl bg-[#d9f96a] py-3 font-extrabold text-[#0f0e24] shadow-[0_4px_0_#9fbb3a] transition active:translate-y-[3px] active:shadow-[0_1px_0_#9fbb3a] hover:bg-[#e6ff85] disabled:opacity-60"
          >
            {busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>
      </div>
    </main>
  );
}