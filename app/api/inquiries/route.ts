import { eq,desc,sql,lt } from "drizzle-orm";
import { getDb } from "../../../db";
import { inquiries,rateLimits } from "../../../db/schema";
import { requireApiAccess,sameOrigin } from "../../../lib/auth";
import { requireAdmin,listArticles } from "../../../lib/server";
import { inquirySchema } from "../../../lib/inquiries";
export async function GET(request:Request){
 const denied=await requireApiAccess(request,true);if(denied)return denied;
 const rows=await getDb().select().from(inquiries).orderBy(desc(inquiries.createdAt));
 return Response.json({inquiries:rows},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:Request){
 const denied=await requireApiAccess(request);if(denied)return denied;
 if(!sameOrigin(request))return Response.json({error:"invalid_origin"},{status:403});
 try{
  const text=await request.text();if(text.length>12000)return Response.json({error:"too_large"},{status:413});
  const input=JSON.parse(text);
  if(input.action==="status"){
   const forbidden=await requireAdmin(request);if(forbidden)return forbidden;
   if(typeof input.id!=="string"||input.id.length>80||!["pending","contacted","completed"].includes(input.status))throw Error();
   const result=await getDb().update(inquiries).set({status:input.status}).where(eq(inquiries.id,input.id)).returning({id:inquiries.id});
   return result.length?Response.json({ok:true}):Response.json({error:"not_found"},{status:404});
  }
  const value=inquirySchema.parse(input);
  const article=value.articleId?(await listArticles()).find(a=>a.id===value.articleId&&!a.demo):null;
  if(value.articleId&&!article)return Response.json({error:"topic_unavailable"},{status:400});
  const minute=Math.floor(Date.now()/600000),ip=request.headers.get("cf-connecting-ip")??"local";
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`${minute}:${ip}`));
  const key=`inquiry:${minute}:${Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("")}`;
  const db=getDb();const count=await db.insert(rateLimits).values({id:key,count:1,expiresAt:Date.now()+600000}).onConflictDoUpdate({target:rateLimits.id,set:{count:sql`${rateLimits.count}+1`}}).returning({count:rateLimits.count});
  await db.delete(rateLimits).where(lt(rateLimits.expiresAt,Date.now()));
  if(count[0].count>5)return Response.json({error:"rate_limited"},{status:429});
  await db.insert(inquiries).values({id:crypto.randomUUID(),articleId:article?.id??"",topic:article?.title??"一般咨询 / General enquiry",name:value.name,email:value.email,message:value.message,language:value.language,status:"pending",createdAt:new Date().toISOString()});
  return Response.json({ok:true},{status:201});
 }catch{return Response.json({error:"invalid_input"},{status:400});}
}
