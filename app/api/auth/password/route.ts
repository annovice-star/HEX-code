import { session,sameOrigin,authRateLimit,findAccount,verifyPassword,changePassword,cookie } from "../../../../lib/auth";
export async function POST(request:Request){
  if(!sameOrigin(request))return Response.json({error:"请求来源无效。"},{status:403});
  const current=await session(request);if(!current)return Response.json({error:"请重新登录。"},{status:401});
  if(!await authRateLimit(request,"password"))return Response.json({error:"尝试次数过多，请 15 分钟后再试。"},{status:429});
  try{
    const text=await request.text();if(text.length>2048)throw Error();const input=JSON.parse(text);
    if(typeof input.currentPassword!=="string"||input.currentPassword.length>128||typeof input.newPassword!=="string"||input.newPassword.length<12||input.newPassword.length>128||input.currentPassword===input.newPassword)return Response.json({error:"新密码需为 12–128 个字符，并与旧密码不同。"},{status:400});
    const account=await findAccount(current.username);
    if(!account||!await verifyPassword(account,input.currentPassword))return Response.json({error:"当前密码不正确。"},{status:401});
    await changePassword(account,input.newPassword);
    return Response.json({ok:true},{headers:{"Set-Cookie":cookie("",request,0),"Cache-Control":"no-store"}});
  }catch{return Response.json({error:"修改失败，请重新登录后再试。"},{status:400});}
}
