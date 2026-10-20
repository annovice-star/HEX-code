import { z } from "zod";
import {languageSchema} from "./languages.ts";
export const inquirySchema=z.object({articleId:z.string().max(80).regex(/^[a-zA-Z0-9_-]*$/).default(""),name:z.string().trim().min(1).max(100),email:z.string().trim().email().max(254),message:z.string().trim().min(3).max(3000),language:languageSchema,consent:z.literal(true)});
export type Inquiry={id:string;articleId:string;topic:string;name:string;email:string;message:string;language:string;status:string;createdAt:string};
