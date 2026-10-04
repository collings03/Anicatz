// frontend/app/api/proxy/[...path]/route.ts
import type { NextRequest } from "next/server";

const BACKEND = (process.env.BACKEND_URL ?? "http://localhost:8000/api").replace(/\/+$/, "");

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  try {
    const res = await fetch(`${BACKEND}/${path.join("/")}/${req.nextUrl.search}`, { cache: "no-store" });
    return new Response(res.body, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return Response.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}