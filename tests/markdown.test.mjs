import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {parseMarkdownDocument,markdownImages,rewriteMarkdownImages,safeMarkdownUrl,decodeImageData,normalizeImagePath,markdownHeadingIds} from '../lib/markdown.ts';
import {articleSchema} from '../lib/content.ts';

test('ordinary Markdown and optional front matter infer a title and readable summary',()=>{
 const plain=parseMarkdownDocument('\uFEFF# 测试标题\r\n\r\n这是 **粗体** 摘要。\r\n\r\n## 正文\r\n\r\n- 内容','example.md');
 assert.equal(plain.title,'测试标题');assert.equal(plain.summary,'这是 粗体 摘要。');assert.ok(plain.body.startsWith('这是'));
 const front=parseMarkdownDocument('---\ntitle: Custom title\ncategory: talent\nlanguage: en\nsummary: Custom summary\n---\n\n# Custom title\n\nBody','file.md');
 assert.equal(front.title,'Custom title');assert.equal(front.summary,'Custom summary');assert.equal(front.metadata.category,'talent');assert.equal(front.body,'Body');
 assert.throws(()=>parseMarkdownDocument('---\ntitle: [broken\n---\nBody','file.md'));
 assert.throws(()=>parseMarkdownDocument('---\na: &a [1]\nb: *a\n---\nBody','file.md'));
 assert.throws(()=>parseMarkdownDocument('# Title','file.md'));
});

test('inline, reference and encoded image paths resolve without changing lists, tables or code',()=>{
 const source='- **One**\n\n| A | B |\n|---|---|\n|1|2|\n\n![内联](images/a%20b.png "说明")\n\n![引用][photo]\n\n[photo]: ./images/c.jpg "图注"\n\n```md\n![not-an-image](missing.png)\n```';
 assert.deepEqual(markdownImages(source).map(r=>r.url),['images/a%20b.png','./images/c.jpg']);
 const rewritten=rewriteMarkdownImages(source,url=>url.includes('c.jpg')?'https://example.com/c.jpg':'https://example.com/a.png');
 assert.ok(rewritten.includes('| A | B |'));assert.ok(rewritten.includes('![not-an-image](missing.png)'));assert.equal(markdownImages(rewritten)[1].title,'图注');
 assert.equal(normalizeImagePath('./images/a%20b.png'),'images/a b.png');assert.throws(()=>normalizeImagePath('../outside.png'));
});

test('common Markdown renders with tables, tasks, quotations and code while unsafe markup is inert',()=>{
 const body='## Section\n\n**Bold** and *italic*\n\n- [x] Task\n\n> Quote\n\n| A | B |\n|---|---|\n|1|2|\n\n```js\nconst x = 1;\n```\n\n<script>alert(1)</script>\n\n[Bad](javascript:alert%281%29)\n\n![Bad](data:image/svg+xml;base64,AAAA)';
 const html=renderToStaticMarkup(React.createElement(ReactMarkdown,{skipHtml:true,remarkPlugins:[remarkGfm,[markdownHeadingIds,{prefix:'test'}]],urlTransform:(url,key)=>safeMarkdownUrl(url,key==='src')?url:''},body));
 for(const marker of ['<strong>Bold</strong>','<em>italic</em>','<table>','type="checkbox"','<blockquote>','<pre>','id="test-section"'])assert.ok(html.includes(marker),marker);
 assert.ok(!html.includes('<script'));assert.ok(!html.includes('javascript:'));assert.ok(!html.includes('data:image/svg'));
});

test('only raster image data with matching signatures is stored',()=>{
 const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJ1sAAAAASUVORK5CYII=';
 assert.equal(decodeImageData(png).mime,'image/png');
 assert.throws(()=>decodeImageData(png.replace('image/png','image/jpeg')));
 assert.throws(()=>decodeImageData('data:image/svg+xml;base64,PHN2Zz4='));
 assert.equal(safeMarkdownUrl('javascript:alert(1)'),false);assert.equal(safeMarkdownUrl('file:///C:/secret.png',true),false);
 assert.equal(safeMarkdownUrl('/api/article-images/a/'+ 'a'.repeat(64),true),true);
 assert.equal(safeMarkdownUrl('/api/article-images/a/../../admin',true),false);
});
