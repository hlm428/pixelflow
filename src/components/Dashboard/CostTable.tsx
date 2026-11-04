import { computeModelCosts } from '../../lib/dashboard';
import type { Clip } from '../../types/clip';

/** 成本统计表：每个模型的次数、估算单价、小计 */
export default function CostTable({ clips }: { clips: Clip[] }) {
  const costs = computeModelCosts(clips);
  const totalCost = Math.round(costs.reduce((s, r) => s + r.subtotal, 0) * 100) / 100;

  return (
    <div className="card p-4">
      <h2 className="text-sm font-semibold">
        成本统计（估算）<span className="ml-2 font-mono text-xs text-zinc-400">合计 ≈ {totalCost} 元</span>
      </h2>
      {costs.length === 0 ? (
        <p className="mt-6 text-center text-sm text-zinc-500">还没有片段记录</p>
      ) : (
        <table className="mt-2.5 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800">
              <th className="py-1.5 font-medium">模型</th>
              <th className="py-1.5 font-medium">次数</th>
              <th className="py-1.5 font-medium">元/条（估）</th>
              <th className="py-1.5 font-medium">小计</th>
            </tr>
          </thead>
          <tbody>
            {costs.map((r) => (
              <tr key={r.model} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                <td className="py-1.5">{r.model}</td>
                <td className="py-1.5 font-mono">{r.count}</td>
                <td className="py-1.5 font-mono text-zinc-500">{r.costPerClip}</td>
                <td className="py-1.5 font-mono">≈ {r.subtotal} 元</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-2 text-[10px] text-zinc-400">
        单价为参考估算（10 秒片段），实际以平台计费为准；token 用量各平台不同，按条折算更直观。
      </p>
    </div>
  );
}
