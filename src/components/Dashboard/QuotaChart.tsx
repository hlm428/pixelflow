import { dailyClipCounts, todayClipCount } from '../../lib/dashboard';
import type { Clip } from '../../types/clip';

interface QuotaChartProps {
  clips: Clip[];
  dailyQuota: number;
}

const W = 600;
const H = 128;
const PAD_X = 6;
const PAD_Y = 16;

/** 每日生成量折线图（近 30 天）+ 今日配额提醒（80% 黄 / 100% 红） */
export default function QuotaChart({ clips, dailyQuota }: QuotaChartProps) {
  const daily = dailyClipCounts(clips, 30);
  const maxDaily = Math.max(1, ...daily.map((d) => d.count));
  const todayUsed = todayClipCount(clips);
  const quotaRatio = dailyQuota > 0 ? todayUsed / dailyQuota : 0;
  const quotaTone = quotaRatio >= 1 ? 'text-red-500' : quotaRatio >= 0.8 ? 'text-amber-500' : 'text-emerald-500';

  const step = daily.length > 1 ? (W - PAD_X * 2) / (daily.length - 1) : 0;
  const points = daily.map((d, i) => ({
    x: PAD_X + i * step,
    y: H - PAD_Y - (d.count / maxDaily) * (H - PAD_Y * 2),
    d,
  }));
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const baseline = H - PAD_Y;
  const areaPath = `${linePath} L${points[points.length - 1]?.x.toFixed(1) ?? PAD_X},${baseline} L${points[0]?.x.toFixed(1) ?? PAD_X},${baseline} Z`;

  return (
    <div className="card p-4">
      <h2 className="text-sm font-semibold">每日生成量（近 30 天）</h2>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-32 w-full" role="img" aria-label="近 30 天每日生成量折线图">
        <defs>
          <linearGradient id="quota-line-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(99 102 241)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="rgb(99 102 241)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* 水平参考线 */}
        {[0.25, 0.5, 0.75].map((r) => (
          <line
            key={r}
            x1={PAD_X}
            x2={W - PAD_X}
            y1={baseline - r * (baseline - PAD_Y)}
            y2={baseline - r * (baseline - PAD_Y)}
            className="stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
        ))}
        <path d={areaPath} fill="url(#quota-line-fill)" />
        <path d={linePath} fill="none" stroke="rgb(99 102 241)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p) => (
          <circle
            key={p.d.date}
            cx={p.x}
            cy={p.y}
            r={p.d.count > 0 ? 3 : 1.5}
            className={p.d.count > 0 ? 'fill-indigo-500' : 'fill-zinc-300 dark:fill-zinc-700'}
          >
            <title>{`${p.d.date}：${p.d.count} 条${p.d.cost > 0 ? ` / ¥${p.d.cost}` : ''}`}</title>
          </circle>
        ))}
      </svg>
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
