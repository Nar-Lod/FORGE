import { requireForgeAuth } from "../../../../../lib/forge-auth";
import { auditAdmin, isAdmin } from "../../../../../lib/forge-security";
import { neon } from "@neondatabase/serverless";
function db(){const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL is not configured");return neon(url);}
export const runtime="nodejs";
export async function GET(){
 try{const auth=await requireForgeAuth();if(!isAdmin(auth.subject))return Response.json({error:"forbidden"},{status:403});
  const sql=db();const [accounts,players,sessions,events,benchmarks]=await Promise.all([
   sql`select count(*)::int count from forge_accounts`,sql`select count(*)::int count from forge_players`,
   sql`select count(*)::int count from forge_sessions`,sql`select count(*)::int count from forge_event_ledger`,
   sql`select count(*)::int count from forge_benchmark_snapshots where expires_at>now()`]);
  const result={accounts:accounts[0].count,players:players[0].count,sessions:sessions[0].count,events:events[0].count,activeBenchmarks:benchmarks[0].count};
  await auditAdmin(auth.subject,"health_read",undefined,result);return Response.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch(e){if(e instanceof Error&&e.message==="FORGE_AUTH_REQUIRED")return Response.json({error:"unauthorized"},{status:401});return Response.json({error:"health_unavailable"},{status:500});}
}
