import { requireForgeAuth } from "../../../../../lib/forge-auth";
import { exportAccountData } from "../../../../../lib/forge-privacy";
export const runtime="nodejs";
export async function GET(){
 try{return Response.json(await exportAccountData((await requireForgeAuth()).subject),{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});}
 catch(e){if(e instanceof Error&&e.message==="FORGE_AUTH_REQUIRED")return Response.json({error:"unauthorized"},{status:401});return Response.json({error:"export_failed"},{status:500});}
}
