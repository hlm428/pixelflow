import { QC_CHECKLIST } from '../../lib/qc';
import { formatDate } from '../../lib/utils';
import QCReportExport from './QCReportExport';
import type { QCReport } from '../../types/qc';
import type { Clip } from '../../types/clip';
import type { Shot } from '../../types/shot';

interface QCReportProps {
  report: QCReport;
  clip: Clip | null;
  shot?: Shot;
  compact?: boolean;
}

/** QC 报告展示卡：15 项结果 + 不通过项 + 导出 */
export default function QCReport({ report, clip, shot, compact }: QCReportProps) {
  const failItems = report.checks.filter((c) => c.result === 'fail');

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`badge ${report.overall === 'pass' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'}`}>
          {report.overall === 'pass' ? '✅ 总体通过' : '❌ 总体不通过'}
        </span>
        <span className="font-mono text-xs text-zinc-500">{clip?.fileName ?? report.clipId}</span>
        {shot && <span className="text-xs text-zinc-500">分镜 #{shot.index}</span>}
        <span className="ml-auto font-mono text-[11px] text-zinc-400">{formatDate(report.createdAt)}</span>
        {!compact && <QCReportExport report={report} clip={clip} shot={shot} />}
      </div>

      <div className={`mt-2 grid gap-x-4 gap-y-0.5 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
        {report.checks.map((c) => {
          const item = QC_CHECKLIST[c.id - 1];
          return (
            <div key={c.id} className="flex items-center gap-1.5 text-[11px]">
              <span>{c.result === 'pass' ? '✅' : c.result === 'fail' ? '❌' : '⏭️'}</span>
              <span className={c.result === 'fail' ? 'text-red-500' : 'text-zinc-500'}>
                {c.id}. {item?.name ?? ''}
              </span>
              {c.result === 'fail' && c.note && (
                <span className="truncate text-red-400">（{c.note}）</span>
              )}
            </div>
          );
        })}
      </div>

      {failItems.length > 0 && (
        <div className="mt-2 rounded-lg bg-red-500/10 p-2.5 text-xs text-red-500">
          <b>不通过项：</b>
          <ul className="mt-1 list-inside list-disc">
            {failItems.map((c) => (
              <li key={c.id}>
                第 {c.id} 项「{QC_CHECKLIST[c.id - 1]?.name ?? ''}」：{c.note || '（未填原因）'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
