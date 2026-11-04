import type { Clip, ClipStatus } from '../types/clip';
import { MAX_RETRY } from '../types/clip';

/** 片段状态徽章配色 */
export const CLIP_STATUS_STYLE: Record<ClipStatus, string> = {
  待生成: 'bg-zinc-500/15 text-zinc-500 dark:text-zinc-400',
  生成中: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  待质检: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  通过: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  失败: 'bg-red-500/15 text-red-600 dark:text-red-400',
  放弃: 'bg-zinc-500/15 text-zinc-500 line-through dark:text-zinc-400',
};

/**
 * 自动打分（0–100，人工可改覆盖）：
 * - 时长 60 分：|时长−10| ≤ 0.5s 满分，每超 0.5s 扣 10，保底 10
 * - 分辨率 30 分：等于目标分辨率 30，比例一致 20，否则 5
 * - 文件大小 10 分：能读到就给
 */
export function autoScore(
  clip: { duration: number; width: number; height: number; fileSize: number },
  target: { width: number; height: number },
): number {
  const durDiff = Math.abs(clip.duration - 10);
  let score = durDiff <= 0.5 ? 60 : Math.max(10, 60 - Math.floor((durDiff - 0.5) / 0.5 + 1) * 10);
  if (clip.width === target.width && clip.height === target.height) score += 30;
  else if (Math.abs(clip.width / clip.height - target.width / target.height) < 0.02) score += 20;
  else score += 5;
  score += clip.fileSize > 0 ? 10 : 0;
  return Math.min(100, score);
}

/** 失败时的状态：重试次数已用完（≥2）就直接「放弃」 */
export function statusAfterFail(retryCount: number): ClipStatus {
  return retryCount >= MAX_RETRY ? '放弃' : '失败';
}

/** 还能不能重试：失败状态且没重试够 2 次 */
export function canRetry(clip: Clip): boolean {
  return clip.status === '失败' && clip.retryCount < MAX_RETRY;
}

/** 常见生成模型（datalist 提示用，可自由填写） */
export const KNOWN_MODELS = ['Muse', '即梦', '可灵', 'Runway', 'Veo', 'Sora', '海螺', 'Vidu'];
