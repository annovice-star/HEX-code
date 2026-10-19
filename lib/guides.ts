import type { Article, Language } from "./content";
export function topicKey(a:Article){return a.guide?.groupId||a.id;}
export function selectLanguage(all:Article[],lang:Language){
  const groups=new Map<string,Article[]>();
  for(const a of all){const key=topicKey(a);groups.set(key,[...(groups.get(key)??[]),a]);}
  return [...groups.values()].map(group=>group.find(a=>a.language===lang)??group.find(a=>a.language==="zh-CN")??group[0]);
}
export function translationOf(a:Article,all:Article[],lang:Language){return all.find(b=>topicKey(a)===topicKey(b)&&b.language===lang);}
export function reviewDue(a:Article,today=new Date().toISOString().slice(0,10)){
  return a.guide?.reviewState==="outdated"||!!(a.guide?.reviewDue&&a.guide.reviewDue<=today);
}
export function searchable(a:Article){return [a.title,a.summary,a.body,a.guide?.audience,a.guide?.steps,a.guide?.materials,a.guide?.notes,...(a.guide?.faqs??[]).flatMap(f=>[f.q,f.a])].filter(Boolean).join(" ").normalize("NFKC").toLowerCase();}
const samples={
  "zh-CN":{titles:["了解深圳，从这里开始","企业落地前，先准备什么？","人才与工作：如何找到办事指引","认识区域与创新空间"],summary:"指引版式示例：正式资料需补充官方来源并审核后发布。",body:"本页仅用于展示多语言指引功能，不包含已经核实的政策、办理条件或服务承诺。",audience:"希望了解深圳的港商、外商、人才与接待人员。",steps:"选择想了解的主题\n阅读要点并核对官方原文\n如有具体需求，联系专业人员",materials:"整理需要咨询的问题\n准备希望使用的沟通语言",notes:"示例内容不能作为办事依据。分享示例时也会保留此标识。",q:"在哪里查看具体办理要求？",a:"正式指引发布后，请通过页面的官方原文入口核对。此示例不提供办理要求。"},
  "zh-TW":{titles:["認識深圳，從這裡開始","企業落地前，先準備什麼？","人才與工作：如何找到辦事指引","認識區域與創新空間"],summary:"指引版式示例：正式資料需補充官方來源並審核後發布。",body:"本頁僅用於展示多語言指引功能，不包含已經核實的政策、辦理條件或服務承諾。",audience:"希望了解深圳的港商、外商、人才與接待人員。",steps:"選擇想了解的主題\n閱讀要點並核對官方原文\n如有具體需求，聯絡專業人員",materials:"整理需要諮詢的問題\n準備希望使用的溝通語言",notes:"示例內容不能作為辦事依據。分享示例時也會保留此標識。",q:"在哪裡查看具體辦理要求？",a:"正式指引發布後，請透過頁面的官方原文入口核對。此示例不提供辦理要求。"},
  en:{titles:["Get to know Shenzhen","Preparing for business establishment","Talent and work: finding the right guidance","Explore districts and innovation spaces"],summary:"Guide layout sample. Official sources and editorial review are required before real guidance is published.",body:"This page demonstrates multilingual guides. It contains no verified policy, eligibility requirements or service commitments.",audience:"Hong Kong and international businesses, talent and reception teams exploring Shenzhen.",steps:"Choose a topic\nRead the key points and check official sources\nContact the team about your specific needs",materials:"List your questions\nChoose your preferred communication language",notes:"This sample is not an application guide. Shared copies retain the sample label.",q:"Where can I check specific requirements?",a:"Once reviewed guidance is published, follow its official source link. This sample does not provide application requirements."},
};
export const guideSamples:Article[]=(Object.keys(samples) as Language[]).flatMap(lang=>{
  const s=samples[lang];return (["apec","business","talent","innovation"] as const).map((category,i)=>({id:`sample-guide-${category}-${lang}`,title:s.titles[i],summary:s.summary,body:s.body,category,kind:"insight" as const,language:lang,source:"",sourceUrl:"",date:"2026-10-19",status:"published" as const,featured:i===1,demo:true,guide:{reviewState:"pending" as const,reviewedAt:"",reviewDue:"",groupId:`sample-guide-${category}`,audience:s.audience,steps:s.steps,materials:s.materials,notes:s.notes,faqs:[{q:s.q,a:s.a}]}}));
});
