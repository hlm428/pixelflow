import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Shot } from '../../types/shot';
import { SHOT_STATUS_STYLE } from '../../lib/shot';

interface ShotCardProps {
  shot: Shot;
  clipCount: number;
  qcResult: 'pass' | 'fail' | null;
  selected: boolean;
  onToggleSelect: () => void;
  onOpenDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** 可拖拽排序的分镜卡片：编号大字、时间点、描述、状态徽章、片段数、QC 结果 */
export default function ShotCard({
  shot,
  clipCount,
  qcResult,
  selected,
  onToggleSelect,
  onOpenDetail,
  onEdit,
  onDelete,
}: ShotCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: shot.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.35)' : undefined,
      }}
      className={`card relative cursor-pointer p-3.5 transition-shadow ${selected ? 'ring-2 ring-indigo-500' : ''}`}
      onClick={onOpenDetail}
    >
      {/* 多选框 */}
      <label
        className="absolute right-2.5 top-2.5 z-10 flex h-6 w-6 cursor-pointer items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="h-4 w-4 cursor-pointer accent-indigo-600"
        />
      </label>

      <div className="flex items-start gap-2.5 pr-8">
        {/* 拖拽把手 */}
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab touch-none text-zinc-400 hover:text-indigo-500 active:cursor-grabbing"
          title="拖拽调整顺序"
          onClick={(e) => e.stopPropagation()}
        >
          ⠿
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold leading-none text-indigo-500">
              #{String(shot.index).padStart(2, '0')}
            </span>
            <span className="font-mono text-xs text-zinc-500">{shot.startTime}s</span>
          </div>
          <p className="mt-1.5 line-clamp-2 min-h-[2rem] text-sm leading-4 text-zinc-700 dark:text-zinc-300">
            {shot.description || '（无描述）'}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
        <span className={`badge ${SHOT_STATUS_STYLE[shot.status]}`}>{shot.status}</span>
        <span className="text-[11px] text-zinc-400">片段 {clipCount}</span>
        {qcResult === 'pass' && <span className="text-[11px] text-emerald-500">QC ✓</span>}
        {qcResult === 'fail' && <span className="text-[11px] text-red-500">QC ✗</span>}
        {qcResult === null && <span className="text-[11px] text-zinc-400">QC —</span>}
        <span className="ml-auto flex gap-1">
          <button
            className="btn-ghost px-1.5 py-1 text-xs"
            title="编辑"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            ✏️
          </button>
          <button
            className="btn-ghost px-1.5 py-1 text-xs text-red-500 hover:bg-red-500/10 dark:text-red-400"
            title="删除"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            🗑️
          </button>
        </span>
      </div>
    </div>
  );
}
