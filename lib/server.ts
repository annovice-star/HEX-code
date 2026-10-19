import { eq, desc } from "drizzle-orm";
import { getDb } from "../db";
import { articles, settings } from "../db/schema";
import { requireApiAccess,sameOrigin } from "./auth";
import { emptyContact, type Article, type Contact } from "./content";
export async function listArticles(publishedOnly = true): Promise<Article[]> {
  const query = getDb().select().from(articles);
  const rows=await (publishedOnly ? query.where(eq(articles.status,"published")) : query).orderBy(desc(articles.date));
  return rows.map(row=>({...row,guide:row.guide??undefined})) as Article[];
}
export async function contactSettings(): Promise<Contact> {
  const [row] = await getDb().select().from(settings).where(eq(settings.id,"contact"));
  return row ? JSON.parse(row.value) : emptyContact;
}
export async function requireAdmin(request: Request) {
  const denied=await requireApiAccess(request,true);if(denied)return denied;
  if (!sameOrigin(request)) return Response.json({error:"请求来源无效。"}, {status:403});
  return null;
}
