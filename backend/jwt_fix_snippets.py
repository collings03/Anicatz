JWT_FIX_SNIPPET = r'''// frontend/app/api/proxy/[...path]/route.ts
import type { NextRequest } from "next/server";
import { API } from "@/lib/auth";

// Render free instances can take a long time to wake up, so allow the function to wait.
export const maxDuration = 60;

// Same backend as login and profile requests by default (API comes from lib/auth.ts).
// Set BACKEND_URL only if the server should call a different address than the browser does.
const BACKEND = (process.env.BACKEND_URL ?? API).replace(/\/+$/, "");

const TIMEOUT_MS = 25_000;
const RETRY_STATUSES = new Set([502, 503, 504]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = `${BACKEND}/${path.map(encodeURIComponent).join("/")}/${req.nextUrl.search}`;

  // Two tries: the first one often fails while a sleeping backend is waking up.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (RETRY_STATUSES.has(res.status) && attempt === 0) {
        console.error("Proxy upstream not ready, retrying:", res.status, url);
        await sleep(1500);
        continue;
      }

      if (!res.ok) console.error("Proxy upstream error:", res.status, url);

      return new Response(res.body, {
        status: res.status,
        headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
      });
    } catch (error) {
      console.error(`Proxy fetch failed (attempt ${attempt + 1}):`, url, error);
      if (attempt === 0) await sleep(1500);
    }
  }

  return Response.json({ detail: "Backend unreachable or timed out" }, { status: 502 });
}
'''