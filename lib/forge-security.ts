import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";

const MAX_REQUESTS_PER_MINUTE = 120;
const MAX_EVENTS_PER_MINUTE = 240;

function db(){ const url=process.env.DATABASE_URL; if(!url) throw new Error("DATABASE_URL is not configured"); return neon(url); }

export async function consumeRateLimit(subject:string, cost=1){
  const sql=db();
  const rows=await sql`select window_started_at,request_count from forge_rate_limits where subject=${subject} limit 1`;
  const now=Date.now();
  if(!rows.length){
    await sql`insert into forge_rate_limits(subject,window_started_at,request_count) values(${subject},now(),${cost})`;
    return true;
  }
  const age=now-new Date(rows[0].window_started_at).getTime();
  if(age>=60000){
    await sql`update forge_rate_limits set window_started_at=now(),request_count=${cost} where subject=${subject}`;
    return true;
  }
  if(Number(rows[0].request_count)+cost>MAX_REQUESTS_PER_MINUTE) return false;
  await sql`update forge_rate_limits set request_count=request_count+${cost} where subject=${subject}`;
  return true;
}

export async function consumeEventRateLimit(subject:string,eventCount=1){
  if(eventCount<1||eventCount>MAX_EVENTS_PER_MINUTE) return false;
  return consumeRateLimit(subject,eventCount);
}

export function isAdmin(subject:string){
  const configured=(process.env.FORGE_ADMIN_USER_IDS||"").split(",").map(v=>v.trim()).filter(Boolean);
  return configured.includes(subject);
}

export async function auditAdmin(adminSubject:string,action:string,targetAccountId?:string,metadata?:Record<string,unknown>){
  const sql=db();
  await sql`insert into forge_admin_audit(id,admin_subject,action,target_account_id,metadata)
    values(${"audit_"+randomUUID()},${adminSubject},${action},${targetAccountId??null},${JSON.stringify(metadata??{})}::jsonb)`;
}
