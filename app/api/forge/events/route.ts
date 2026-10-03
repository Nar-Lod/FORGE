import { ensureAccount, ensurePlayer, ingestServerEvent } from "../../../../lib/forge-server";
import { requireForgeAuth } from "../../../../lib/forge-auth";
import { consumeEventRateLimit } from "../../../../lib/forge-security";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 64 * 1024;
const MAX_EVENT_PAYLOAD_KEYS = 40;

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  try {
    const auth = await requireForgeAuth();
    if (!(await consumeEventRateLimit(auth.subject))) return json({ error: "rate_limited" }, 429);
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);

    const body = await request.json();
    if (!body || typeof body !== "object") return json({ error: "invalid_payload" }, 400);

    const event = body as Record<string, unknown>;
    const payload = typeof event.payload === "object" && event.payload !== null
      ? event.payload as Record<string, unknown>
      : {};
    if (Object.keys(payload).length > MAX_EVENT_PAYLOAD_KEYS) {
      return json({ error: "payload_too_complex" }, 400);
    }

    const required = ["id", "sessionId", "timestamp", "skill", "game", "event"];
    const allowedSkills = new Set(["focus","control","patience","persistence","consistency"]);
    const allowedEvents = new Set(["session_started","session_completed","trial_started","trial_completed","difficulty_changed","mistake","recovery","reveal_used","rest_started","rest_completed"]);
    if (!allowedSkills.has(String(event.skill)) || !allowedEvents.has(String(event.event))) return json({ error: "unsupported_event" }, 400);
    if (required.some((key) => typeof event[key] !== "string" && key !== "timestamp")) {
      return json({ error: "invalid_event_shape" }, 400);
    }
    if (!Number.isFinite(Number(event.timestamp))) {
      return json({ error: "invalid_timestamp" }, 400);
    }

    const account = await ensureAccount(auth);
    const playerId = await ensurePlayer(account.id);
    const result = await ingestServerEvent(playerId, {
      id: String(event.id),
      sessionId: String(event.sessionId),
      timestamp: Number(event.timestamp),
      skill: String(event.skill),
      game: String(event.game),
      event: String(event.event),
      difficulty: event.difficulty as { level: number; score: number } | undefined,
      performance: event.performance as Record<string, number | undefined> | undefined,
      payload: payload as Record<string, number | string | boolean | null>,
    });

    return json({ ok: true, playerId, ...result }, result.duplicate ? 200 : 202);
  } catch (error) {
    if (error instanceof Error && error.message === "FORGE_AUTH_REQUIRED") {
      return json({ error: "unauthorized" }, 401);
    }
    return json({ error: "ingest_failed" }, 500);
  }
}
