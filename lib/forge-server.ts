import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { calculateServerSkillScore, deriveHealthyUse, recommendAdaptiveLevel } from "./forge-intelligence";
export type ForgeServerContext = { authSubject: string };
function database(){ const url=process.env.DATABASE_URL; if(!url) throw new Error("DATABASE_URL is not configured"); return neon(url); }
const num=(v:unknown,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));

export async function ensureAccount(context:ForgeServerContext){
 const sql=database(); const rows=await sql(`select id,auth_subject,benchmark_opt_in,country_code,age_bracket from forge_accounts where auth_subject=$1 limit 1`,[context.authSubject]);
 if(rows.length)return rows[0]; const id=`acct_${randomUUID()}`;
 await sql(`insert into forge_accounts(id,auth_subject) values($1,$2)`,[id,context.authSubject]);
 return (await sql(`select id,auth_subject,benchmark_opt_in,country_code,age_bracket from forge_accounts where id=$1`,[id]))[0];
}
export async function ensurePlayer(accountId:string,anonymousInstallId?:string){
 const sql=database(); const rows=await sql(`select id from forge_players where account_id=$1 order by created_at asc limit 1`,[accountId]);
 if(rows.length)return rows[0].id; const id=`player_${randomUUID()}`;
 await sql(`insert into forge_players(id,account_id,anonymous_install_id) values($1,$2,$3)`,[id,accountId,anonymousInstallId??null]); return id;
}
async function ensureSession(sql:any,playerId:string,e:any){
 const rows=await sql(`select * from forge_sessions where id=$1 limit 1`,[e.sessionId]); if(rows.length)return rows[0];
 await sql(`insert into forge_sessions(id,player_id,skill,game,started_at,status,difficulty_level) values($1,$2,$3,$4,to_timestamp($5/1000.0),'active',$6)`,[e.sessionId,playerId,e.skill,e.game,e.timestamp,num(e.difficulty?.level,1)]);
 return (await sql(`select * from forge_sessions where id=$1`,[e.sessionId]))[0];
}
async function refreshDerived(sql:any,playerId:string,skill:string){
 const [sessions,attempts,breaks]=await Promise.all([
  sql(`select performance,difficulty_level,duration_ms,status from forge_sessions where player_id=$1 and skill=$2 order by started_at desc limit 200`,[playerId,skill]),
  sql(`select performance,outcome from forge_attempts where player_id=$1 and skill=$2 order by completed_at desc limit 1000`,[playerId,skill]),
  sql(`select duration_ms,quality,completed_at from forge_breaks where player_id=$1 order by started_at desc limit 500`,[playerId])
 ]);
 const score=calculateServerSkillScore(skill as any,sessions as any);
 await sql(`insert into forge_skill_scores(player_id,skill,score,reliability,sample_size,difficulty_adjusted_score,experience_adjusted_score) values($1,$2,$3,$4,$5,$6,$7)
 on conflict(player_id,skill) do update set score=excluded.score,reliability=excluded.reliability,sample_size=excluded.sample_size,difficulty_adjusted_score=excluded.difficulty_adjusted_score,experience_adjusted_score=excluded.experience_adjusted_score,updated_at=now()`,
 [playerId,skill,score.score,score.reliability,score.sampleSize,score.difficultyAdjustedScore,score.experienceAdjustedScore]);
 const all=await sql(`select performance,duration_ms,status from forge_sessions where player_id=$1 order by started_at desc limit 500`,[playerId]);
 const healthy=deriveHealthyUse(all as any,breaks as any,attempts as any);
 await sql(`insert into forge_healthy_use(player_id,improvement_per_minute,recovery_quality,rest_performance,stopping_quality,repeated_attempts_without_improvement,deliberate_break_rate) values($1,$2,$3,$4,$5,$6,$7)
 on conflict(player_id) do update set improvement_per_minute=excluded.improvement_per_minute,recovery_quality=excluded.recovery_quality,rest_performance=excluded.rest_performance,stopping_quality=excluded.stopping_quality,repeated_attempts_without_improvement=excluded.repeated_attempts_without_improvement,deliberate_break_rate=excluded.deliberate_break_rate,updated_at=now()`,
 [playerId,healthy.improvementPerMinute,healthy.recoveryQuality,healthy.restPerformance,healthy.stoppingQuality,healthy.repeatedAttemptsWithoutImprovement,healthy.deliberateBreakRate]);
 return score;
}
export async function ingestServerEvent(playerId:string,event:any){
 const sql=database(); const dup=await sql(`select id from forge_event_ledger where id=$1 limit 1`,[event.id]); if(dup.length)return {accepted:false,duplicate:true};
 await sql(`insert into forge_event_ledger(id,player_id,session_id,event_name,occurred_at,difficulty,performance,payload) values($1,$2,$3,$4,to_timestamp($5/1000.0),$6::jsonb,$7::jsonb,$8::jsonb)`,
 [event.id,playerId,event.sessionId,event.event,event.timestamp,JSON.stringify(event.difficulty??null),JSON.stringify(event.performance??null),JSON.stringify(event.payload??null)]);
 const p=event.payload??{}; let session=await ensureSession(sql,playerId,event);
 if(event.event==="trial_completed"){
  const performance=clamp(num(event.performance?.accuracy??p.accuracy??p.performance,.5));
  await sql(`insert into forge_attempts(id,session_id,player_id,skill,game,started_at,completed_at,outcome,performance,difficulty_level,score,assisted) values($1,$2,$3,$4,$5,to_timestamp($6/1000.0),to_timestamp($6/1000.0),$7,$8,$9,$10,$11)`,
  [event.id,event.sessionId,playerId,event.skill,event.game,event.timestamp,String(p.outcome??(performance>=.5?"success":"miss")),performance,num(event.difficulty?.level,1),p.score==null?null:num(p.score),Boolean(p.assisted||num(p.reveals)>0)]);
 }
 if(event.event==="recovery"||event.event==="reveal_used") await sql(`update forge_sessions set recoveries=recoveries+$2,reveals=reveals+$3 where id=$1`,[event.sessionId,event.event==="recovery"?1:0,event.event==="reveal_used"?1:0]);
 if(event.event==="rest_started") await sql(`update forge_sessions set rest_started=true where id=$1`,[event.sessionId]);
 if(event.event==="rest_completed"){
  await sql(`update forge_sessions set rest_completed=true where id=$1`,[event.sessionId]);
  const started=session?.started_at?new Date(session.started_at).getTime():event.timestamp;
  await sql(`insert into forge_breaks(id,player_id,started_at,completed_at,duration_ms,quality) values($1,$2,to_timestamp($3/1000.0),to_timestamp($4/1000.0),$5,$6)`,
  [`break_${event.id}`,playerId,started,event.timestamp,Math.max(0,event.timestamp-started),clamp((event.timestamp-started)/60000)]);
 }
 if(event.event==="session_completed"){
  const started=session?.started_at?new Date(session.started_at).getTime():event.timestamp;
  const performance=clamp(num(event.performance?.accuracy??p.accuracy??p.performance,.5)); const score=p.score==null?null:num(p.score);
  await sql(`update forge_sessions set completed_at=to_timestamp($2/1000.0),duration_ms=$3,status='completed',score=$4,performance=$5,difficulty_level=$6,attempts=(select count(*) from forge_attempts where session_id=$1) where id=$1`,
  [event.sessionId,event.timestamp,Math.max(0,event.timestamp-started),score,performance,num(event.difficulty?.level,1)]);
  if(score!=null) await sql(`insert into forge_personal_bests(player_id,skill,game,score,difficulty_level,session_id,achieved_at) values($1,$2,$3,$4,$5,$6,to_timestamp($7/1000.0))
   on conflict(player_id,skill,game) do update set score=greatest(forge_personal_bests.score,excluded.score),difficulty_level=case when excluded.score>forge_personal_bests.score then excluded.difficulty_level else forge_personal_bests.difficulty_level end,session_id=case when excluded.score>forge_personal_bests.score then excluded.session_id else forge_personal_bests.session_id end,achieved_at=case when excluded.score>forge_personal_bests.score then excluded.achieved_at else forge_personal_bests.achieved_at end`,
   [playerId,event.skill,event.game,score,num(event.difficulty?.level,1),event.sessionId,event.timestamp]);
  await sql(`insert into forge_improvement(id,player_id,skill,game,performance,difficulty_level,session_duration_ms,created_at) values($1,$2,$3,$4,$5,$6,$7,to_timestamp($8/1000.0))`,
  [`imp_${event.id}`,playerId,event.skill,event.game,performance,num(event.difficulty?.level,1),Math.max(0,event.timestamp-started),event.timestamp]);
 }
 const score=await refreshDerived(sql,playerId,event.skill); return {accepted:true,duplicate:false,score};
}
export async function getPlayerTrainingState(playerId:string){
 const sql=database(); const [skills,sessions,attempts,bests,healthy]=await Promise.all([
  sql(`select * from forge_skill_scores where player_id=$1 order by skill`,[playerId]),
  sql(`select * from forge_sessions where player_id=$1 order by started_at desc limit 100`,[playerId]),
  sql(`select * from forge_attempts where player_id=$1 order by completed_at desc limit 500`,[playerId]),
  sql(`select * from forge_personal_bests where player_id=$1 order by achieved_at desc`,[playerId]),
  sql(`select * from forge_healthy_use where player_id=$1 limit 1`,[playerId])]);
 return {skills,sessions,attempts,personalBests:bests,healthyUse:healthy[0]??null};
}
export async function recordDifficulty(playerId:string,skill:string,game:string,level:number,score:number,confidence:number){
 const sql=database(); await sql(`insert into forge_difficulty(id,player_id,skill,game,level,score,confidence) values($1,$2,$3,$4,$5,$6,$7)`,
 [`diff_${randomUUID()}`,playerId,skill,game,level,score,confidence]);
}
export async function getServerAdaptiveRecommendation(playerId:string,skill:string){
 const sql=database(); const [rows,recent]=await Promise.all([
  sql(`select score,reliability,sample_size,difficulty_adjusted_score,experience_adjusted_score from forge_skill_scores where player_id=$1 and skill=$2 limit 1`,[playerId,skill]),
  sql(`select performance,difficulty_level from forge_sessions where player_id=$1 and skill=$2 and status='completed' order by started_at desc limit 8`,[playerId,skill])]);
 const r=rows[0]; const fallback=calculateServerSkillScore(skill as any,recent as any);
 const score=r?{score:num(r.score,.5),reliability:num(r.reliability),sampleSize:num(r.sample_size),difficultyAdjustedScore:num(r.difficulty_adjusted_score,.5),experienceAdjustedScore:num(r.experience_adjusted_score,.5)}:fallback;
 const recommendation=recommendAdaptiveLevel(score,recent.map((x:any)=>num(x.performance,.5)),{min:1,max:10,target:.72});
 await recordDifficulty(playerId,skill,"adaptive",recommendation.level,recommendation.recentMean,recommendation.confidence);
 return {...recommendation,rating:score.score,sampleSize:score.sampleSize};
}
export async function getAdaptiveState(playerId:string,skill:string){ return getServerAdaptiveRecommendation(playerId,skill); }
