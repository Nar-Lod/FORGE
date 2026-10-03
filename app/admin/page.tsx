"use client";
import { useEffect,useState } from "react";
type Health={accounts:number;players:number;sessions:number;events:number;activeBenchmarks:number};
export default function AdminPage(){
 const [health,setHealth]=useState<Health|null>(null);const [error,setError]=useState("");
 useEffect(()=>{fetch("/api/forge/admin/health").then(async r=>{const x=await r.json();if(!r.ok)throw new Error(x.error||"unavailable");setHealth(x)}).catch(e=>setError(e.message))},[]);
 return <main style={{minHeight:"100vh",padding:"48px",fontFamily:"system-ui",background:"#090909",color:"#f4f4f4"}}>
  <p style={{letterSpacing:2,opacity:.6}}>FORGE / OPERATIONS</p><h1>System health</h1>
  {error?<p>{error}</p>:!health?<p>Loading protected telemetry…</p>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:16}}>
   {Object.entries(health).map(([k,v])=><section key={k} style={{padding:20,border:"1px solid #292929",borderRadius:12}}><small>{k.replace(/([A-Z])/g," $1").toUpperCase()}</small><strong style={{display:"block",fontSize:36,marginTop:8}}>{v}</strong></section>)}
  </div>}
 </main>
}
