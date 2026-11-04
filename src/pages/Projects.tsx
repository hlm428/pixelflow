import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { useToastStore } from '../store/toastStore';
import { shotsRepo, clipsRepo, qcReportsRepo } from '../lib/db';
import { computeProjectStats, type ProjectStats } from '../lib/stats';
import { exportProjectJson, importProjectJson } from '../lib/export';
import ProjectList from '../components/Project/ProjectList';
import ProjectForm from '../components/Project/ProjectForm';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import {
  PROJECT_STATUSES,
  PROJECT_STYLES,
  type Project,
  type ProjectStatus,
  type ProjectStyle,
} from '../types/project';
import type { Shot } from '../types/shot';
import type { Clip } from '../types/clip';
import type { QCReport } from '../types/qc';

/** 项目列表页：卡片网格 + 搜索筛选 + 导入导出 */
export default function Projects() {
  const projects = useProjectStore((s) => s.projects);
  const loaded = useProjectStore((s) => s.loaded);
  const duplicate = useProjectStore((s) => s.duplicate);
  const remove = useProjectStore((s) => s.remove);
  const showToast = useToastStore((s) => s.show);
  const [searchParams] = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);

  const [bundles, setBundles] = useState<{ shots: Shot[]; clips: Clip[]; reports: QCReport[] } | null>(
    null,
  );
  useEffect(() => {
    void Promise.all([shotsRepo.list(), clipsRepo.list(), qcReportsRepo.list()]).then(
      ([shots, clips, reports]) => setBundles({ shots, clips, reports }),
    );
  }, [loaded]);

  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [statusFilter, setStatusFilter] = useState<'全部' | ProjectStatus>('全部');
  const [styleFilter, setStyleFilter] = useState<'全部' | ProjectStyle>('全部');
  const [sortBy, setSortBy] = useState<'createdAtDesc' | 'createdAtAsc' | 'updatedAtDesc'>(
    'createdAtDesc',
  );

  const statsMap = useMemo(() => {
    const map = new Map<string, ProjectStats>();
    if (!bundles) return map;
    for (const p of projects) {
      map.set(
        p.id,
        computeProjectStats(
          bundles.shots.filter((s) => s.projectId === p.id),
          bundles.clips.filter((c) => c.projectId === p.id),
          bundles.reports.filter((r) => r.projectId === p.id),
        ),
      );
    }
    return map;
  }, [projects, bundles]);

  const visible = useMemo(() => {
    let list = [...projects];
    const kw = q.trim().toLowerCase();
    if (kw) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(kw) ||
          p.theme.toLowerCase().includes(kw) ||
          p.oneLineStory.toLowerCase().includes(kw),
      );
    }
    if (statusFilter !== '全部') list = list.filter((p) => p.status === statusFilter);
    if (styleFilter !== '全部') list = list.filter((p) => p.style === styleFilter);
    if (sortBy === 'createdAtDesc') list.sort((a, b) => b.createdAt - a.createdAt);
    if (sortBy === 'createdAtAsc') list.sort((a, b) => a.createdAt - b.createdAt);
    if (sortBy === 'updatedAtDesc') list.sort((a, b) => b.updatedAt - a.updatedAt);
    return list;
  }, [projects, q, statusFilter, styleFilter, sortBy]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const handleDuplicate = async (project: Project) => {
    const copy = await duplicate(project.id);
    if (copy) showToast(`已复制为「${copy.name}」`);
  };

  const handleExport = async (project: Project) => {
    await exportProjectJson(project);
    showToast('已导出 JSON 文件');
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const name = deleting.name;
    await remove(deleting.id);
    setDeleting(null);
    showToast(`已删除「${name}」`);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const result = await importProjectJson(text);
    if (result === 'ok') {
      await useProjectStore.getState().load();
      showToast('导入成功');
    } else {
      showToast('导入失败：不是有效的 PixelFlow 项目文件');
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold">项目</h1>
        <span className="text-sm text-zinc-500">
          {visible.length} / {projects.length}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            className="input w-40"
            placeholder="搜索名字 / 主题…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="input w-28"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as '全部' | ProjectStatus)}
          >
            <option value="全部">全部状态</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="input w-28"
            value={styleFilter}
            onChange={(e) => setStyleFilter(e.target.value as '全部' | ProjectStyle)}
          >
            <option value="全部">全部风格</option>
            {PROJECT_STYLES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="input w-36"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="createdAtDesc">创建时间 新→旧</option>
            <option value="createdAtAsc">创建时间 旧→新</option>
            <option value="updatedAtDesc">最近更新</option>
          </select>
          <label className="btn-outline cursor-pointer">
            导入
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImport(f);
                e.target.value = '';
              }}
            />
          </label>
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            ＋ 新建项目
          </button>
        </div>
      </div>

      {!loaded ? (
        <div className="card p-10 text-center text-sm text-zinc-500">加载中…</div>
      ) : visible.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl">🎬</div>
          <p className="mt-3 text-sm text-zinc-500">
            {projects.length === 0
              ? '还没有项目。点「新建项目」开始你的第一部 AI 视频。'
              : '没有符合筛选条件的项目。'}
          </p>
        </div>
      ) : (
        <ProjectList
          projects={visible}
          statsMap={statsMap}
          onDuplicate={(p) => void handleDuplicate(p)}
          onExport={(p) => void handleExport(p)}
          onDelete={(p) => setDeleting(p)}
        />
      )}

      <ProjectForm open={formOpen} initial={editing} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={deleting !== null}
        danger
        title="删除项目"
        message={`确定删除「${deleting?.name ?? ''}」？项目下的分镜、角色卡、片段、提示词、QC 记录会一起删除，无法恢复。`}
        confirmText="删除"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
