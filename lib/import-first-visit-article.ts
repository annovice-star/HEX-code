import {eq} from 'drizzle-orm';
import {getDb} from '../db';
import {articles,settings} from '../db/schema';
import {articleSchema} from './content';
import edition from './first-visit-article.json';

const marker='content-import:shenzhen-first-visit:2026-10-26-v1';
// The owner explicitly requested publishing this reviewed edition. Import it
// once through the existing content-edition workflow; preserve all later
// administrator edits, status changes and deletions.
export async function importFirstVisitArticle(){
 const db=getDb();
 const [completed]=await db.select().from(settings).where(eq(settings.id,marker));
 if(completed)return;
 const article=articleSchema.parse(edition);
 await db.batch([
  db.insert(articles).values({...article,guide:article.guide??null,updatedAt:article.updatedAt!}).onConflictDoNothing(),
  db.insert(settings).values({id:marker,value:JSON.stringify({articleId:article.id,importedAt:new Date().toISOString()})}).onConflictDoNothing(),
 ]);
}
