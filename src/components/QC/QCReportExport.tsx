import { useToastStore } from '../../store/toastStore';
import { downloadFile } from '../../lib/utils';
import { reportToJSON, reportToMarkdown } from '../../lib/qc';
import type { QCReport } from '../../types/qc';
import type { Clip } from '../../types/clip';
import type { Shot } from '../../types/shot';

interface QCReportExportProps {
  report: QCReport;
  clip: Clip | null;
  shot?: Shot;
}

/** QC 报告导出按钮组（Markdown / JSON） */
export default function QCReportExport({ report, clip, shot }: QCReportExportProps) {
  const showToast = useToastStore((s) => s.show);

  return (
    <span className="flex gap-1.5">
      <button
        className="btn-outline px-2 py-1 text-xs"
        disabled={!clip}
        onClick={() => {
          if (!clip) return;
          downloadFile(`qc-${clip.fileName}-report.md`, reportToMarkdown(report, clip, shot), 'text/markdown');
          showToast('已导出 Markdown 报告');
        }}
      >
        ⬇ MD
      </button>
      <button
        className="btn-outline px-2 py-1 text-xs"
        onClick={() => {
          downloadFile(`qc-${report.id}.json`, reportToJSON(report));
          showToast('已导出 JSON 报告');
        }}
      >
        ⬇ JSON
      </button>
    </span>
  );
}
