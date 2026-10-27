import {eq} from 'drizzle-orm';
import {getDb} from '../db';
import {articles,settings} from '../db/schema';
import {articleSchema} from './content';
import edition from './auto-export-article.json';

const marker='content-import:shenzhen-auto-export:2026-10-27-v1';
// Publish the owner's approved edition once. Later admin edits, unpublishing,
// and deletions remain authoritative and are never reset by another request.
export async function importAutoExportArticle(){
 const db=getDb();
 const [completed]=await db.select().from(settings).where(eq(settings.id,marker));
 if(completed)return;
 const article=articleSchema.parse(edition);
 await db.batch([
  db.insert(articles).values({...article,guide:article.guide??null,updatedAt:article.updatedAt!}).onConflictDoNothing(),
  db.insert(settings).values({id:marker,value:JSON.stringify({articleId:article.id,importedAt:new Date().toISOString()})}).onConflictDoNothing(),
 ]);
}
