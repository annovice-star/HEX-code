import { sameOrigin,removeSession,cookie } from "../../../../lib/auth";
export async function POST(request:Request){
  if(!sameOrigin(request))return Response.json({error:"请求来源无效。"},{status:403});
  await removeSession(request);
  return Response.json({ok:true},{headers:{"Set-Cookie":cookie("",request,0),"Cache-Control":"no-store"}});
}
