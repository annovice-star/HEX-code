import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { articles, settings } from "../../../db/schema";
import { articleSchema, settingsSchema } from "../../../lib/content";
import { requireAdmin,listArticles,contactSettings } from "../../../lib/server";
import { requireApiAccess,session } from "../../../lib/auth";
import { env } from "cloudflare:workers";
export async function GET(request:Request){
  const denied=await requireApiAccess(request,true);if(denied)return denied;
  const current=await session(request);
  const [articles,contact]=await Promise.all([listArticles(false),contactSettings()]);
  return Response.json({articles,contact,aiEnabled:false,username:current!.username},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  try {
    const text = await request.text();
    if (text.length > 80000) return Response.json({error:"内容过长。"},{status:413});
    const input = JSON.parse(text);
    if (input.action === "settings") {
      const value = settingsSchema.parse(input.value);
      await getDb().insert(settings).values({id:"contact",value:JSON.stringify(value)}).onConflictDoUpdate({target:settings.id,set:{value:JSON.stringify(value)}});
      return Response.json({ok:true});
    }
    if (input.action === "delete") {
      if (typeof input.id !== "string" || input.id.length > 80) throw Error();
      await getDb().delete(articles).where(eq(articles.id,input.id));
      return Response.json({ok:true});
    }
    if (input.action !== "save") throw Error();
    const article = articleSchema.parse(input.article), values = {...article,guide:article.guide??null,updatedAt:new Date().toISOString()};
    if(article.guide?.reviewState==="verified"&&(!article.source||!article.sourceUrl||!article.guide.reviewedAt))return Response.json({error:"标记已核验前，请补充来源、原文链接和核验日期。"},{status:400});
    if(article.guide?.groupId){
      const siblings=await listArticles(false);
      if(siblings.some(a=>a.id!==article.id&&(a.guide?.groupId||a.id)===article.guide?.groupId&&a.language===article.language))return Response.json({error:"同一主题的同一种语言只能有一篇内容，请编辑已有版本。"},{status:400});
    }
    await getDb().insert(articles).values(values).onConflictDoUpdate({target:articles.id,set:values});
    return Response.json({ok:true,article:{...values,guide:values.guide??undefined}});
  } catch {return Response.json({error:"保存失败，请检查必填内容、日期和链接格式后重试。"},{status:400});}
}
