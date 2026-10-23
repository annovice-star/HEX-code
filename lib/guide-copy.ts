import copy from "./guide-locales.json" with {type:"json"};
import type {Language} from "./languages";
export type GuideCopy=typeof copy.en;
export const guideCopy:Record<Language,GuideCopy>=copy;
