import type { Clip } from '../types/clip';

/** 模型单条 10 秒片段的估算成本（元）——参考值，实际以各平台计费为准 */
export const MODEL_COST_ESTIMATE: Record<string, number> = {
  Muse: 0.2,
  即梦: 0.5,
  可灵: 0.5,
  Runway: 1.2,
  Veo: 1.5,
  Sora: 1.5,
  海螺: 0.3,
  Vidu: 0.4,
  未记录: 0,
};

/** Gemini Omni 视频官方单价（USD/秒，720p）：1.2 为 $0.07/s，1.1 为 $0.10/s（约 ¥7.2 汇率折算） */
export const GEMINI_VIDEO_COST_PER_SEC_USD: Record<string, number> = {
  'gemini-omni-1.2-flash': 0.07,
  'gemini-omni-1.1-flash': 0.1,
};

export function modelCostPerClip(model: string, durationSec = 10): number {
  // Gemini Omni 按秒计价（720p 官方价 × 时长 × 汇率）
  const perSecUsd = GEMINI_VIDEO_COST_PER_SEC_USD[model];
  if (perSecUsd != null && durationSec > 0) {
    return Math.round(perSecUsd * durationSec * 7.2 * 100) / 100;
  }
  const per10s = MODEL_COST_ESTIMATE[model] ?? 0.3;
  // 按实际时长折算（默认按 10 秒一条的参考价），时长未知也按整条计
  return Math.round(per10s * (durationSec > 0 ? durationSec / 10 : 1) * 100) / 100;
}

/** 累计生成耗时（毫秒，只有实测过 genMs 的片段参与） */
export function sumGenMs(clips: Clip[]): number {
  return clips.reduce((sum, c) => sum + (c.genMs ?? 0), 0);
}

/** 累计生成花费（元）：优先用生成时记下的估算，老数据按模型单价补算 */
export function sumCost(clips: Clip[]): number {
  const total = clips.reduce((sum, c) => sum + (c.cost ?? modelCostPerClip(c.model, c.duration)), 0);
  return Math.round(total * 100) / 100;
}

/** 生成成功时记录的估算花费（元，按模型单价 × 实际时长） */
export function estimateClipCost(model: string, durationSec: number): number {
  return modelCostPerClip(model, durationSec);
}

export interface ModelCostRow {
  model: string;
  count: number;
  costPerClip: number;
  subtotal: number;
}

export function computeModelCosts(clips: Clip[]): ModelCostRow[] {
  const counts = new Map<string, number>();
  for (const c of clips) counts.set(c.model, (counts.get(c.model) ?? 0) + 1);
  return [...counts.entries()]
    .map(([model, count]) => ({
      model,
      count,
      costPerClip: modelCostPerClip(model),
      subtotal: Math.round(count * modelCostPerClip(model) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count);
}

/** 最近 N 天每天生成的片段数与耗时/花费（折线图数据源，0 = 没生成） */
export function dailyClipCounts(
  clips: Clip[],
  days = 30,
): Array<{ date: string; count: number; cost: number }> {
  const result: Array<{ date: string; count: number; cost: number }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const counts = new Map<string, number>();
  for (const c of clips) {
    const d = new Date(c.createdAt);
    d.setHours(0, 0, 0, 0);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const costs = new Map<string, number>();
  for (const c of clips) {
    const d = new Date(c.createdAt);
    d.setHours(0, 0, 0, 0);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    costs.set(key, (costs.get(key) ?? 0) + (c.cost ?? 0));
  }
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    result.push({ date: key, count: counts.get(key) ?? 0, cost: Math.round((costs.get(key) ?? 0) * 100) / 100 });
  }
  return result;
}

/** 今天 0 点之后创建的片段数（配额用量） */
export function todayClipCount(clips: Clip[]): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return clips.filter((c) => c.createdAt >= start.getTime()).length;
}
