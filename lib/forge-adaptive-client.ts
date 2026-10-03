export async function getServerAdaptiveLevel(skill:string,fallback:number){
 if(typeof window==="undefined")return fallback;
 try{
  const response=await fetch(`/api/forge/adaptive?skill=${encodeURIComponent(skill)}`,{credentials:"include",cache:"no-store"});
  if(!response.ok)return fallback;
  const data=await response.json();
  const level=Number(data.adaptive?.level);
  return Number.isFinite(level)?level:fallback;
 }catch{return fallback;}
}
