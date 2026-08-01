import { data } from "react-router";
import type { Route } from "./+types/api.report";
import { reportPlan } from "~/lib/publish.server";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

// Best-effort in-memory rate limit, keyed by IP. This resets on every
// server restart/deploy and isn't shared across instances — good enough to
// deter casual abuse, not a substitute for a real rate limiter.
const reportTimestamps = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const existing = (reportTimestamps.get(ip) ?? []).filter((ts) => ts > cutoff);

  if (existing.length >= RATE_LIMIT_MAX) {
    reportTimestamps.set(ip, existing);
    return true;
  }

  existing.push(now);
  reportTimestamps.set(ip, existing);
  return false;
}

// GET (and any other non-POST verb) never reaches `action` in framework
// mode — the router dispatches GET to `loader`, and with none defined it
// would otherwise emit its own generic 400. Define a loader purely to turn
// that into the 405 this endpoint should report.
export async function loader() {
  throw data("Method not allowed", { status: 405 });
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data("Method not allowed", { status: 405 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return data({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const formData = await request.formData();
  const slug = formData.get("slug");
  if (typeof slug !== "string" || slug.length === 0 || slug.length > 40) {
    return data({ ok: false, error: "invalid_slug" }, { status: 400 });
  }

  try {
    await reportPlan(slug);
  } catch {
    return data({ ok: false, error: "server_error" }, { status: 500 });
  }

  return { ok: true };
}
