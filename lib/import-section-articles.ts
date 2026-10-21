import {eq} from 'drizzle-orm';
import {getDb} from '../db';
import {articles,settings} from '../db/schema';
import {articleSchema} from './content';
import edition from './section-articles.json';

const marker='content-import:apec-2026-10-21-sections-v1';
// Import the published edition once. Never overwrite later administrator edits
// or recreate records deleted after the edition has been imported.
export async function importSectionArticles(){
 const db=getDb();
 const [completed]=await db.select().from(settings).where(eq(settings.id,marker));
 if(completed)return;
 const values=edition.map(value=>{const a=articleSchema.parse(value);return {...a,guide:a.guide??null,updatedAt:a.updatedAt!};});
 await db.batch([
  db.insert(settings).values({id:marker,value:JSON.stringify({count:values.length,importedAt:new Date().toISOString()})}).onConflictDoNothing(),
  ...values.map(value=>db.insert(articles).values(value).onConflictDoNothing()),
 ]);
}
