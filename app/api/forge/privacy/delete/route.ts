import { requireForgeAuth } from "../../../../../lib/forge-auth";
import { deleteAccount } from "../../../../../lib/forge-privacy";
export const runtime="nodejs";
export async function DELETE(){
 try{return Response.json({deleted:await deleteAccount((await requireForgeAuth()).subject)});}
 catch(e){if(e instanceof Error&&e.message==="FORGE_AUTH_REQUIRED")return Response.json({error:"unauthorized"},{status:401});return Response.json({error:"delete_failed"},{status:500});}
}
