import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";

function db(){const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL is not configured");return neon(url);}
const MIN_SAMPLE=1000;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));

export async function buildBenchmarkSnapshot(scope:"global"|"country"|"age_bracket",cohortKey:string,skill:string,metric="score"){
 const sql=db();
 const cohort=scope==="global"?"1=1":scope==="country"?"a.country_code=$1":"a.age_bracket=$1";
 const args=scope==="global"?[]:[cohortKey];
 const rows=await sql(`select s.score from forge_skill_scores s join forge_players p on p.id=s.player_id join forge_accounts a on a.id=p.account_id where a.benchmark_opt_in=true and ${cohort} and s.skill=${scope==="global"?"$1":"$2"}`,scope==="global"?[skill]:[cohortKey,skill]);
 const values=rows.map(r=>Number(r.score)).filter(Number.isFinite).sort((a,b)=>a-b);
 if(values.length<MIN_SAMPLE)return {eligible:false,sampleCount:values.length,minSampleSize:MIN_SAMPLE};
 const quantiles={p01:values[Math.floor(values.length*.01)],p05:values[Math.floor(values.length*.05)],p10:values[Math.floor(values.length*.10)],p25:values[Math.floor(values.length*.25)],p50:values[Math.floor(values.length*.50)],p75:values[Math.floor(values.length*.75)],p90:values[Math.floor(values.length*.90)],p95:values[Math.floor(values.length*.95)],p99:values[Math.floor(values.length*.99)]};
 const id=`bench_${randomUUID()}`;
 await sql`insert into forge_benchmark_snapshots(id,scope,cohort_key,skill,metric,sample_count,min_sample_size,quantiles,generated_at,expires_at)
 values(${id},${scope},${cohortKey},${skill},${metric},${values.length},${MIN_SAMPLE},${JSON.stringify(quantiles)}::jsonb,now(),now()+interval '8 days')
 on conflict(scope,cohort_key,skill,metric) do update set sample_count=excluded.sample_count,min_sample_size=excluded.min_sample_size,quantiles=excluded.quantiles,generated_at=excluded.generated_at,expires_at=excluded.expires_at`;
 return {eligible:true,sampleCount:values.length,minSampleSize:MIN_SAMPLE,quantiles};
}

export async function getGlobalPercentile(playerScore:number,skill:string){
 const sql=db(); const rows=await sql`select sample_count,expires_at,quantiles from forge_benchmark_snapshots where scope='global' and cohort_key='global' and skill=${skill} and metric='score' limit 1`;
 if(!rows.length||new Date(rows[0].expires_at).getTime()<Date.now()||Number(rows[0].sample_count)<MIN_SAMPLE)return {available:false};
 const q=rows[0].quantiles as Record<string,number>;
 const points=[[1,q.p01],[5,q.p05],[10,q.p10],[25,q.p25],[50,q.p50],[75,q.p75],[90,q.p90],[95,q.p95],[99,q.p99]] as [number,number][];
 if(playerScore<=points[0][1])return {available:true,percentile:1,sampleCount:Number(rows[0].sample_count)};
 if(playerScore>=points[points.length-1][1])return {available:true,percentile:99,sampleCount:Number(rows[0].sample_count)};
 for(let i=1;i<points.length;i++){if(playerScore<=points[i][1]){const [lo,lv]=points[i-1];const [hi,hv]=points[i];const t=(playerScore-lv)/(hv-lv||1);return {available:true,percentile:Math.round(lo+(hi-lo)*clamp(t)),sampleCount:Number(rows[0].sample_count)};}}
 return {available:false};
}
