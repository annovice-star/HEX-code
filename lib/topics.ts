import copy from './guide-locales.json' with {type:'json'};
import type {Language} from './languages';

// Retain stored category IDs and article links; display order follows Plan A.
export const topicOrder=['apec','innovation','business','talent'] as const;
export const topicKeys=['all',...topicOrder] as const;
export type Topic=typeof topicOrder[number];
export function topicLabels(language:Language){
 return Object.fromEntries(topicOrder.map((key,index)=>[key,copy[language].topics[index+1]])) as Record<Topic,string>;
}
export const adminTopics=topicLabels('zh-CN');
