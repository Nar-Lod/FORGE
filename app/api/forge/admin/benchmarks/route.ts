import { requireForgeAuth } from "../../../../../lib/forge-auth";
import { auditAdmin, isAdmin } from "../../../../../lib/forge-security";
import { buildBenchmarkSnapshot } from "../../../../../lib/forge-benchmark-service";
export const runtime="nodejs";
export async function POST(request:Request){
 try{const auth=await requireForgeAuth();if(!isAdmin(auth.subject))return Response.json({error:"forbidden"},{status:403});
  const body=await request.json();const scope=body.scope;const cohortKey=String(body.cohortKey??"global");const skill=String(body.skill??"");
  if(!["global","country","age_bracket"].includes(scope)||!skill)return Response.json({error:"invalid_request"},{status:400});
  const result=await buildBenchmarkSnapshot(scope,cohortKey,skill);await auditAdmin(auth.subject,"benchmark_refresh",undefined,{scope,cohortKey,skill,result});return Response.json(result);
 }catch(e){if(e instanceof Error&&e.message==="FORGE_AUTH_REQUIRED")return Response.json({error:"unauthorized"},{status:401});return Response.json({error:"admin_operation_failed"},{status:500});}
}
