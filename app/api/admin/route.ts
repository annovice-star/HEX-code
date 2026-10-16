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
  return Response.json({articles,contact,aiEnabled:!!env.DEEPSEEK_API_KEY,username:current!.username},{headers:{"Cache-Control":"no-store"}});
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
    const article = articleSchema.parse(input.article), values = {...article,updatedAt:new Date().toISOString()};
    await getDb().insert(articles).values(values).onConflictDoUpdate({target:articles.id,set:values});
    return Response.json({ok:true,article:values});
  } catch {return Response.json({error:"保存失败，请检查必填内容、日期和链接格式后重试。"},{status:400});}
}
