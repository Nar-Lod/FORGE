import { requireForgeAuth } from "../../../../lib/forge-auth";
import { ensureAccount, ensurePlayer } from "../../../../lib/forge-server";
import { getGlobalPercentile } from "../../../../lib/forge-benchmark-service";
import { neon } from "@neondatabase/serverless";
function db(){const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL is not configured");return neon(url);}
export const runtime="nodejs";
export async function GET(request:Request){
 try{
  const auth=await requireForgeAuth();const account=await ensureAccount(auth);const player=await ensurePlayer(account.id);
  const skill=new URL(request.url).searchParams.get("skill");if(!skill)return Response.json({error:"skill_required"},{status:400});
  const sql=db();const rows=await sql`select score from forge_skill_scores where player_id=${player} and skill=${skill} limit 1`;
  const percentile=rows.length?await getGlobalPercentile(Number(rows[0].score),skill):{available:false};
  return Response.json({skill,percentile},{headers:{"Cache-Control":"no-store"}});
 }catch(e){if(e instanceof Error&&e.message==="FORGE_AUTH_REQUIRED")return Response.json({error:"unauthorized"},{status:401});return Response.json({error:"benchmark_unavailable"},{status:500});}
}
