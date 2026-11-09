/** 片段状态机：待生成 → 生成中 → 待质检 → 通过 / 失败 →（重试 ≤ 2）→ 放弃 */
export type ClipStatus = '待生成' | '生成中' | '待质检' | '通过' | '失败' | '放弃';
export const CLIP_STATUSES: ClipStatus[] = ['待生成', '生成中', '待质检', '通过', '失败', '放弃'];

/** 失败原因下拉选项 */
export const FAIL_REASONS = ['黑帧', '冻帧', '动作错', '穿帮', 'AI 文字', '比例错', '其他'] as const;
export type FailReason = (typeof FAIL_REASONS)[number];

/** 最多重试次数，第 2 次仍失败就标记「放弃」 */
export const MAX_RETRY = 2;

export interface Clip {
  id: string;
  projectId: string;
  shotId: string;
  fileName: string;
  duration: number; /** 秒 */
  width: number;
  height: number;
  fps: number;
  fileSize: number; /** 字节 */
  model: string; /** 用哪个生成模型 */
  promptVersion: number; /** 用第几版提示词生成的 */
  status: ClipStatus;
  failReason: FailReason | null;
  failNote: string; /** 补充说明：「其他」手填；「穿帮」可写脸变 / 衣服变 / 道具变 */
  retryCount: number; /** 已重试次数 0–2 */
  score: number; /** 自动打分 + 人工调整，0–100 */
  isBest: boolean; /** 该分镜候选中的最优 */
  videoBlob?: Blob; /** AI 生成并下载的视频本体（存 IndexedDB，可跨会话预览） */
  sourceUrl?: string; /** 生成服务返回的视频地址 */
  genMs?: number; /** AI 生成实际耗时（毫秒，提交→出片全程实测） */
  cost?: number; /** 本次生成的估算花费（元，按模型单价 × 时长折算） */
  createdAt: number;
}
