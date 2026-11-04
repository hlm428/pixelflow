import { dailyClipCounts, todayClipCount } from '../../lib/dashboard';
import type { Clip } from '../../types/clip';

interface QuotaChartProps {
  clips: Clip[];
  dailyQuota: number;
}

/** 每日生成量柱状图（30 天）+ 今日配额提醒（80% 黄 / 100% 红） */
export default function QuotaChart({ clips, dailyQuota }: QuotaChartProps) {
  const daily = dailyClipCounts(clips, 30);
  const maxDaily = Math.max(1, ...daily.map((d) => d.count));
  const todayUsed = todayClipCount(clips);
  const quotaRatio = dailyQuota > 0 ? todayUsed / dailyQuota : 0;
  const quotaTone = quotaRatio >= 1 ? 'text-red-500' : quotaRatio >= 0.8 ? 'text-amber-500' : 'text-emerald-500';

  return (
    <div className="card p-4">
      <h2 className="text-sm font-semibold">每日生成量（近 30 天）</h2>
      <div className="mt-3 flex h-32 items-end gap-[3px]">
        {daily.map((d) => (
          <div
            key={d.date}
            className="flex-1 rounded-t bg-indigo-500/80 hover:bg-indigo-400"
            style={{ height: `${(d.count / maxDaily) * 100}%`, minHeight: d.count > 0 ? '4px' : '1px' }}
            title={`${d.date}：${d.count} 条`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-zinc-400">
        <span>{daily[0]?.date.slice(5)}</span>
        <span>峰值 {maxDaily} 条/天</span>
        <span>今天</span>
      </div>

      <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <div className="flex items-center justify-between text-sm">
          <span>今日配额</span>
          <span className={`font-mono font-bold ${quotaTone}`}>
            {todayUsed} / {dailyQuota}
          </span>
        </div>
        <div className="mt-1.5 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className={`h-2 rounded-full ${quotaRatio >= 1 ? 'bg-red-500' : quotaRatio >= 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, quotaRatio * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-zinc-400">
          {quotaRatio >= 1
            ? '⚠ 配额用完，明天再抽卡'
            : quotaRatio >= 0.8
              ? '⚠ 已用 80%+，控制一下节奏'
              : `还剩 ${Math.max(0, dailyQuota - todayUsed)} 条额度`}
        </p>
      </div>
    </div>
  );
}
