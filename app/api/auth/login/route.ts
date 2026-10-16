import { ensureAdmin, findAccount, verifyPassword, createSession, authRateLimit, sameOrigin } from "../../../../lib/auth";
import { safeReturnTo } from "../../../../lib/password";
import { pagesOrigin } from "../../../../lib/cors";
export async function POST(request:Request){
  if(!sameOrigin(request))return Response.json({error:"请求来源无效。"},{status:403});
  if(!await authRateLimit(request,"login"))return Response.json({error:"尝试次数过多，请 15 分钟后再试。"},{status:429});
  try{
    const text=await request.text();if(text.length>2048)throw Error();
    const input=JSON.parse(text);
    if(typeof input.username!=="string"||typeof input.password!=="string"||input.username.length>64||input.password.length>128)throw Error();
    await ensureAdmin();
    const account=await findAccount(input.username.trim());
    if(!await verifyPassword(account,input.password)||!account)return Response.json({error:"账号或密码不正确。"},{status:401,headers:{"Cache-Control":"no-store"}});
    const created=await createSession(account,request),crossOrigin=pagesOrigin(request);
    return Response.json({ok:true,next:safeReturnTo(typeof input.next==="string"?input.next:undefined),...(crossOrigin?{token:created.token}:{})},{headers:{...(!crossOrigin?{"Set-Cookie":created.cookie}:{}),"Cache-Control":"no-store"}});
  }catch{return Response.json({error:"暂时无法登录，请稍后重试。"},{status:400});}
}
