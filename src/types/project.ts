import type { DubbingScheme } from './dubbing';

/** 画幅 */
export type AspectRatio = '16:9' | '9:16' | '1:1';
export const ASPECT_RATIOS: AspectRatio[] = ['16:9', '9:16', '1:1'];

/** 项目风格 */
export type ProjectStyle = '动漫' | '写实' | '赛璐璐' | '电影感' | '吉卜力风';
export const PROJECT_STYLES: ProjectStyle[] = ['动漫', '写实', '赛璐璐', '电影感', '吉卜力风'];

/** 项目状态 */
export type ProjectStatus = '构思中' | '制作中' | '已完成';
export const PROJECT_STATUSES: ProjectStatus[] = ['构思中', '制作中', '已完成'];

/** 角色卡时代：同名角色可有多个时代版本 */
export type CharacterEra = '现代' | '古代' | '未来';
export const CHARACTER_ERAS: CharacterEra[] = ['现代', '古代', '未来'];

export interface Project {
  id: string;
  name: string;
  theme: string; /** 主题（题材一句话，如「双女主百合」） */
  oneLineStory: string; /** 一句话故事 */
  targetDuration: number; /** 目标时长（秒）：60 / 120 / 300 / 自定义 */
  aspectRatio: AspectRatio;
  style: ProjectStyle;
  activeEra: CharacterEra; /** 当前时代：生成提示词时按该时代取角色卡 */
  dubbingScheme?: DubbingScheme; /** 配音方案（默认无配音） */
  shotLength?: number; /** 单镜时长（秒）：10（默认）或 5，拆分镜时用 */
  status: ProjectStatus;
  createdAt: number;
  updatedAt: number;
}

/** 画幅对应的成片分辨率 */
export const ASPECT_RESOLUTION: Record<AspectRatio, { width: number; height: number }> = {
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 },
  '1:1': { width: 960, height: 960 },
};
