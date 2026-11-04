import { useState } from 'react';
import { QC_CHECKLIST, computeOverall } from '../../lib/qc';
import type { QCCheckItem, CheckResult } from '../../types/qc';
import type { Clip } from '../../types/clip';
import type { Shot } from '../../types/shot';
import type { QCStrictness } from '../../store/settingsStore';
import { formatDuration, formatFileSize } from '../../lib/utils';

interface QCChecklistProps {
  clip: Clip;
  shot: Shot | null;
  strictness: QCStrictness;
  onSubmit: (checks: QCCheckItem[]) => Promise<void>;
}

const EMPTY_RESULTS: Record<number, { result: CheckResult | null; note: string }> = Object.fromEntries(
  QC_CHECKLIST.map((c) => [c.id, { result: null, note: '' }]),
);

/** 15 项检查清单：每项通过 / 不通过 / 跳过，不通过要填原因，全部打完才能提交 */
export default function QCChecklist({ clip, shot, strictness, onSubmit }: QCChecklistProps) {
  const [results, setResults] = useState(() => ({ ...EMPTY_RESULTS }));
  const [submitting, setSubmitting] = useState(false);

  const items: QCCheckItem[] = QC_CHECKLIST.map((c) => ({
    id: c.id,
    result: results[c.id]?.result ?? null,
    note: results[c.id]?.note ?? '',
  }));
  const allDone = items.every((i) => i.result !== null);
  const overall = computeOverall(items, strictness);

  const setResult = (id: number, result: CheckResult) => {
    setResults((prev) => ({
      ...prev,
      [id]: { result, note: result === 'pass' || result === 'skip' ? '' : prev[id]?.note ?? '' },
    }));
  };

  const setNote = (id: number, note: string) => {
    setResults((prev) => ({ ...prev, [id]: { ...prev[id], note } }));
  };

  const handleSubmit = async () => {
    if (!allDone) return;
    setSubmitting(true);
    try {
      await onSubmit(items);
      setResults({ ...EMPTY_RESULTS });
    } finally {
      setSubmitting(false);
    }
  };

  const failWithoutNote = items.some((i) => i.result === 'fail' && !i.note.trim());

  return (
    <div>
      {/* 左：片段信息 */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-bold">{clip.fileName}</span>
          <span className="badge bg-violet-500/15 text-violet-500">待质检</span>
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] text-zinc-500 sm:grid-cols-3">
          <span>时长 {formatDuration(clip.duration)}</span>
          <span>
            分辨率 {clip.width}×{clip.height}
          </span>
          <span>{clip.fps}fps</span>
          <span>{formatFileSize(clip.fileSize)}</span>
          <span>模型 {clip.model}</span>
          <span>提示词 v{clip.promptVersion}</span>
          <span>{shot ? `分镜 #${shot.index} · ${shot.startTime}s` : '分镜已删'}</span>
        </div>
      </div>

      {/* 右：15 项清单 */}
      <div className="mt-3 space-y-2">
        {QC_CHECKLIST.map((item) => {
          const r = results[item.id];
          return (
            <div key={item.id} className="card p-3">
              <div className="flex flex-wrap items-start gap-2">
                <span className="font-mono text-sm font-bold text-zinc-400">
                  {String(item.id).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{item.name}</span>
                    {item.required && (
                      <span className="badge bg-indigo-500/10 text-[10px] text-indigo-500">关键项</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {item.detail}（例：{item.example}）
                  </p>
                  {r?.result === 'fail' && (
                    <input
                      className="input mt-1.5 text-xs"
                      placeholder="不通过原因（必填）"
                      value={r.note}
                      onChange={(e) => setNote(item.id, e.target.value)}
                    />
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  {(
                    [
                      ['pass', '✓ 通过', 'bg-emerald-500 text-white'],
                      ['fail', '✗ 不过', 'bg-red-500 text-white'],
                      ['skip', '− 跳过', 'bg-zinc-500 text-white'],
                    ] as Array<[CheckResult, string, string]>
                  ).map(([value, label, activeClass]) => (
                    <button
                      key={value}
                      className={`rounded-lg px-2 py-1 text-xs transition-colors ${
                        r?.result === value
                          ? activeClass
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                      }`}
                      onClick={() => setResult(item.id, value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card sticky bottom-4 mt-3 flex flex-wrap items-center gap-3 p-3">
        <span className="text-sm">
          已打 {items.filter((i) => i.result !== null).length}/15
        </span>
        {allDone && (
          <span
            className={`badge ${
              overall === 'pass'
                ? 'bg-emerald-500/15 text-emerald-500'
                : 'bg-red-500/15 text-red-500'
            }`}
          >
            预计总体：{overall === 'pass' ? '通过' : '不通过'}（{strictness}）
          </span>
        )}
        <button
          className="btn-primary ml-auto"
          onClick={() => void handleSubmit()}
          disabled={!allDone || submitting || failWithoutNote}
        >
          提交 QC 报告
        </button>
      </div>
      {!allDone && <p className="mt-1 text-right text-[11px] text-zinc-400">15 项全部打完才能提交</p>}
      {failWithoutNote && (
        <p className="mt-1 text-right text-[11px] text-red-400">有「不通过」项还没填原因</p>
      )}
    </div>
  );
}
