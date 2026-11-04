import { describe, expect, it } from 'vitest';
import { computeModelCosts, dailyClipCounts, modelCostPerClip, todayClipCount } from './dashboard';
import type { Clip } from '../types/clip';

function clip(daysAgo = 0, model = 'Muse', failReason: Clip['failReason'] = null): Clip {
  const created = Date.now() - daysAgo * 86_400_000 - 60_000; // 避开临界点
  return {
    id: `c${Math.random()}`,
    projectId: 'p1',
    shotId: 's1',
    fileName: 'a.mp4',
    duration: 10,
    width: 1280,
    height: 720,
    fps: 24,
    fileSize: 1024,
    model,
    promptVersion: 1,
    status: '通过',
    failReason,
    failNote: '',
    retryCount: 0,
    score: 90,
    isBest: false,
    createdAt: created,
  };
}

describe('todayClipCount 配额计算', () => {
  it('只统计今天的片段', () => {
    const clips = [clip(0), clip(0), clip(1), clip(3)];
    expect(todayClipCount(clips)).toBe(2);
  });

  it('空列表 = 0', () => {
    expect(todayClipCount([])).toBe(0);
  });
});

describe('dailyClipCounts 每日生成量', () => {
  it('固定返回 30 天且最后一天是今天', () => {
    const daily = dailyClipCounts([clip(0)], 30);
    expect(daily).toHaveLength(30);
    expect(daily[29].count).toBe(1);
    expect(daily[0].count).toBe(0);
  });

  it('同一天多条合并计数', () => {
    const daily = dailyClipCounts([clip(0), clip(0), clip(0)], 7);
    expect(daily[6].count).toBe(3);
  });
});

describe('computeModelCosts 成本统计', () => {
  it('按模型聚合次数', () => {
    const rows = computeModelCosts([clip(0, 'Muse'), clip(0, 'Muse'), clip(0, '即梦')]);
    const muse = rows.find((r) => r.model === 'Muse');
    expect(muse?.count).toBe(2);
  });

  it('小计 = 次数 × 单价', () => {
    const rows = computeModelCosts([clip(0, '即梦'), clip(0, '即梦')]);
    const jimeng = rows.find((r) => r.model === '即梦');
    expect(jimeng?.subtotal).toBe(1);
  });

  it('未知模型用默认单价', () => {
    expect(modelCostPerClip('神秘模型')).toBe(0.3);
    expect(modelCostPerClip('Muse')).toBe(0.2);
  });
});
