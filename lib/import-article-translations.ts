import {eq} from 'drizzle-orm';
import {getDb} from '../db';
import {articles,settings} from '../db/schema';
import {articleSchema} from './content';
import edition from './article-translations.json';

const marker='content-import:apec-2026-10-21-translations-v1';
// A separate, one-time edition: preserve original articles and later admin edits
// or deletions. The marker and every insert commit atomically in D1's batch.
export async function importArticleTranslations(){
 const db=getDb();
 const [completed]=await db.select().from(settings).where(eq(settings.id,marker));
 if(completed)return;
 const values=edition.map(value=>{const a=articleSchema.parse(value);return {...a,guide:a.guide??null,updatedAt:a.updatedAt!};});
 await db.batch([
  db.insert(settings).values({id:marker,value:JSON.stringify({count:values.length,importedAt:new Date().toISOString()})}).onConflictDoNothing(),
  ...values.map(value=>db.insert(articles).values(value).onConflictDoNothing()),
 ]);
}
