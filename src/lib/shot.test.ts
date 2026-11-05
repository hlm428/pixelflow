import { describe, expect, it } from 'vitest';
import {
  draftToShot,
  planShotCount,
  recalcShots,
  splitStoryToShots,
  splitStoryUnits,
} from './shot';
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
  it('60 秒 = 6 个分镜（10s/镜）', () => {
    expect(planShotCount(60)).toBe(6);
  });

  it('60 秒 = 12 个分镜（5s/镜）', () => {
    expect(planShotCount(60, 5)).toBe(12);
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

  it('5 秒单镜时长：1→0s, 2→5s, 3→10s', () => {
    const out = recalcShots([shot(1, 0), shot(2, 10)], 5);
    expect(out.map((s) => s.startTime)).toEqual([0, 5]);
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

describe('splitStoryUnits 叙事单元三级切分', () => {
  it('句号级：正常多句故事', () => {
    const u = splitStoryUnits('雨中分伞。便利店买汽水。河边碰杯。');
    expect(u).toEqual(['雨中分伞。', '便利店买汽水。', '河边碰杯。']);
  });

  it('一整句没有句号 → 逗号级切分', () => {
    const u = splitStoryUnits('雨天校门口分伞，便利店买橘子汽水，河边日落碰杯，纸条写着明天见');
    expect(u.length).toBeGreaterThanOrEqual(3);
    expect(u[0]).toContain('雨天');
  });

  it('连逗号都没有的超长段 → 长度级切分', () => {
    const long = '这是一个没有任何标点符号的超长故事需要靠长度来切分它讲述了一个女孩在雨夜里走过整条商店街的故事';
    const u = splitStoryUnits(long);
    expect(u.length).toBeGreaterThanOrEqual(2);
    expect(u.every((x) => x.length > 0)).toBe(true);
  });

  it('空故事 → 0 个单元', () => {
    expect(splitStoryUnits('   ')).toEqual([]);
  });
});

describe('splitStoryToShots 语义拆分（绝不生成空模板）', () => {
  it('空故事才用节拍占位（最多 6 条）', () => {
    const drafts = splitStoryToShots('', 60);
    expect(drafts).toHaveLength(6);
    expect(drafts[0].description).toContain('开端');
    expect(drafts[5].description).toContain('收尾');
  });

  it('短故事：单元数少于时长上限 → 一段一个情节，条条有内容', () => {
    const drafts = splitStoryToShots('雨中分伞。便利店买汽水。河边日落碰杯。纸条明天见。', 60);
    expect(drafts).toHaveLength(4); // 4 个情节 = 4 段，不是凑满 6 段
    expect(drafts.every((d) => !d.description.includes('待补充'))).toBe(true);
    expect(drafts[0].description).toContain('雨中分伞');
    expect(drafts[3].description).toContain('纸条');
  });

  it('一整段没句号的故事也能拆出多个有内容的分镜', () => {
    const drafts = splitStoryToShots('雨天校门口分伞，便利店买橘子汽水，河边日落碰杯，纸条写着明天见', 60);
    expect(drafts.length).toBeGreaterThanOrEqual(3);
    expect(drafts.every((d) => d.description.length > 0 && !d.description.includes('待补充'))).toBe(true);
  });

  it('长故事：按时长上限均匀分配，每段都有内容', () => {
    const story = Array.from({ length: 12 }, (_, i) => `第${i + 1}个情节。`).join('');
    const drafts = splitStoryToShots(story, 60);
    expect(drafts).toHaveLength(6);
    expect(drafts.every((d) => !d.description.includes('待补充'))).toBe(true);
    const all = drafts.map((d) => d.description).join('');
    expect(all).toContain('第1个情节');
    expect(all).toContain('第12个情节');
  });

  it('运镜预设轮换', () => {
    const drafts = splitStoryToShots('第一句。第二句。', 60);
    expect(drafts).toHaveLength(2);
    expect(drafts[0].camera).not.toBe(drafts[1].camera);
  });

  it('5 秒单镜：短故事按语义拆，不受凑数影响', () => {
    const drafts = splitStoryToShots('A。B。C。', 60, 5);
    expect(drafts).toHaveLength(3);
  });
});

describe('draftToShot 草稿转记录', () => {
  it('字段齐全：编号、时间点、状态待写', () => {
    const s = draftToShot('p1', { description: 'a', visualContent: 'b', camera: '推近', light: '', dialogue: '' }, 3);
    expect(s.index).toBe(3);
    expect(s.startTime).toBe(20);
    expect(s.status).toBe('待写');
    expect(s.promptVersion).toBe(0);
    expect(s.id).toBeTruthy();
  });

  it('5 秒单镜时长：第 3 镜从 10s 开始', () => {
    const s = draftToShot('p1', { description: 'a', visualContent: 'b', camera: '', light: '', dialogue: '' }, 3, 5);
    expect(s.startTime).toBe(10);
  });
});
