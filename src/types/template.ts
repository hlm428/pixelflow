/** 提示词模板分类 */
export type TemplateCategory = '风格词' | '运镜词' | '光线词' | '情绪词' | '场景词';
export const TEMPLATE_CATEGORIES: TemplateCategory[] = ['风格词', '运镜词', '光线词', '情绪词', '场景词'];

export interface PromptTemplate {
  id: string;
  category: TemplateCategory;
  content: string; /** 词本身（插入提示词的文本） */
  description: string; /** 中文说明 */
  scene: string; /** 适用场景 */
  tags: string[];
  favorite: boolean;
}
