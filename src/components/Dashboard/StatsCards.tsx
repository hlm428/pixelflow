import { computeQCStats } from '../../lib/qc';
import { sumCost, sumGenMs } from '../../lib/dashboard';
import type { Clip } from '../../types/clip';
import type { QCReport } from '../../types/qc';
import type { Project } from '../../types/project';
import type { Shot } from '../../types/shot';

interface StatsCardsProps {
  projects: Project[];
  shots: Shot[];
  clips: Clip[];
  reports: QCReport[];
}

function Card({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-bold ${tone ?? ''}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-zinc-400">{sub}</div>}
    </div>
  );
}

/** 看板顶部六个数字卡片 */
export default function StatsCards({ projects, shots, clips, reports }: StatsCardsProps) {
  const totalDuration = projects.reduce((sum, p) => sum + shots.filter((s) => s.projectId === p.id).length * 10, 0);
  const qcStats = computeQCStats(reports);
  const totalGenMs = sumGenMs(clips);
  const totalCost = sumCost(clips);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      <Card label="总项目" value={String(projects.length)} sub={`${shots.length} 个分镜`} />
      <Card label="总片段" value={String(clips.length)} sub={`通过 ${clips.filter((c) => c.status === '通过').length} 条`} />
      <Card label="总成片时长" value={`${Math.floor(totalDuration / 60)}分${totalDuration % 60}秒`} sub="按分镜数 × 10s" />
      <Card
        label="QC 通过率"
        value={`${qcStats.passRate}%`}
        sub={`${qcStats.passed}/${qcStats.total} 份报告`}
        tone={qcStats.passRate >= 80 ? 'text-emerald-500' : qcStats.passRate >= 50 ? 'text-amber-500' : 'text-red-500'}
      />
      <Card
        label="生成总耗时"
        value={totalGenMs > 0 ? `${Math.floor(totalGenMs / 60_000)}分${Math.round((totalGenMs % 60_000) / 1000)}秒` : '—'}
        sub={totalGenMs > 0 ? 'AI 生成实测累计' : '生成后自动记录'}
      />
      <Card
        label="生成成本"
        value={totalCost > 0 ? `¥${totalCost}` : '—'}
        sub={totalCost > 0 ? '逐条估算累计' : '生成后自动记录'}
      />
    </div>
  );
}
