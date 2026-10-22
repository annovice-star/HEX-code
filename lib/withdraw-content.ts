import {and,eq,inArray,sql} from 'drizzle-orm';
import {getDb} from '../db';
import {articles,settings} from '../db/schema';

const archiveId='content-withdrawal:2026-10-22-v1';
// One-time withdrawal requested by the owner. Full original rows are retained
// in the database archive, and the articles remain editable/recoverable drafts.
// The transaction guard prevents concurrent reads from repeating withdrawal.
export async function withdrawExistingContent(){
 const db=getDb();
 const [done]=await db.select().from(settings).where(eq(settings.id,archiveId));
 if(done)return;
 const published=await db.select().from(articles).where(eq(articles.status,'published'));
 const archivedAt=new Date().toISOString();
 const archive=db.insert(settings).values({id:archiveId,value:JSON.stringify({archivedAt,count:published.length,articles:published})}).onConflictDoNothing();
 if(!published.length){await archive;return;}
 await db.batch([
  db.update(articles).set({status:'draft',updatedAt:archivedAt}).where(and(
   eq(articles.status,'published'),inArray(articles.id,published.map(a=>a.id)),
   sql`not exists (select 1 from settings where id = ${archiveId})`,
  )),
  archive,
 ]);
}
