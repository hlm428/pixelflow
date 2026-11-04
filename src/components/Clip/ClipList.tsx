import type { Clip } from '../../types/clip';
import ClipCard from './ClipCard';

interface ClipListProps {
  clips: Clip[];
  shotLabel: (shotId: string) => string;
}

/** 片段卡片网格 */
export default function ClipList({ clips, shotLabel }: ClipListProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {clips.map((c) => (
        <ClipCard key={c.id} clip={c} shotLabel={shotLabel(c.shotId)} />
      ))}
    </div>
  );
}
