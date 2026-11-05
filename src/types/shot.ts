/** 分镜状态（6 种，不同颜色） */
export type ShotStatus = '待写' | '待生成' | '生成中' | '待质检' | '通过' | '失败';
export const SHOT_STATUSES: ShotStatus[] = ['待写', '待生成', '生成中', '待质检', '通过', '失败'];

export interface Shot {
  id: string;
  projectId: string;
  index: number; /** 编号（从 1 开始），顺序变化后自动重算 */
  startTime: number; /** 开始时间点（秒）= (index - 1) × 10，自动重算 */
  description: string; /** 一句话描述 */
  visualContent: string; /** 画面内容（详细） */
  camera: string; /** 运镜 */
  light?: string; /** 光线（黄昏暖金 / 雨天冷光…），空则按项目风格给默认值 */
  dialogue: string; /** 台词 / 旁白 */
  characterIds: string[]; /** 出现的角色卡 id */
  status: ShotStatus;
  promptVersion: number; /** 当前使用的提示词版本，0 = 还没生成过 */
}

/** 提示词历史版本 */
export interface PromptRecord {
  id: string;
  projectId: string;
  shotId: string;
  content: string;
  version: number; /** v1 / v2 / v3 … */
  createdAt: number;
}
