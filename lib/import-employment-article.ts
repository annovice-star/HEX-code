import {eq} from 'drizzle-orm';
import {getDb} from '../db';
import {articles,settings} from '../db/schema';
import {articleSchema} from './content';
import edition from './employment-article.json';

const marker='content-import:shenzhen-employment:2026-10-28-v1';
// Import once so later administrator edits and withdrawals remain authoritative.
export async function importEmploymentArticle(){
 const db=getDb();
 const [completed]=await db.select().from(settings).where(eq(settings.id,marker));
 if(completed)return;
 const article=articleSchema.parse(edition);
 await db.batch([
  db.insert(articles).values({...article,guide:article.guide??null,updatedAt:article.updatedAt!}).onConflictDoNothing(),
  db.insert(settings).values({id:marker,value:JSON.stringify({articleId:article.id,importedAt:new Date().toISOString()})}).onConflictDoNothing(),
 ]);
}
