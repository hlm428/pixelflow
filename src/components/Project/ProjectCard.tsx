import { Link } from 'react-router-dom';
import type { Project } from '../../types/project';
import { qcPassRate, shotProgress, type ProjectStats } from '../../lib/stats';
import { formatRelative } from '../../lib/utils';

const COVER_COLORS = [
  'from-indigo-500 to-purple-500',
  'from-rose-500 to-orange-400',
  'from-emerald-500 to-teal-400',
  'from-sky-500 to-indigo-400',
  'from-amber-500 to-pink-500',
  'from-violet-500 to-cyan-400',
];

/** 用项目 id 稳定取一个封面渐变色 */
function coverColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COVER_COLORS[h % COVER_COLORS.length];
}

interface ProjectCardProps {
  project: Project;
  stats: ProjectStats;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export default function ProjectCard({ project, stats, onDuplicate, onExport, onDelete }: ProjectCardProps) {
  const progress = shotProgress(stats);
  return (
    <div className="card flex flex-col overflow-hidden">
      <Link to={`/projects/${project.id}`} className="block shrink-0">
        <div className={`flex h-16 items-end bg-gradient-to-br p-3 ${coverColor(project.id)}`}>
          <span className="truncate text-sm font-semibold text-white/95">
            {project.theme || project.style}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/projects/${project.id}`}
            className="truncate text-sm font-semibold hover:text-indigo-500"
          >
            {project.name}
          </Link>
          <span className="badge shrink-0 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {project.status}
          </span>
        </div>
        <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
          {project.oneLineStory || '还没有一句话故事'}
        </p>

        <div className="mt-3">
          <div className="flex justify-between text-[11px] text-zinc-500">
            <span>进度 {progress}%</span>
            <span>QC 通过率 {qcPassRate(stats)}%</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className={`h-1.5 rounded-full transition-all ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-2 flex gap-3 text-[11px] text-zinc-400">
          <span>{project.aspectRatio}</span>
          <span>{project.style}</span>
          <span className="ml-auto font-mono">{formatRelative(project.updatedAt)}</span>
        </div>

        <div className="mt-3 flex gap-1.5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <button className="btn-ghost flex-1 text-xs" onClick={onDuplicate}>
            复制
          </button>
          <button className="btn-ghost flex-1 text-xs" onClick={onExport}>
            导出
          </button>
          <button
            className="btn-ghost flex-1 text-xs text-red-500 hover:bg-red-500/10 dark:text-red-400"
            onClick={onDelete}
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}
