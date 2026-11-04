import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { useSettingsStore } from '../store/settingsStore';
import { useToastStore } from '../store/toastStore';
import { useShotStore } from '../store/shotStore';
import { useClipStore } from '../store/clipStore';
import { useQCStore } from '../store/qcStore';
import { CLIP_STATUS_STYLE } from '../lib/clip';
import { computeQCStats, computeOverall } from '../lib/qc';
import type { QCCheckItem } from '../types/qc';
import type { ClipStatus } from '../types/clip';
import QCChecklist from '../components/QC/QCChecklist';
import QCReportView from '../components/QC/QCReportView';

const QUEUE_STATUSES: ClipStatus[] = ['待质检', '通过', '失败', '放弃'];

/** QC 质检页：左片段队列，右 15 项检查 / 报告，顶部统计 */
export default function QC() {
  const currentProjectId = useSettingsStore((s) => s.currentProjectId);
  const strictness = useSettingsStore((s) => s.qcStrictness);
  const projects = useProjectStore((s) => s.projects);
  const project = projects.find((p) => p.id === currentProjectId) ?? null;

  const shots = useShotStore((s) => s.shots);
  const loadShots = useShotStore((s) => s.load);
  const clips = useClipStore((s) => s.clips);
  const loadClips = useClipStore((s) => s.load);
  const reports = useQCStore((s) => s.reports);
  const loadReports = useQCStore((s) => s.load);
  const submitReport = useQCStore((s) => s.submit);
  const showToast = useToastStore((s) => s.show);

  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [showAllClips, setShowAllClips] = useState(false);
  const [recheck, setRecheck] = useState(false);

  // 换选片段时退出重新检查模式
  useEffect(() => {
    setRecheck(false);
  }, [selectedClipId]);

  useEffect(() => {
    if (!currentProjectId) return;
    void loadShots(currentProjectId);
    void loadClips(currentProjectId);
    void loadReports(currentProjectId);
  }, [currentProjectId, loadShots, loadClips, loadReports]);

  const shotMap = useMemo(() => new Map(shots.map((s) => [s.id, s])), [shots]);
  const reportByClip = useMemo(() => {
    const m = new Map<string, typeof reports[number]>();
    for (const r of [...reports].sort((a, b) => a.createdAt - b.createdAt)) m.set(r.clipId, r);
    return m;
  }, [reports]);

  const queue = useMemo(() => {
    const list = showAllClips ? clips : clips.filter((c) => QUEUE_STATUSES.includes(c.status));
    return [...list].sort((a, b) => {
      // 待质检排最前，然后按创建时间倒序
      const aQC = a.status === '待质检' ? 0 : 1;
      const bQC = b.status === '待质检' ? 0 : 1;
      if (aQC !== bQC) return aQC - bQC;
      return b.createdAt - a.createdAt;
    });
  }, [clips, showAllClips]);

  const stats = useMemo(() => computeQCStats(reports), [reports]);

  if (!currentProjectId || !project) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <div className="text-4xl">✅</div>
        <p className="mt-3 text-sm text-zinc-500">先在顶部选择一个项目。</p>
        <Link to="/projects" className="btn-primary mt-4 inline-flex">
          去项目页
        </Link>
      </div>
    );
  }

  const selectedClip = clips.find((c) => c.id === selectedClipId) ?? null;
  const selectedReport = selectedClip ? (reportByClip.get(selectedClip.id) ?? null) : null;

  const handleSubmit = async (checks: QCCheckItem[]) => {
    if (!selectedClip) return;
    const overall = computeOverall(checks, strictness);
    if (overall === 'incomplete') {
      showToast('还有检查项没打完');
      return;
    }
    const report = await submitReport({
      projectId: project.id,
      shotId: selectedClip.shotId,
      clipId: selectedClip.id,
      checks,
      overall,
    });
    showToast(report.overall === 'pass' ? '✅ QC 通过，片段标记为「通过」' : '❌ QC 不通过，片段标记为「失败」');
    setSelectedClipId(null);
  };

  return (
    <div className="space-y-4">
      {/* 统计条 */}
      <div className="card flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
        <h1 className="text-lg font-semibold">QC 质检</h1>
        <span className="text-sm text-zinc-500">{project.name}</span>
        <span className="text-sm">
          报告 <b className="font-mono">{stats.total}</b> · 通过率{' '}
          <b className={`font-mono ${stats.passRate >= 80 ? 'text-emerald-500' : stats.passRate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
            {stats.passRate}%
          </b>
        </span>
        {stats.topFailItems.length > 0 && (
          <span className="text-xs text-zinc-500">
            最易不过：
            {stats.topFailItems.map((t) => `第${t.id}项(${t.count}次)`).join('、')}
          </span>
        )}
        {stats.topFailShots.length > 0 && (
          <span className="text-xs text-zinc-500">
            最易失败分镜：
            {stats.topFailShots
              .map((t) => {
                const s = shotMap.get(t.shotId);
                return `#${s?.index ?? '?'}(${t.count}次)`;
              })
              .join('、')}
          </span>
        )}
        <span className="badge ml-auto bg-indigo-500/10 text-indigo-500">严格度：{strictness}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
        {/* 片段队列 */}
        <aside className="card max-h-[70vh] overflow-y-auto p-2">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-medium text-zinc-500">片段队列（{queue.length}）</span>
            <label className="flex cursor-pointer items-center gap-1 text-[11px] text-zinc-400">
              <input
                type="checkbox"
                className="accent-indigo-600"
                checked={showAllClips}
                onChange={(e) => setShowAllClips(e.target.checked)}
              />
              显示全部
            </label>
          </div>
          {queue.length === 0 ? (
            <p className="p-6 text-center text-sm text-zinc-500">
              没有可质检的片段 —— 到「片段」页上传或把片段状态改成「待质检」。
            </p>
          ) : (
            queue.map((c) => {
              const r = reportByClip.get(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedClipId(c.id)}
                  className={`mb-1.5 w-full rounded-lg border p-2.5 text-left transition-colors ${
                    c.id === selectedClipId
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {r && <span>{r.overall === 'pass' ? '✅' : '❌'}</span>}
                    <span className="truncate font-mono text-xs">{c.fileName}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`badge ${CLIP_STATUS_STYLE[c.status]}`}>{c.status}</span>
                    <span className="text-[10px] text-zinc-400">
                      {shotMap.get(c.shotId) ? `#${shotMap.get(c.shotId)?.index}` : '已删'} · 评分 {c.score}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </aside>

        {/* 检查区 / 报告区 */}
        <div>
          {!selectedClip ? (
            <div className="card flex min-h-[300px] flex-col items-center justify-center p-10 text-center">
              <div className="text-4xl">🔍</div>
              <p className="mt-3 text-sm text-zinc-500">
                从左侧选一个片段，逐项过 15 项检查清单。全部打完才能提交出报告。
              </p>
            </div>
          ) : selectedReport && !recheck && selectedClip.status !== '待质检' ? (
            <div className="space-y-3">
              <QCReportView report={selectedReport} clip={selectedClip} shot={shotMap.get(selectedClip.shotId)} />
              <div className="flex gap-2">
                <button className="btn-outline" onClick={() => setSelectedClipId(null)}>
                  返回队列
                </button>
                <button className="btn-primary" onClick={() => setRecheck(true)}>
                  🔄 重新检查（覆盖结果）
                </button>
              </div>
            </div>
          ) : (
            <QCChecklist
              clip={selectedClip}
              shot={shotMap.get(selectedClip.shotId) ?? null}
              strictness={strictness}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
}
