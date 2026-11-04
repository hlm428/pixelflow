import { describe, expect, it } from 'vitest';
import { computeOverall, computeQCStats, QC_CHECKLIST, reportToMarkdown } from './qc';
import type { QCCheckItem, QCReport } from '../types/qc';

function checks(overrides: Record<number, QCCheckItem['result']> = {}): QCCheckItem[] {
  return QC_CHECKLIST.map((c) => ({
    id: c.id,
    result: Object.prototype.hasOwnProperty.call(overrides, c.id) ? overrides[c.id] : 'pass',
    note: overrides[c.id] === 'fail' ? '有问题' : '',
  }));
}

function report(overall: 'pass' | 'fail', checkList: QCCheckItem[], shotId = 's1'): QCReport {
  return {
    id: `r${Math.random()}`,
    projectId: 'p1',
    shotId,
    clipId: 'clip1',
    checks: checkList,
    overall,
    createdAt: Date.now(),
  };
}

describe('computeOverall 严格程度判定', () => {
  it('有未打分项 → incomplete', () => {
    const list = checks({ 15: null });
    expect(computeOverall(list, '标准')).toBe('incomplete');
  });

  it('项数不足 15 → incomplete', () => {
    expect(computeOverall(checks().slice(0, 10), '标准')).toBe('incomplete');
  });

  it('严格：全部通过 → pass', () => {
    expect(computeOverall(checks(), '严格')).toBe('pass');
  });

  it('严格：一项跳过也算不过', () => {
    expect(computeOverall(checks({ 3: 'skip' }), '严格')).toBe('fail');
  });

  it('严格：一项不过 → fail', () => {
    expect(computeOverall(checks({ 7: 'fail' }), '严格')).toBe('fail');
  });

  it('标准：跳过但无不过 → pass', () => {
    expect(computeOverall(checks({ 3: 'skip', 8: 'skip' }), '标准')).toBe('pass');
  });

  it('标准：有不过 → fail', () => {
    expect(computeOverall(checks({ 2: 'fail' }), '标准')).toBe('fail');
  });

  it('宽松：非关键项不过不拦', () => {
    // 第 7 项（道具变了吗）不是关键项
    expect(computeOverall(checks({ 7: 'fail' }), '宽松')).toBe('pass');
  });

  it('宽松：关键项不过才拦（第 1 项是关键项）', () => {
    expect(computeOverall(checks({ 1: 'fail' }), '宽松')).toBe('fail');
  });
});

describe('computeQCStats 统计', () => {
  it('通过率计算', () => {
    const reports = [report('pass', checks()), report('fail', checks({ 2: 'fail' })), report('pass', checks())];
    const stats = computeQCStats(reports);
    expect(stats.total).toBe(3);
    expect(stats.passed).toBe(2);
    expect(stats.failed).toBe(1);
    expect(stats.passRate).toBe(67);
  });

  it('空报告通过率为 0 而不是 NaN', () => {
    expect(computeQCStats([]).passRate).toBe(0);
  });

  it('最容易不过的检查项排序正确', () => {
    const reports = [
      report('fail', checks({ 2: 'fail' })),
      report('fail', checks({ 2: 'fail', 7: 'fail' })),
      report('fail', checks({ 7: 'fail' })),
    ];
    const stats = computeQCStats(reports);
    expect(stats.topFailItems[0]).toMatchObject({ id: 2, count: 2 });
    expect(stats.topFailItems[1]).toMatchObject({ id: 7, count: 2 });
  });

  it('最容易失败的分镜排序正确', () => {
    const reports = [
      report('fail', checks({ 2: 'fail' }), 's1'),
      report('fail', checks({ 3: 'fail' }), 's1'),
      report('fail', checks({ 4: 'fail' }), 's2'),
    ];
    const stats = computeQCStats(reports);
    expect(stats.topFailShots[0]).toMatchObject({ shotId: 's1', count: 2 });
    expect(stats.topFailShots[1]).toMatchObject({ shotId: 's2', count: 1 });
  });

  it('通过的报告不计入失败分镜', () => {
    const stats = computeQCStats([report('pass', checks(), 's9')]);
    expect(stats.topFailShots).toHaveLength(0);
  });
});

describe('reportToMarkdown 导出', () => {
  it('包含片段名、总体结果和不通过项', () => {
    const r = report('fail', checks({ 2: 'fail' }));
    const md = reportToMarkdown(r, { fileName: 'clip01.mp4' } as never);
    expect(md).toContain('clip01.mp4');
    expect(md).toContain('不通过');
    expect(md).toContain('有黑帧吗');
    expect(md).toContain('有问题');
  });
});
