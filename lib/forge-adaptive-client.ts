export async function getServerAdaptiveLevel(skill:string,fallback:number,max=10){
 if(typeof window==="undefined")return fallback;
 try{
  const response=await fetch(`/api/forge/adaptive?skill=${encodeURIComponent(skill)}`,{credentials:"include",cache:"no-store"});
  if(!response.ok)return fallback;
  const data=await response.json();
  const level=Number(data.adaptive?.level);
  return Number.isFinite(level)?Math.max(1,Math.min(max,level)):fallback;
 }catch{return fallback;}
}
