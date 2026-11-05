import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { clipsRepo, promptsRepo, qcReportsRepo } from '../../lib/db';
import { SHOT_STATUS_STYLE } from '../../lib/shot';
import { useToastStore } from '../../store/toastStore';
import { copyText, formatDuration, formatFileSize } from '../../lib/utils';
import { CLIP_STATUSES, type Clip } from '../../types/clip';
import type { PromptRecord, Shot } from '../../types/shot';
import type { QCReport } from '../../types/qc';

interface ShotDetailProps {
  shot: Shot | null;
  onClose: () => void;
}

const CLIP_STATUS_STYLE: Record<string, string> = {
  待生成: 'bg-zinc-500/15 text-zinc-500 dark:text-zinc-400',
  生成中: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  待质检: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  通过: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  失败: 'bg-red-500/15 text-red-600 dark:text-red-400',
  放弃: 'bg-zinc-500/15 text-zinc-500 line-through dark:text-zinc-400',
};

/** 分镜详情：完整描述 + 提示词 + 候选片段 + QC 报告（片段管理在 M6、QC 在 M7 全量接入） */
export default function ShotDetail({ shot, onClose }: ShotDetailProps) {
  const showToast = useToastStore((s) => s.show);
  const [prompts, setPrompts] = useState<PromptRecord[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [reports, setReports] = useState<QCReport[]>([]);

  useEffect(() => {
    if (!shot) return;
    void Promise.all([
      promptsRepo.listByProject(shot.projectId),
      clipsRepo.listByProject(shot.projectId),
      qcReportsRepo.listByProject(shot.projectId),
    ]).then(([allPrompts, allClips, allReports]) => {
      setPrompts(
        allPrompts.filter((p) => p.shotId === shot.id).sort((a, b) => b.version - a.version),
      );
      setClips(allClips.filter((c) => c.shotId === shot.id));
      setReports(allReports.filter((r) => r.shotId === shot.id).sort((a, b) => b.createdAt - a.createdAt));
    });
  }, [shot]);

  if (!shot) return null;
  const latestPrompt = prompts[0] ?? null;
  const latestReport = reports[0] ?? null;

  return (
    <Modal open title={`分镜 #${shot.index} · ${shot.startTime}s`} onClose={onClose} wide>
      <div className="space-y-4">
        {/* 基本信息 */}
        <section>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${SHOT_STATUS_STYLE[shot.status]}`}>{shot.status}</span>
            <span className="font-mono text-xs text-zinc-500">时长 {formatDuration(10)}</span>
            {shot.camera && <span className="text-xs text-zinc-500">运镜：{shot.camera}</span>}
            {shot.light && <span className="text-xs text-zinc-500">光线：{shot.light}</span>}
          </div>
          <h3 className="mt-2 text-sm font-semibold">{shot.description || '（无描述）'}</h3>
          <div className="mt-2 rounded-lg bg-zinc-50 p-3 text-sm leading-relaxed text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
            <div className="mb-1 text-xs font-medium text-zinc-400">画面内容</div>
            <p className="whitespace-pre-wrap">{shot.visualContent || '（待补充）'}</p>
          </div>
          {shot.dialogue && (
            <div className="mt-2 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800/60">
              <span className="text-xs font-medium text-zinc-400">台词 / 旁白：</span>
              <span className="text-zinc-600 dark:text-zinc-300">{shot.dialogue}</span>
            </div>
          )}
        </section>

        {/* 提示词 */}
        <section>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              提示词{latestPrompt ? `（v${latestPrompt.version}）` : ''}
            </h3>
            {latestPrompt && (
              <button
                className="btn-ghost text-xs"
                onClick={async () => {
                  const ok = await copyText(latestPrompt.content);
                  showToast(ok ? '已复制' : '复制失败');
                }}
              >
                📋 复制
              </button>
            )}
          </div>
          {latestPrompt ? (
            <pre className="mt-1.5 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-emerald-400">
              {latestPrompt.content}
            </pre>
          ) : (
            <p className="mt-1.5 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-zinc-800/60">
              还没生成提示词 —— M5 加入自动生成公式（角色卡 + 场景 + 风格 + 运镜 + 光线 + 接力句）
            </p>
          )}
          {prompts.length > 1 && (
            <p className="mt-1 text-[11px] text-zinc-400">
              共 {prompts.length} 个历史版本，版本管理在 M5 提示词页
            </p>
          )}
        </section>

        {/* 候选片段 */}
        <section>
          <h3 className="text-sm font-semibold">候选片段（{clips.length}/6）</h3>
          {clips.length === 0 ? (
            <p className="mt-1.5 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-zinc-800/60">
              还没有候选片段 —— M6 加入上传 1–6 个候选、对比选最优、自动打分
            </p>
          ) : (
            <div className="mt-1.5 space-y-1.5">
              {clips.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs dark:bg-zinc-800/60"
                >
                  {c.isBest && <span title="最优">⭐</span>}
                  <span className="font-mono">{c.fileName}</span>
                  <span className={`badge ${CLIP_STATUS_STYLE[c.status] ?? CLIP_STATUSES[0]}`}>{c.status}</span>
                  <span className="font-mono text-zinc-500">
                    {formatDuration(c.duration)} · {c.width}×{c.height} · {formatFileSize(c.fileSize)}
                  </span>
                  <span className="ml-auto font-mono">评分 {c.score}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* QC 报告 */}
        <section>
          <h3 className="text-sm font-semibold">QC 报告</h3>
          {latestReport ? (
            <div className="mt-1.5 rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-800/60">
              <div className="flex items-center gap-2">
                <span className="badge bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  片段报告
                </span>
                <span className="font-bold text-zinc-700 dark:text-zinc-200">
                  {latestReport.overall === 'pass' ? '✅ 通过' : '❌ 不通过'}
                </span>
                <span className="ml-auto text-zinc-400">
                  {new Date(latestReport.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>
              {latestReport.overall === 'fail' && (
                <ul className="mt-2 space-y-1 text-red-500">
                  {latestReport.checks
                    .filter((c) => c.result === 'fail')
                    .map((c) => (
                      <li key={c.id}>
                        第 {c.id} 项不过：{c.note || '（未填原因）'}
                      </li>
                    ))}
                </ul>
              )}
              <p className="mt-1.5 text-zinc-400">15 项完整报告在 QC 页查看（M7）</p>
            </div>
          ) : (
            <p className="mt-1.5 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-zinc-800/60">
              还没有 QC 记录 —— M7 加入 15 项质检清单
            </p>
          )}
        </section>
      </div>
    </Modal>
  );
}
