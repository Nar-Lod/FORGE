"use client";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { installForgeSyncListeners, setForgeSyncToken, flushForgeEventQueue } from "../lib/forge-sync";
import { getPlayerModel, savePlayerModel, type ForgeSkill } from "../lib/forge-analytics";
import { getForgePlayerRecord, saveForgePlayerRecord } from "../lib/forge-data";
import { grantSignupBonus } from "../lib/forge-credits";

async function hydrateFromServer(token:string){
 const response=await fetch("/api/forge/state",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
 if(!response.ok)return;
 const state=await response.json();
 const model=getPlayerModel();
 for(const row of state.training?.skills??[]){
  const skill=String(row.skill) as ForgeSkill;
  if(!model.skills[skill])continue;
  model.skills[skill].rating=Number(row.score);
  model.skills[skill].confidence=Number(row.reliability);
  model.skills[skill].attempts=Number(row.sample_size);
  model.skills[skill].lastDifficulty=Math.max(1,Number(row.difficulty_adjusted_score||.5)*10);
 }
 model.updatedAt=Date.now();savePlayerModel(model);

 const local=getForgePlayerRecord();
 for(const best of state.training?.personalBests??[]){
  const existing=local.training.personalBests.find((x)=>x.skill===best.skill&&x.game===best.game);
  if(!existing)local.training.personalBests.push({
    skill:best.skill,game:best.game,score:Number(best.score),
    difficulty:Number(best.difficulty_level),achievedAt:new Date(best.achieved_at).getTime(),
    sessionId:String(best.session_id),
  });
  else if(Number(best.score)>existing.score)Object.assign(existing,{
    score:Number(best.score),difficulty:Number(best.difficulty_level),
    achievedAt:new Date(best.achieved_at).getTime(),sessionId:String(best.session_id)
  });
 }
 saveForgePlayerRecord(local);
}

export default function ForgeSyncBridge(){
 const {getToken,isSignedIn}=useAuth();
 useEffect(()=>{
  let disposed=false;
  const sync=async()=>{
   const token=isSignedIn?await getToken():null;
   if(disposed)return;
   setForgeSyncToken(token);
   if(token){
     const bonusSeen=window.localStorage.getItem("forge.auth.connected.v1")==="true";
     if(!bonusSeen){
       grantSignupBonus();
       window.localStorage.setItem("forge.auth.connected.v1","true");
     }
     await hydrateFromServer(token);
     void flushForgeEventQueue(token);
   }
  };
  void sync();
  const cleanup=installForgeSyncListeners();
  return ()=>{disposed=true;setForgeSyncToken(null);cleanup();};
 },[getToken,isSignedIn]);
 return null;
}
