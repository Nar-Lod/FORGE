import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";

function db(){const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL is not configured");return neon(url);}

export async function exportAccountData(authSubject:string){
 const sql=db(); const accounts=await sql`select * from forge_accounts where auth_subject=${authSubject} limit 1`;
 if(!accounts.length)return null; const account=accounts[0];
 const [players,sessions,attempts,skills,bests,improvement,breaks,healthy,events]=await Promise.all([
  sql`select * from forge_players where account_id=${account.id}`,
  sql`select s.* from forge_sessions s join forge_players p on p.id=s.player_id where p.account_id=${account.id} order by s.started_at desc`,
  sql`select a.* from forge_attempts a join forge_players p on p.id=a.player_id where p.account_id=${account.id} order by a.completed_at desc`,
  sql`select ss.* from forge_skill_scores ss join forge_players p on p.id=ss.player_id where p.account_id=${account.id}`,
  sql`select b.* from forge_personal_bests b join forge_players p on p.id=b.player_id where p.account_id=${account.id}`,
  sql`select i.* from forge_improvement i join forge_players p on p.id=i.player_id where p.account_id=${account.id} order by i.created_at desc`,
  sql`select b.* from forge_breaks b join forge_players p on p.id=b.player_id where p.account_id=${account.id} order by b.started_at desc`,
  sql`select h.* from forge_healthy_use h join forge_players p on p.id=h.player_id where p.account_id=${account.id}`,
  sql`select e.* from forge_event_ledger e join forge_players p on p.id=e.player_id where p.account_id=${account.id} order by e.occurred_at desc`,
 ]);
 return {account,players,sessions,attempts,skills,personalBests:bests,improvement,breaks,healthyUse:healthy,events};
}

export async function deleteAccount(authSubject:string){
 const sql=db(); const rows=await sql`select id from forge_accounts where auth_subject=${authSubject} limit 1`;
 if(!rows.length)return false;
 await sql`insert into forge_privacy_requests(id,account_id,request_type,status,completed_at) values(${"privacy_"+randomUUID()},${rows[0].id},'delete','completed',now())`;
 await sql`delete from forge_accounts where id=${rows[0].id}`;
 return true;
}
