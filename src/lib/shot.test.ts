import { describe, expect, it } from 'vitest';
import { draftToShot, planShotCount, recalcShots, splitStoryToShots } from './shot';
import type { Shot } from '../types/shot';

function shot(index: number, startTime: number): Shot {
  return {
    id: `s${index}`,
    projectId: 'p1',
    index,
    startTime,
    description: 'd',
    visualContent: 'v',
    camera: '推近',
    dialogue: '',
    characterIds: [],
    status: '待写',
    promptVersion: 0,
  };
}

describe('planShotCount 分镜数量估算', () => {
  it('60 秒 = 6 个分镜', () => {
    expect(planShotCount(60)).toBe(6);
  });

  it('120 秒 = 12 个分镜', () => {
    expect(planShotCount(120)).toBe(12);
  });

  it('90 秒自定义 = 9 个分镜', () => {
    expect(planShotCount(90)).toBe(9);
  });

  it('过小时长保底 1 个', () => {
    expect(planShotCount(0)).toBe(1);
    expect(planShotCount(5)).toBe(1);
  });
});

describe('recalcShots 时间点自动重算', () => {
  it('乱序重排后编号和时间点重算：1→0s, 2→10s, 3→20s', () => {
    const input = [shot(5, 999), shot(1, -5), shot(3, 77)];
    const out = recalcShots(input);
    expect(out.map((s) => s.index)).toEqual([1, 2, 3]);
    expect(out.map((s) => s.startTime)).toEqual([0, 10, 20]);
  });

  it('删除中间一个后自动前移', () => {
    const input = [shot(1, 0), shot(2, 10), shot(3, 20)];
    const out = recalcShots(input.slice(0, 1).concat(input.slice(2)));
    expect(out.map((s) => s.startTime)).toEqual([0, 10]);
    expect(out[1].index).toBe(2);
  });

  it('每段固定 10 秒', () => {
    const out = recalcShots(Array.from({ length: 7 }, (_, i) => shot(i + 1, i * 99)));
    expect(out[6].startTime).toBe(60);
  });
});

describe('splitStoryToShots 一句话拆分镜', () => {
  it('空故事也生成 count 个节拍占位', () => {
    const drafts = splitStoryToShots('', 60);
    expect(drafts).toHaveLength(6);
    expect(drafts[0].description).toContain('开端');
    expect(drafts[5].description).toContain('收尾');
  });

  it('句子少于段数：句子均匀铺开（第 0、3 组），缺的用节拍补', () => {
    const drafts = splitStoryToShots('第一句。第二句。', 60);
    expect(drafts).toHaveLength(6);
    expect(drafts[0].description).toContain('第一句');
    // floor(1 * 6 / 2) = 3 → 第二句落在第 3 组
    expect(drafts[3].description).toContain('第二句');
    expect(drafts[1].description).toContain('待补充');
    expect(drafts[2].description).toContain('待补充');
  });

  it('句子多于段数：均匀分配，每段都有内容', () => {
    const story = Array.from({ length: 8 }, (_, i) => `第${i + 1}句。`).join('');
    const drafts = splitStoryToShots(story, 60);
    expect(drafts).toHaveLength(6);
    expect(drafts.every((d) => d.description.length > 0 && !d.description.includes('待补充'))).toBe(true);
    // 全部句子都被分配
    const all = drafts.map((d) => d.description).join('');
    expect(all).toContain('第1句');
    expect(all).toContain('第8句');
  });

  it('带运镜预设轮换', () => {
    const drafts = splitStoryToShots('只有一句话。', 30);
    expect(drafts[0].camera).not.toBe('');
    expect(drafts[1].camera).not.toBe(drafts[0].camera);
  });
});

describe('draftToShot 草稿转记录', () => {
  it('字段齐全：编号、时间点、状态待写', () => {
    const s = draftToShot('p1', { description: 'a', visualContent: 'b', camera: '推近', dialogue: '' }, 3);
    expect(s.index).toBe(3);
    expect(s.startTime).toBe(20);
    expect(s.status).toBe('待写');
    expect(s.promptVersion).toBe(0);
    expect(s.id).toBeTruthy();
  });
});

describe('接力一致性', () => {
  it('第 2 镜及以后 index ≥ 2（接力句判断依据）', () => {
    const out = recalcShots([shot(1, 0), shot(2, 10)]);
    expect(out[0].index).toBeLessThan(2);
    expect(out[1].index).toBeGreaterThanOrEqual(2);
  });
});
