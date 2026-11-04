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

export function modelCostPerClip(model: string): number {
  return MODEL_COST_ESTIMATE[model] ?? 0.3;
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

/** 最近 N 天每天生成的片段数（0 = 没生成） */
export function dailyClipCounts(clips: Clip[], days = 30): Array<{ date: string; count: number }> {
  const result: Array<{ date: string; count: number }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const counts = new Map<string, number>();
  for (const c of clips) {
    const d = new Date(c.createdAt);
    d.setHours(0, 0, 0, 0);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    result.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return result;
}

/** 今天 0 点之后创建的片段数（配额用量） */
export function todayClipCount(clips: Clip[]): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return clips.filter((c) => c.createdAt >= start.getTime()).length;
}
