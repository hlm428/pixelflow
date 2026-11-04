import type { Clip } from '../../types/clip';
import ClipCard from './ClipCard';

interface ClipCompareProps {
  /** 同一个分镜的候选（按评分降序） */
  clips: Clip[];
  shotLabel: string;
}

/** 候选对比：并排宽卡，比时长 / 分辨率 / 评分，点选最优 */
export default function ClipCompare({ clips, shotLabel }: ClipCompareProps) {
  if (clips.length === 0) {
    return (
      <p className="card p-6 text-center text-sm text-zinc-500">该分镜还没有候选片段</p>
    );
  }
  const sorted = [...clips].sort((a, b) => b.score - a.score);
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
        <span>{shotLabel} 候选对比（按评分排序）</span>
        <span>
          最好 {sorted[0].score} 分 · 最差 {sorted[sorted.length - 1].score} 分
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {sorted.map((c) => (
          <ClipCard key={c.id} clip={c} shotLabel={shotLabel} wide />
        ))}
      </div>
    </div>
  );
}
