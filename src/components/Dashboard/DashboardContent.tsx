import { qcPassRate, shotProgress, computeProjectStats } from '../../lib/stats';
import { formatRelative } from '../../lib/utils';
import { Link } from 'react-router-dom';
import { FAIL_REASONS } from '../../types/clip';
import type { Clip } from '../../types/clip';
import type { QCReport } from '../../types/qc';
import type { Project } from '../../types/project';
import type { Shot } from '../../types/shot';
import StatsCards from './StatsCards';
import QuotaChart from './QuotaChart';
import CostTable from './CostTable';

export interface DashboardData {
  projects: Project[];
  shots: Shot[];
  clips: Clip[];
  reports: QCReport[];
  dailyQuota: number;
}

const FAIL_COLORS = ['#ef4444', '#f59e0b', '#8b5cf6', '#0ea5e9', '#e5e7eb', '#f43f5e', '#6b7280'];

/** 看板主体：数字卡片 + 图表 + 成本 + 项目进度表 + 失败饼图 */
export default function DashboardContent({ projects, shots, clips, reports, dailyQuota }: DashboardData) {
  // 失败原因饼图（conic-gradient）
  const failCounts = FAIL_REASONS.map((r) => ({
    reason: r,
    count: clips.filter((c) => c.failReason === r).length,
  })).filter((f) => f.count > 0);
  const totalFails = failCounts.reduce((s, f) => s + f.count, 0);
  let acc = 0;
  const gradient = failCounts
    .map((f, i) => {
      const start = (acc / totalFails) * 360;
      acc += f.count;
      const end = (acc / totalFails) * 360;
      return `${FAIL_COLORS[i % FAIL_COLORS.length]} ${start}deg ${end}deg`;
    })
    .join(', ');

  return (
    <div className="space-y-4">
      <StatsCards projects={projects} shots={shots} clips={clips} reports={reports} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <QuotaChart clips={clips} dailyQuota={dailyQuota} />
        <CostTable clips={clips} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* 项目进度表 */}
        <div className="card p-4">
          <h2 className="text-sm font-semibold">项目进度</h2>
          {projects.length === 0 ? (
            <p className="mt-6 text-center text-sm text-zinc-500">还没有项目</p>
          ) : (
            <div className="mt-2.5 space-y-2.5">
              {projects.map((p) => {
                const stats = computeProjectStats(
                  shots.filter((s) => s.projectId === p.id),
                  clips.filter((c) => c.projectId === p.id),
                  reports.filter((r) => r.projectId === p.id),
                );
                const progress = shotProgress(stats);
                return (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="block rounded-lg p-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{p.name}</span>
                      <span className="ml-auto text-[11px] text-zinc-400">{formatRelative(p.updatedAt)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-800">
                        <div
                          className={`h-1.5 rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-zinc-400">{progress}%</span>
                    </div>
                    <div className="mt-1 flex gap-3 text-[11px] text-zinc-400">
                      <span>通过率 {qcPassRate(stats)}%</span>
                      <span className="text-red-400">失败 {stats.failedShots}</span>
                      <span>片段 {stats.totalClips}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* 失败原因饼图 */}
        <div className="card p-4">
          <h2 className="text-sm font-semibold">QC / 片段失败原因分布</h2>
          {totalFails === 0 ? (
            <p className="mt-6 text-center text-sm text-zinc-500">还没有失败记录 —— 保持！</p>
          ) : (
            <div className="mt-3 flex items-center gap-5">
              <div
                className="h-28 w-28 shrink-0 rounded-full"
                style={{ background: `conic-gradient(${gradient})` }}
                title="失败原因占比"
              />
              <div className="space-y-1.5">
                {failCounts.map((f, i) => (
                  <div key={f.reason} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ background: FAIL_COLORS[i % FAIL_COLORS.length] }}
                    />
                    <span>{f.reason}</span>
                    <span className="font-mono text-zinc-400">
                      {f.count} 次 · {Math.round((f.count / totalFails) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
