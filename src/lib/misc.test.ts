import { describe, expect, it } from 'vitest';
import { autoScore, canRetry, statusAfterFail } from './clip';
import { estimateFileMB, xfadeOffset } from './ffmpeg';
import { daysUntil, formatClock, formatDuration, percent } from './utils';
import { generatePublishKit } from './publish';
import type { Project } from '../types/project';

describe('autoScore 自动打分', () => {
  const target = { width: 1280, height: 720 };

  it('满规格片段 = 100 分', () => {
    expect(autoScore({ duration: 10, width: 1280, height: 720, fileSize: 1024 }, target)).toBe(100);
  });

  it('时长差 0.5 秒内不扣分', () => {
    const s = autoScore({ duration: 9.6, width: 1280, height: 720, fileSize: 1 }, target);
    expect(s).toBe(100);
  });

  it('时长偏差大则扣分', () => {
    const s = autoScore({ duration: 13, width: 1280, height: 720, fileSize: 1 }, target);
    expect(s).toBeLessThan(60);
  });

  it('比例一致但分辨率不同也给部分分', () => {
    const s = autoScore({ duration: 10, width: 1920, height: 1080, fileSize: 1 }, target);
    expect(s).toBe(60 + 20 + 10);
  });

  it('比例错误只有保底分', () => {
    const s = autoScore({ duration: 10, width: 720, height: 1280, fileSize: 1 }, target);
    expect(s).toBe(60 + 5 + 10);
  });
});

describe('状态机：失败与重试', () => {
  it('首次失败 → 失败', () => {
    expect(statusAfterFail(0)).toBe('失败');
  });

  it('重试用完（≥2 次）再失败 → 放弃', () => {
    expect(statusAfterFail(2)).toBe('放弃');
    expect(statusAfterFail(3)).toBe('放弃');
  });

  it('canRetry：失败且未到上限才可重试', () => {
    expect(
      canRetry({ status: '失败', retryCount: 0 } as never),
    ).toBe(true);
    expect(
      canRetry({ status: '失败', retryCount: 2 } as never),
    ).toBe(false);
    expect(
      canRetry({ status: '通过', retryCount: 0 } as never),
    ).toBe(false);
  });
});

describe('拼接辅助', () => {
  it('预估文件大小：8Mbps × 60s ≈ 57 MiB（8Mbps = 1,000,000 B/s）', () => {
    expect(estimateFileMB(60, 8)).toBe(57);
  });

  it('xfade offset 对齐 v2 实测接缝：9.875 / 19.75', () => {
    expect(xfadeOffset(1, 10, 0.125)).toBe(9.875);
    expect(xfadeOffset(2, 10, 0.125)).toBe(19.75);
    expect(xfadeOffset(5, 10, 0.125)).toBe(49.375);
  });
});

describe('格式化工具', () => {
  it('formatDuration', () => {
    expect(formatDuration(10)).toBe('10s');
    expect(formatDuration(95)).toBe('1分35秒');
    expect(formatDuration(120)).toBe('2分');
  });

  it('formatClock', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(65)).toBe('01:05');
  });

  it('percent', () => {
    expect(percent(3, 4)).toBe(75);
    expect(percent(1, 0)).toBe(0);
    expect(percent(2, 3)).toBe(67);
  });

  it('daysUntil：空日期返回 null，昨天 ≤ 0', () => {
    expect(daysUntil('')).toBeNull();
    const yesterday = new Date(Date.now() - 86_400_000);
    const ymd = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    expect(daysUntil(ymd)).toBeLessThanOrEqual(0);
  });
});

describe('generatePublishKit 发布套件', () => {
  const project: Project = {
    id: 'p1',
    name: '柑橘味的夏天',
    theme: '双女主百合',
    oneLineStory: '雨天校门口分伞',
    targetDuration: 60,
    aspectRatio: '16:9',
    style: '动漫',
    activeEra: '现代',
    status: '制作中',
    createdAt: 0,
    updatedAt: 0,
  };

  it('抖音标题不超过 20 字', () => {
    const kit = generatePublishKit(project, '这是一个超过二十个字的很长很长很长很长的成片标题测试用例');
    expect(kit.douyin.title.length).toBeLessThanOrEqual(20);
  });

  it('四个平台都带 AI 声明', () => {
    const kit = generatePublishKit(project, '柑橘味的夏天');
    expect(kit.douyin.description).toContain('AI 生成');
    expect(kit.bilibili.description).toContain('AI 生成');
    expect(kit.channels.description).toContain('AI 生成');
    expect(kit.youtube.description).toContain('AI-generated');
  });

  it('抖音标签恰好 5 个', () => {
    const kit = generatePublishKit(project, '柑橘味的夏天');
    expect(kit.douyin.tags).toHaveLength(5);
  });
});
