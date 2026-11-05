import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { useSettingsStore } from '../store/settingsStore';
import { useToastStore } from '../store/toastStore';
import { useShotStore } from '../store/shotStore';
import { usePromptStore } from '../store/promptStore';
import { charactersRepo, clipsRepo, qcReportsRepo, promptsRepo, dubbingsRepo } from '../lib/db';
import { takeProjectSnapshot, restoreProjectSnapshot, type ProjectSnapshot } from '../lib/backup';
import { planShotCount, splitStoryToShots, SHOT_LENGTH_DEFAULT, SHOT_STATUS_STYLE } from '../lib/shot';
import { SHOT_STATUSES, type Shot, type ShotStatus } from '../types/shot';
import type { Clip } from '../types/clip';
import type { QCReport } from '../types/qc';
import ShotList from '../components/Shot/ShotList';
import ShotTimeline from '../components/Shot/ShotTimeline';
import ShotForm from '../components/Shot/ShotForm';
import ShotDetail from '../components/Shot/ShotDetail';
import ConfirmDialog from '../components/ui/ConfirmDialog';

/** 故事与分镜页：一句话拆分镜 + 时间轴 + 可拖拽分镜网格 + 批量操作 */
export default function Shots() {
  const currentProjectId = useSettingsStore((s) => s.currentProjectId);
  const projects = useProjectStore((s) => s.projects);
  const updateProject = useProjectStore((s) => s.update);
  const project = projects.find((p) => p.id === currentProjectId) ?? null;

  const shots = useShotStore((s) => s.shots);
  const loadShots = useShotStore((s) => s.load);
  const removeShot = useShotStore((s) => s.remove);
  const reorder = useShotStore((s) => s.reorder);
  const batchStatus = useShotStore((s) => s.batchStatus);
  const replaceAllWithDrafts = useShotStore((s) => s.replaceAllWithDrafts);
  const generateMany = usePromptStore((s) => s.generateMany);
  const showToast = useToastStore((s) => s.show);

  const [story, setStory] = useState('');
  const [clips, setClips] = useState<Clip[]>([]);
  const [reports, setReports] = useState<QCReport[]>([]);
  const [promptCount, setPromptCount] = useState(0);
  const [dubbingCount, setDubbingCount] = useState(0);
  const [backup, setBackup] = useState<ProjectSnapshot | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Shot | null>(null);
  const [confirmSplit, setConfirmSplit] = useState(false);
  const [batchStatusValue, setBatchStatusValue] = useState<ShotStatus>('待生成');

  useEffect(() => {
    if (!currentProjectId) return;
    void loadShots(currentProjectId);
    void Promise.all([
      clipsRepo.listByProject(currentProjectId),
      qcReportsRepo.listByProject(currentProjectId),
      promptsRepo.listByProject(currentProjectId),
      dubbingsRepo.listByProject(currentProjectId),
    ]).then(([c, r, p, d]) => {
      setClips(c);
      setReports(r);
      setPromptCount(p.length);
      setDubbingCount(d.length);
    });
  }, [currentProjectId, loadShots, shots]);

  useEffect(() => {
    setStory(project?.oneLineStory ?? '');
    // 仅在切换项目或故事文本变化时同步输入框
  }, [project?.id, project?.oneLineStory]);

  const clipCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of clips) m.set(c.shotId, (m.get(c.shotId) ?? 0) + 1);
    return m;
  }, [clips]);

  const qcResults = useMemo(() => {
    const m = new Map<string, 'pass' | 'fail'>();
    const sorted = [...reports].sort((a, b) => a.createdAt - b.createdAt);
    for (const r of sorted) m.set(r.shotId, r.overall);
    return m;
  }, [reports]);

  if (!currentProjectId || !project) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <div className="text-4xl">🎬</div>
        <p className="mt-3 text-sm text-zinc-500">先在顶部下拉选择一个项目，或者新建项目。</p>
        <Link to="/projects" className="btn-primary mt-4 inline-flex">
          去项目页
        </Link>
      </div>
    );
  }

  const detailShot = shots.find((s) => s.id === detailId) ?? null;
  const shotLen = project.shotLength ?? SHOT_LENGTH_DEFAULT;
  const planCount = planShotCount(project.targetDuration, shotLen);

  const doSplit = async () => {
    const text = story.trim();
    if (!text) {
      showToast('先写一句话故事');
      return;
    }
    try {
      const drafts = splitStoryToShots(text, project.targetDuration, shotLen);
      // 拆分前自动备份（可撤销）
      const backupSnap = shots.length > 0 ? await takeProjectSnapshot(project.id) : null;
      await replaceAllWithDrafts(project.id, drafts, shotLen);
      // 自动关联角色卡：分镜文本里出现角色名就挂上
      const cards = await charactersRepo.listByProject(project.id);
      const created = useShotStore.getState().shots;
      for (const s of created) {
        const textAll = `${s.description}${s.visualContent}`;
        const ids = cards.filter((c) => c.name && textAll.includes(c.name)).map((c) => c.id);
        if (ids.length > 0) await useShotStore.getState().update(s.id, { characterIds: ids });
      }
      // 自动生成 v1 提示词（角色卡原文 + 场景 + 风格 + 运镜 + 接力句）
      const linked = useShotStore.getState().shots;
      const okCount = await generateMany(linked.map((s) => s.id));
      if (project.oneLineStory !== text) {
        await updateProject(project.id, {
          oneLineStory: text,
          status: project.status === '构思中' ? '制作中' : project.status,
        });
      }
      setSelected(new Set());
      setConfirmSplit(false);
      setBackup(backupSnap);
      showToast(
        `已拆成 ${drafts.length} 个分镜，自动生成 ${okCount} 条提示词${backupSnap ? '（旧版本已备份，可撤销）' : ''}`,
      );
    } catch (err) {
      setConfirmSplit(false);
      showToast(`拆分失败：${err instanceof Error ? err.message : String(err)}——旧数据未动，请截图反馈`);
    }
  };

  const handleRestoreBackup = async () => {
    if (!backup) return;
    await restoreProjectSnapshot(backup);
    if (currentProjectId) await loadShots(currentProjectId);
    setBackup(null);
    showToast('已撤销，恢复到拆分前');
  };

  const handleShotLengthChange = (len: number) => {
    void updateProject(project.id, { shotLength: len });
    showToast(`单镜时长改为 ${len} 秒——对下一次「拆分镜」生效`);
  };

  const handleSplit = () => {
    if (shots.length > 0) setConfirmSplit(true);
    else void doSplit();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyBatch = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    await batchStatus(ids, batchStatusValue);
    showToast(`已把 ${ids.length} 个分镜改为「${batchStatusValue}」`);
    setSelected(new Set());
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await removeShot(deleting.id);
    showToast(`已删除分镜 #${deleting.index}，后续时间点已重算`);
    setDeleting(null);
  };

  return (
    <div className="space-y-5">
      {/* 拆分镜面板 */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">故事与分镜</h1>
          <span className="text-sm text-zinc-500">{project.name}</span>
          <span className="badge bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            目标 {project.targetDuration}s ≈ {planCount} 段 × {shotLen}s
          </span>
          <label className="ml-auto flex items-center gap-1.5 text-xs text-zinc-500">
            单镜时长
            <select
              className="input w-20"
              value={shotLen}
              onChange={(e) => handleShotLengthChange(Number(e.target.value))}
            >
              <option value={10}>10 秒</option>
              <option value={5}>5 秒</option>
            </select>
          </label>
          <div className="flex gap-2">
            <button
              className="btn-outline"
              onClick={() => {
                setEditingShot(null);
                setFormOpen(true);
              }}
            >
              ＋ 手动加分镜
            </button>
            <button className="btn-primary" onClick={handleSplit}>
              ✂️ 拆分镜
            </button>
          </div>
        </div>
        <textarea
          className="input mt-3 min-h-[64px]"
          value={story}
          onChange={(e) => setStory(e.target.value)}
          placeholder="一句话故事：例：雨天校门口，短发女生把伞分一半给长发女生；便利店买橘子汽水；河边日落碰杯；一张纸条写着明天见。"
        />
        <p className="mt-1.5 text-xs text-zinc-400">
          按<strong>情节语义</strong>拆分（句号 → 逗号 → 长度三级切分），每段分镜自动带画面描述、运镜和<strong>完整提示词</strong>，出现角色名自动关联角色卡。已有分镜时会先备份再覆盖，可撤销。
        </p>
      </div>

      {/* 拆分前备份横幅（可撤销） */}
      {backup && backup.shots.length > 0 && (
        <div className="card flex flex-wrap items-center gap-2 border-amber-500/40 bg-amber-500/5 p-3 dark:bg-amber-500/10">
          <span className="text-sm text-amber-700 dark:text-amber-400">
            上一版已自动备份：{backup.shots.length} 分镜 · {backup.prompts.length} 提示词 ·{' '}
            {backup.clips.length} 片段 · {backup.dubbings.length} 配音
          </span>
          <button className="btn-outline ml-auto text-xs" onClick={() => void handleRestoreBackup()}>
            ↩️ 撤销本次拆分
          </button>
          <button className="btn-ghost text-xs" onClick={() => setBackup(null)}>
            放弃备份
          </button>
        </div>
      )}

      {/* 时间轴 */}
      <div className="card p-4">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">时间轴</h2>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {SHOT_STATUSES.map((s) => (
              <span key={s} className={`badge ${SHOT_STATUS_STYLE[s]}`}>
                {s}
              </span>
            ))}
          </div>
        </div>
        <ShotTimeline shots={shots} onSelect={(id) => setDetailId(id)} shotLength={shotLen} />
      </div>

      {/* 批量操作条 */}
      {selected.size > 0 && (
        <div className="card flex flex-wrap items-center gap-2 p-3">
          <span className="text-sm font-medium">已选 {selected.size} 个</span>
          <button
            className="btn-ghost text-xs"
            onClick={() => setSelected(new Set(shots.map((s) => s.id)))}
          >
            全选
          </button>
          <button className="btn-ghost text-xs" onClick={() => setSelected(new Set())}>
            清空选择
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-zinc-500">批量改状态为</span>
            <select
              className="input w-28"
              value={batchStatusValue}
              onChange={(e) => setBatchStatusValue(e.target.value as ShotStatus)}
            >
              {SHOT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button className="btn-primary" onClick={() => void applyBatch()}>
              应用
            </button>
          </div>
        </div>
      )}

      {/* 分镜网格 */}
      {shots.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl">📋</div>
          <p className="mt-3 text-sm text-zinc-500">
            还没有分镜。在上面写一句话故事，点「✂️ 拆分镜」，或手动加分镜。
          </p>
        </div>
      ) : (
        <ShotList
          shots={shots}
          selected={selected}
          clipCounts={clipCounts}
          qcResults={qcResults}
          onToggleSelect={toggleSelect}
          onOpenDetail={(id) => setDetailId(id)}
          onEdit={(s) => {
            setEditingShot(s);
            setFormOpen(true);
          }}
          onDelete={(s) => setDeleting(s)}
          onReorder={(from, to) => void reorder(from, to)}
        />
      )}

      {/* 弹窗 */}
      <ShotForm
        open={formOpen}
        projectId={project.id}
        shot={editingShot}
        onClose={() => setFormOpen(false)}
      />
      <ShotDetail shot={detailShot} onClose={() => setDetailId(null)} />
      <ConfirmDialog
        open={deleting !== null}
        danger
        title="删除分镜"
        message={`确定删除分镜 #${deleting?.index ?? ''}？它下面的候选片段、提示词、QC 记录、配音会一起删除；后面的分镜时间点会自动前移 10 秒。`}
        confirmText="删除"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleting(null)}
      />
      <ConfirmDialog
        open={confirmSplit}
        danger
        title="重新拆分镜"
        message={`当前已有 ${shots.length} 个分镜、${promptCount} 条提示词、${clips.length} 个片段、${dubbingCount} 条配音。重新拆分会覆盖这些内容——拆分前会自动备份（拆完可一键撤销），确定？`}
        confirmText="备份并覆盖重拆"
        onConfirm={() => void doSplit()}
        onCancel={() => setConfirmSplit(false)}
      />
    </div>
  );
}
