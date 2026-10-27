import { z } from "zod";
import {languageSchema,type Language} from "./languages.ts";
export type {Language} from "./languages";
const optionalDate = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]);
export const editorialSchema = z.object({
  preparedAt:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  figures:z.array(z.object({
    file:z.string().regex(/^\/article-images\/[a-zA-Z0-9_-]+\.(?:png|webp|svg)$/),
    alt:z.string().trim().min(1).max(500),caption:z.string().trim().min(1).max(1000),
    aiGenerated:z.boolean(),afterParagraph:z.number().int().min(-1).max(500),
  })).max(10),
  sources:z.array(z.object({
    title:z.string().trim().min(1).max(500),publisher:z.string().trim().min(1).max(200),
    url:z.string().max(1500).url().refine(v=>/^https?:\/\//.test(v)),
    publishedAt:z.string().max(40),supports:z.string().max(1500),
  })).max(30),
});
export const guideSchema = z.object({
  edition:z.object({
    html:z.string().regex(/^\/article-editions\/[a-zA-Z0-9_-]+\/index\.html$/),
    image:z.string().regex(/^\/article-editions\/[a-zA-Z0-9_-]+\/share\.png$/).optional(),
  }).optional(),
  format:z.literal('markdown').optional(),
  markdown:z.object({sourceFile:z.string().max(250),cover:z.string().max(1500).optional()}).optional(),
  groupId:z.string().max(80).regex(/^[a-zA-Z0-9_-]*$/).default(""),
  audience:z.string().max(1000).default(""),steps:z.string().max(6000).default(""),
  materials:z.string().max(6000).default(""),notes:z.string().max(4000).default(""),
  faqs:z.array(z.object({q:z.string().trim().min(1).max(300),a:z.string().trim().min(1).max(2000)})).max(20).default([]),
  reviewedAt:optionalDate.default(""),reviewDue:optionalDate.default(""),
  reviewState:z.enum(["pending","verified","outdated"]).default("pending"),
  editorial:editorialSchema.optional(),
});
export type Guide = z.infer<typeof guideSchema>;
export const articleSchema = z.object({
  id: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  title: z.string().trim().min(1).max(180),summary: z.string().trim().min(1).max(700),body: z.string().trim().min(1).max(200000),
  category: z.enum(["apec", "business", "talent", "innovation"]),kind: z.enum(["news", "insight", "service", "event"]),language: languageSchema,
  source: z.string().max(120),sourceUrl: z.string().max(1000).refine(v => !v || /^https?:\/\//.test(v), "链接须以 https:// 或 http:// 开头"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),status: z.enum(["draft", "published"]),featured: z.boolean(),demo: z.boolean(),updatedAt: z.string().optional(),guide:guideSchema.optional(),
});
export type Article = z.infer<typeof articleSchema>;
export const settingsSchema = z.object({email: z.union([z.literal(""), z.string().email()]),phone: z.string().max(60),wechat: z.string().max(100),address: z.string().max(250)});
export type Contact = z.infer<typeof settingsSchema>;
// The static preview contains only published articles and public contact details.
export const publicContentSchema=z.object({articles:z.array(articleSchema).transform(items=>items.filter(article=>article.status==="published")),contact:settingsSchema,aiEnabled:z.literal(false)});
export const emptyContact: Contact = { email: "", phone: "", wechat: "", address: "" };
export const demos: Article[] = [
  { id: "demo-apec", title: "从亚太视野，发现深圳机遇", summary: "以区域合作为起点，关注与企业发展、人才流动和创新创业有关的议题。", body: "这是用于展示页面结构的示例文章，不代表已核实的新闻或活动公告。\n\n正式内容将由管理员精选、审核后发布，并附上来源与原文入口。\n\n你可以从 APEC 动态、企业发展、人才服务和创新创业四个方向浏览内容。", category: "apec", kind: "news", language: "zh-CN", source: "编辑示例", sourceUrl: "", date: "2026-10-15", status: "draft", featured: true, demo: true },
  { id: "demo-business", title: "企业在深圳发展，先从哪些问题开始？", summary: "从业务方向、团队需求到办公空间，梳理落地前需要了解的信息。", body: "这是栏目示例，不构成政策、法律或具体服务承诺。\n\n正式文章可围绕企业阶段、团队规模、业务方向、办公需求和预计时间展开。\n\n具体办理条件、服务范围和报价，应以审核后的资料或咨询结果为准。", category: "business", kind: "insight", language: "zh-CN", source: "编辑示例", sourceUrl: "", date: "2026-10-15", status: "draft", featured: false, demo: true },
  { id: "demo-talent", title: "连接人才与城市，让新的可能发生", summary: "聚焦人才发展与城市生活，把分散的信息整理成清晰的阅读入口。", body: "这是人才服务栏目的示例内容。\n\n未来将在这里发布审核后的服务说明、人才发展资讯及相关解读。\n\n本示例不包含具体补贴金额、申请资格或申报时间，也不会进入 AI 回答资料库。", category: "talent", kind: "news", language: "zh-CN", source: "编辑示例", sourceUrl: "", date: "2026-10-15", status: "draft", featured: false, demo: true },
  { id: "demo-innovation", title: "把一个想法，带向更大的世界", summary: "关注创业团队、孵化空间和交流机会，探索创新的下一步。", body: "这是创新创业栏目的示例内容。\n\n管理员可在后台替换为真实的空间介绍、创业观察或活动回顾。\n\n本示例不包含实际活动安排。", category: "innovation", kind: "insight", language: "zh-CN", source: "编辑示例", sourceUrl: "", date: "2026-10-15", status: "draft", featured: false, demo: true },
];
export function retrieve(query: string, all: Article[], language: Language, limit = 5) {
  const q = query.toLowerCase().normalize("NFKC");
  const words = q.match(/[a-z0-9]{2,}/g) ?? [], han = q.match(/[\p{Script=Han}]+/gu) ?? [];
  const tokens = [...new Set([...words, ...han.flatMap(s => s.length === 1 ? [s] : Array.from({length:s.length - 1}, (_,i)=>s.slice(i,i+2)))])].slice(0,120);
  const groups = [["企业", "企業", "business", "company", "落地"],["人才", "talent", "团队", "團隊", "team"],["创业", "創業", "startup", "孵化", "incubator"],["空间", "空間", "space", "office", "办公", "辦公"],["联系", "聯繫", "contact", "服务", "服務", "service"]];
  const expanded = [...new Set([...tokens, ...groups.filter(g=>g.some(t=>q.includes(t))).flat()])];
  return all.filter(a=>a.status === "published" && !a.demo).map(a=>{
    const title = a.title.toLowerCase(), summary = a.summary.toLowerCase(), body = [a.body,a.guide?.audience,a.guide?.steps,a.guide?.materials,a.guide?.notes,...(a.guide?.faqs??[]).flatMap(f=>[f.q,f.a])].filter(Boolean).join(" ").toLowerCase();
    return {a,score:expanded.reduce((s,t)=>s+(title.includes(t)?5:0)+(summary.includes(t)?3:0)+(body.includes(t)?1:0),0)};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score || Number(b.a.language===language)-Number(a.a.language===language)).slice(0,limit).map(x=>x.a);
}

