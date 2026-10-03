import { neon } from "@neondatabase/serverless";
import { buildBenchmarkSnapshot } from "../../../../../lib/forge-benchmark-service";
const skills=["focus","control","patience","persistence","consistency"];
function db(){const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL is not configured");return neon(url);}
export const runtime="nodejs";
export async function GET(request:Request){
 const expected=process.env.CRON_SECRET;const auth=request.headers.get("authorization");
 if(!expected||auth!==`Bearer ${expected}`)return Response.json({error:"unauthorized"},{status:401});
 const sql=db();
 await sql`delete from forge_event_ledger where occurred_at<now()-interval '180 days'`;
 await sql`delete from forge_rate_limits where window_started_at<now()-interval '2 days'`;
 await sql`delete from forge_benchmark_snapshots where expires_at<now()-interval '30 days'`;
 const benchmarkResults=[];for(const skill of skills)benchmarkResults.push(await buildBenchmarkSnapshot("global","global",skill));
 return Response.json({ok:true,benchmarks:benchmarkResults});
}
