import { SHOT_STATUS_BG } from '../../lib/shot';
import type { Shot } from '../../types/shot';

interface ShotTimelineProps {
  shots: Shot[];
  onSelect: (id: string) => void;
}

/** 横向时间轴：每个 10 秒一段，颜色 = 状态，点击选中对应分镜 */
export default function ShotTimeline({ shots, onSelect }: ShotTimelineProps) {
  if (shots.length === 0) {
    return (
      <div className="rounded-lg bg-zinc-50 px-4 py-3 text-center text-xs text-zinc-500 dark:bg-zinc-800/60">
        还没有分镜 —— 写一句话故事，点「拆分镜」自动生成
      </div>
    );
  }
  const total = shots.length * 10;
  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {shots.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            title={`#${s.index} ${s.startTime}s · ${s.status} · ${s.description}`}
            className={`flex h-10 min-w-[56px] flex-1 flex-col items-center justify-center rounded-md text-white transition-transform hover:scale-105 ${SHOT_STATUS_BG[s.status]}`}
          >
            <span className="font-mono text-[10px] opacity-90">{s.startTime}s</span>
            <span className="font-mono text-xs font-bold">#{s.index}</span>
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-zinc-400">
        <span>0s</span>
        <span>{total}s · 共 {shots.length} 段 × 10s</span>
      </div>
    </div>
  );
}
