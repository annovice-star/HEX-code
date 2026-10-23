import {z} from "zod";
export const languageCodes=["zh-CN","zh-HK","zh-TW","en","ja","ko","es","pt"] as const;
export type Language=typeof languageCodes[number];
export const languageSchema=z.enum(languageCodes);
export const languageLabels:Record<Language,string>={"zh-CN":"简体中文","zh-HK":"繁體中文（香港）","zh-TW":"繁體中文（台灣）",en:"English",ja:"日本語",ko:"한국어",es:"Español",pt:"Português"};
export function isLanguage(value:unknown):value is Language{return typeof value==="string"&&(languageCodes as readonly string[]).includes(value);}
export function resolveLanguage(value:unknown,fallback:Language="zh-CN"):Language{return isLanguage(value)?value:fallback;}
