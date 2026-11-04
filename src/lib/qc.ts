import type { QCCheckItem, QCReport } from '../types/qc';
import type { Clip } from '../types/clip';
import type { Shot } from '../types/shot';
import type { QCStrictness } from '../store/settingsStore';
import { formatDate } from './utils';

export interface QCChecklistItem {
  id: number;
  name: string;
  detail: string;
  example: string;
  /** 宽松模式下仍必须过的关键项 */
  required: boolean;
}

/** QC 自动检查清单（15 项，每项带说明和例子） */
export const QC_CHECKLIST: QCChecklistItem[] = [
  { id: 1, name: '首帧和尾帧能看清吗', detail: '第一帧和最后一帧不能是黑的、糊的、纯色块', example: '开场一帧全黑 = 不过', required: true },
  { id: 2, name: '有黑帧吗', detail: '中间突然黑一下', example: '第 3 秒闪黑半秒 = 不过', required: true },
  { id: 3, name: '有冻帧吗', detail: '画面超过 1 秒完全不动，像 PPT', example: '人物定住 1.5 秒 = 不过', required: true },
  { id: 4, name: '动作逻辑对吗', detail: '开门的手方向、拿杯子的左右手要对', example: '左手拿杯突然变右手 = 不过', required: true },
  { id: 5, name: '人物脸变了吗', detail: '和角色卡对比：脸型、眼睛颜色', example: '紫眼睛变棕色 = 穿帮（脸变）', required: false },
  { id: 6, name: '衣服变了吗', detail: '颜色、款式和角色卡一致', example: '红格子围巾变粉色 = 穿帮（衣服变）', required: false },
  { id: 7, name: '道具变了吗', detail: '伞的颜色、臂章、杯子等道具连续', example: '粉色伞下一镜变红格子伞 = 不过（柑橘 v2 第 2 段真实案例）', required: false },
  { id: 8, name: '有 AI 生成的文字吗', detail: '有就不过，文字要后期 overlay', example: '招牌出现乱码假字 = 不过', required: true },
  { id: 9, name: '画面比例对吗', detail: '16:9 还是 9:16，别搞错', example: '横屏项目出了 9:16 素材 = 不过', required: true },
  { id: 10, name: '亮度/色温和前后分镜一致吗', detail: '不能一个分镜亮一个分镜暗', example: '白天戏里突然像夜晚 = 不过', required: false },
  { id: 11, name: '有闪烁吗', detail: '亮度忽明忽暗', example: '整段画面规律性闪 = 不过', required: false },
  { id: 12, name: '运镜顺滑吗', detail: '没有突然跳一下、抖一下', example: '推近中途瞬移 = 不过', required: false },
  { id: 13, name: '和上一个分镜接得上吗', detail: '位置、动作连续（接力规则）', example: 'A 段收尾坐下，B 段开头却站着 = 不过', required: true },
  { id: 14, name: '时长是 10 秒吗', detail: '误差 ±0.5 秒内算过', example: '9.2 秒 = 不过', required: true },
  { id: 15, name: '分辨率达标吗', detail: '横屏 1280×720，竖屏 720×1280', example: '横屏出了 960×540 = 不过', required: true },
];

/**
 * 按严格程度算总体结果：
 * - 严格：15 项全 pass（skip 也算不过）
 * - 标准：无 fail 即过（允许 skip）
 * - 宽松：只有关键项 fail 才不过
 */
export function computeOverall(
  checks: QCCheckItem[],
  strictness: QCStrictness,
): 'pass' | 'fail' | 'incomplete' {
  if (checks.length < QC_CHECKLIST.length || checks.some((c) => c.result === null)) {
    return 'incomplete';
  }
  const fails = checks.filter((c) => c.result === 'fail');
  if (strictness === '宽松') {
    return fails.some((f) => QC_CHECKLIST[f.id - 1]?.required) ? 'fail' : 'pass';
  }
  if (fails.length > 0) return 'fail';
  if (strictness === '严格') {
    return checks.every((c) => c.result === 'pass') ? 'pass' : 'fail';
  }
  return 'pass';
}

export interface QCStats {
  total: number;
  passed: number;
  failed: number;
  passRate: number; // 0–100
  /** 每个检查项的 fail 次数（id 1–15） */
  itemFailCounts: Record<number, number>;
  /** 最容易不过的检查项（按 fail 次数降序，前 3） */
  topFailItems: Array<{ id: number; name: string; count: number }>;
  /** 最容易失败的分镜（按 fail 报告数降序，前 3） */
  topFailShots: Array<{ shotId: string; count: number }>;
}

/** QC 统计（纯函数，可单测） */
export function computeQCStats(reports: QCReport[]): QCStats {
  const passed = reports.filter((r) => r.overall === 'pass').length;
  const failed = reports.length - passed;
  const itemFailCounts: Record<number, number> = {};
  const shotFailCounts: Record<string, number> = {};
  for (const r of reports) {
    if (r.overall !== 'pass') {
      shotFailCounts[r.shotId] = (shotFailCounts[r.shotId] ?? 0) + 1;
    }
    for (const c of r.checks) {
      if (c.result === 'fail') {
        itemFailCounts[c.id] = (itemFailCounts[c.id] ?? 0) + 1;
      }
    }
  }
  const topFailItems = Object.entries(itemFailCounts)
    .map(([id, count]) => ({
      id: Number(id),
      name: QC_CHECKLIST[Number(id) - 1]?.name ?? `第 ${id} 项`,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  const topFailShots = Object.entries(shotFailCounts)
    .map(([shotId, count]) => ({ shotId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  return {
    total: reports.length,
    passed,
    failed,
    passRate: reports.length === 0 ? 0 : Math.round((passed / reports.length) * 100),
    itemFailCounts,
    topFailItems,
    topFailShots,
  };
}

/** QC 报告导出 Markdown */
export function reportToMarkdown(report: QCReport, clip: Clip, shot?: Shot): string {
  const lines: string[] = [
    `# QC 报告`,
    ``,
    `- 片段：${clip.fileName}`,
    `- 分镜：${shot ? `#${shot.index}（${shot.startTime}s）` : report.shotId}`,
    `- 检查时间：${formatDate(report.createdAt)}`,
    `- 总体：${report.overall === 'pass' ? '✅ 通过' : '❌ 不通过'}`,
    ``,
    `## 15 项检查结果`,
    ``,
    `| # | 检查项 | 结果 | 说明 |`,
    `|---|---|---|---|`,
  ];
  for (const c of report.checks) {
    const item = QC_CHECKLIST[c.id - 1];
    const resultText = c.result === 'pass' ? '✅ 通过' : c.result === 'fail' ? '❌ 不通过' : '⏭️ 跳过';
    lines.push(`| ${c.id} | ${item?.name ?? ''} | ${resultText} | ${c.note || ''} |`);
  }
  const failItems = report.checks.filter((c) => c.result === 'fail');
  if (failItems.length > 0) {
    lines.push(``, `## 不通过项`, ``);
    for (const c of failItems) {
      lines.push(`- 第 ${c.id} 项「${QC_CHECKLIST[c.id - 1]?.name ?? ''}」：${c.note || '（未填原因）'}`);
    }
  }
  lines.push(``, `---`, ``, `*本报告由 PixelFlow AI 视频工作台生成*`);
  return lines.join('\n');
}

/** QC 报告导出 JSON */
export function reportToJSON(report: QCReport): string {
  return JSON.stringify(report, null, 2);
}
