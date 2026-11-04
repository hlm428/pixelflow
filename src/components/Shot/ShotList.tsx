import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { Shot } from '../../types/shot';
import ShotCard from './ShotCard';

interface ShotListProps {
  shots: Shot[];
  selected: Set<string>;
  clipCounts: Map<string, number>;
  qcResults: Map<string, 'pass' | 'fail' | null>;
  onToggleSelect: (id: string) => void;
  onOpenDetail: (id: string) => void;
  onEdit: (shot: Shot) => void;
  onDelete: (shot: Shot) => void;
  onReorder: (fromIndex0: number, toIndex0: number) => void;
}

/** 分镜网格 + 拖拽排序（拖完自动重算编号和时间点） */
export default function ShotList({
  shots,
  selected,
  clipCounts,
  qcResults,
  onToggleSelect,
  onOpenDetail,
  onEdit,
  onDelete,
  onReorder,
}: ShotListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = shots.findIndex((s) => s.id === active.id);
    const to = shots.findIndex((s) => s.id === over.id);
    if (from === -1 || to === -1) return;
    // arrayMove 只是为了语义清晰，真正的重排在 store 里落库
    void arrayMove(shots, from, to);
    onReorder(from, to);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={shots.map((s) => s.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shots.map((s) => (
            <ShotCard
              key={s.id}
              shot={s}
              clipCount={clipCounts.get(s.id) ?? 0}
              qcResult={qcResults.get(s.id) ?? null}
              selected={selected.has(s.id)}
              onToggleSelect={() => onToggleSelect(s.id)}
              onOpenDetail={() => onOpenDetail(s.id)}
              onEdit={() => onEdit(s)}
              onDelete={() => onDelete(s)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
