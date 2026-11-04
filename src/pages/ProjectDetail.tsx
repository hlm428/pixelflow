import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { useSettingsStore } from '../store/settingsStore';
import { useToastStore } from '../store/toastStore';
import {
  shotsRepo,
  clipsRepo,
  qcReportsRepo,
  charactersRepo,
  promptsRepo,
  dubbingsRepo,
} from '../lib/db';
import { computeProjectStats, qcPassRate, shotProgress, type ProjectStats } from '../lib/stats';
import { exportProjectJson } from '../lib/export';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ProjectForm from '../components/Project/ProjectForm';

const EMPTY_STATS = computeProjectStats([], [], []);

function StatBox({ label, value, tone }: { label: string; value: number; tone?: 'emerald' | 'amber' | 'red' }) {
  const color =
    tone === 'emerald'
      ? 'text-emerald-500'
      : tone === 'amber'
        ? 'text-amber-500'
        : tone === 'red'
          ? 'text-red-500'
          : 'text-zinc-700 dark:text-zinc-200';
  return (
    <div className="rounded-lg bg-zinc-50 p-3 text-center dark:bg-zinc-800/60">
      <div className={`font-mono text-2xl font-bold ${color}`}>{value}</div>
      <div className="mt-0.5 text-xs text-zinc-500">{label}</div>
    </div>
  );
}

/** 项目详情页：大进度条 + 四个数字 + 基本信息（分镜区在 M3 加入） */
export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projects = useProjectStore((s) => s.projects);
  const duplicate = useProjectStore((s) => s.duplicate);
  const remove = useProjectStore((s) => s.remove);
  const updateSettings = useSettingsStore((s) => s.update);
  const showToast = useToastStore((s) => s.show);
  const navigate = useNavigate();

  const [stats, setStats] = useState<ProjectStats>(EMPTY_STATS);
  const [counts, setCounts] = useState({ characters: 0, prompts: 0, dubbings: 0 });
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const project = projects.find((p) => p.id === id) ?? null;

  // 进入详情页 = 把它设为当前项目（分镜、角色卡等页面默认操作它）
  useEffect(() => {
    if (id) updateSettings({ currentProjectId: id });
  }, [id, updateSettings]);

  useEffect(() => {
    if (!id) return;
    void Promise.all([
      shotsRepo.listByProject(id),
      clipsRepo.listByProject(id),
      qcReportsRepo.listByProject(id),
      charactersRepo.listByProject(id),
      promptsRepo.listByProject(id),
      dubbingsRepo.listByProject(id),
    ]).then(([shots, clips, reports, chars, prompts, dubbings]) => {
      setStats(computeProjectStats(shots, clips, reports));
      setCounts({ characters: chars.length, prompts: prompts.length, dubbings: dubbings.length });
    });
  }, [id, projects]);

  if (!id || !project) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <div className="text-4xl">🔍</div>
        <p className="mt-3 text-sm text-zinc-500">项目不存在或已被删除。</p>
        <Link to="/projects" className="btn-primary mt-4 inline-flex">
          返回项目列表
        </Link>
      </div>
    );
  }

  const progress = shotProgress(stats);

  const handleDuplicate = async () => {
    const copy = await duplicate(project.id);
    if (copy) showToast(`已复制为「${copy.name}」`);
  };

  const handleExport = async () => {
    await exportProjectJson(project);
    showToast('已导出 JSON 文件');
  };

  const handleDelete = async () => {
    const name = project.name;
    await remove(project.id);
    setDeleting(false);
    showToast(`已删除「${name}」`);
    navigate('/projects');
  };

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Link to="/projects" className="hover:text-indigo-500">
                项目
              </Link>
              <span>/</span>
              <span>{project.name}</span>
            </div>
            <h1 className="mt-1 truncate text-xl font-bold">{project.name}</h1>
            <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
              {project.oneLineStory || '还没有一句话故事'}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="badge bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                {project.style}
              </span>
              <span className="badge bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {project.aspectRatio}
              </span>
              <span className="badge bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                目标 {project.targetDuration}s
              </span>
              <span className="badge bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {project.status}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-outline" onClick={() => setFormOpen(true)}>
              编辑
            </button>
            <button className="btn-outline" onClick={() => void handleDuplicate()}>
              复制
            </button>
            <button className="btn-outline" onClick={() => void handleExport()}>
              导出 JSON
            </button>
            <button className="btn-danger" onClick={() => setDeleting(true)}>
              删除
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>成片进度（有通过片段的分镜 / 总分镜）</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="mt-1.5 h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className={`h-2.5 rounded-full transition-all ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBox label="总分镜" value={stats.totalShots} />
          <StatBox label="已通过" value={stats.passedShots} tone="emerald" />
          <StatBox label="待质检" value={stats.pendingQCShots} tone="amber" />
          <StatBox label="失败" value={stats.failedShots} tone="red" />
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-500">
          <span>
            QC 通过率 <b className="font-mono text-zinc-700 dark:text-zinc-200">{qcPassRate(stats)}%</b>
          </span>
          <span>
            片段 {stats.totalClips}（通过 {stats.passingClips}）
          </span>
          <span>角色卡 {counts.characters}</span>
          <span>提示词版本 {counts.prompts}</span>
          <span>配音 {counts.dubbings}</span>
        </div>
      </div>

      <div className="card p-5 text-center text-sm text-zinc-500">
        分镜时间轴与分镜列表在 M3（故事与分镜）加入 —— 到时这里会显示 10 秒一段的状态时间轴和可拖拽排序的分镜卡片。
      </div>

      <ProjectForm open={formOpen} initial={project} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={deleting}
        danger
        title="删除项目"
        message={`确定删除「${project.name}」？项目下的分镜、角色卡、片段、提示词、QC 记录会一起删除，无法恢复。`}
        confirmText="删除"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleting(false)}
      />
    </div>
  );
}
