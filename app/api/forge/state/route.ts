import { ensureAccount, ensurePlayer, getAdaptiveState, getPlayerTrainingState } from "../../../../lib/forge-server";
import { requireForgeAuth } from "../../../../lib/forge-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = requireForgeAuth(request);
    const account = await ensureAccount(auth);
    const playerId = await ensurePlayer(account.id);
    const url = new URL(request.url);
    const skill = url.searchParams.get("skill");

    if (skill) {
      const adaptive = await getAdaptiveState(playerId, skill);
      return Response.json({ playerId, skill, adaptive }, {
        headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
      });
    }

    const training = await getPlayerTrainingState(playerId);
    return Response.json({ playerId, training }, {
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FORGE_AUTH_REQUIRED") {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "state_unavailable" }, { status: 500 });
  }
}
