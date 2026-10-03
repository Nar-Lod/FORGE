import { ensureAccount, ensurePlayer, getServerAdaptiveRecommendation } from "../../../../lib/forge-server";
import { requireForgeAuth } from "../../../../lib/forge-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireForgeAuth();
    const account = await ensureAccount(auth);
    const playerId = await ensurePlayer(account.id);
    const skill = new URL(request.url).searchParams.get("skill");
    if (!skill) return Response.json({ error: "skill_required" }, { status: 400 });
    const adaptive = await getServerAdaptiveRecommendation(playerId, skill);
    return Response.json({ playerId, skill, adaptive }, {
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FORGE_AUTH_REQUIRED") {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "adaptive_unavailable" }, { status: 500 });
  }
}
