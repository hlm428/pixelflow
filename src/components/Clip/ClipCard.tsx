import { useState } from 'react';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useClipStore } from '../../store/clipStore';
import { useToastStore } from '../../store/toastStore';
import { CLIP_STATUS_STYLE, canRetry } from '../../lib/clip';
import { CLIP_STATUSES, FAIL_REASONS, type Clip, type ClipStatus, type FailReason } from '../../types/clip';
import { formatDuration, formatFileSize } from '../../lib/utils';

interface ClipCardProps {
  clip: Clip;
  shotLabel: string;
  /** 对比模式：宽卡并排 */
  wide?: boolean;
}

/** 片段卡：信息 + 状态推进 + 失败原因 + 重试 + 选最优 + 改分 */
export default function ClipCard({ clip, shotLabel, wide }: ClipCardProps) {
  const update = useClipStore((s) => s.update);
  const fail = useClipStore((s) => s.fail);
  const retry = useClipStore((s) => s.retry);
  const markBest = useClipStore((s) => s.markBest);
  const remove = useClipStore((s) => s.remove);
  const showToast = useToastStore((s) => s.show);

  const [failOpen, setFailOpen] = useState(false);
  const [failReason, setFailReason] = useState<FailReason>('黑帧');
  const [failNote, setFailNote] = useState('');
  const [editScore, setEditScore] = useState(false);
  const [scoreDraft, setScoreDraft] = useState(String(clip.score));
  const [deleting, setDeleting] = useState(false);

  const handleFail = async () => {
    await fail(clip.id, failReason, failNote.trim());
    setFailOpen(false);
    setFailNote('');
    showToast(`已记失败：${failReason}`);
  };

  const handleRetry = async () => {
    await retry(clip.id);
    showToast(`第 ${clip.retryCount + 1} 次重试，状态改为「生成中」`);
  };

  const handleBest = async () => {
    await markBest(clip.id);
    showToast('已标记为该分镜的最优候选 ⭐');
  };

  const handleScoreSave = async () => {
    const v = Number(scoreDraft);
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      showToast('分数必须是 0–100');
      return;
    }
    await update(clip.id, { score: Math.round(v) });
    setEditScore(false);
    showToast('已改分');
  };

  return (
    <div
      className={`card p-3.5 ${clip.isBest ? 'ring-2 ring-emerald-500' : ''} ${wide ? 'flex w-72 shrink-0 flex-col' : ''}`}
    >
      <div className="flex items-start gap-2">
        {/* 缩略图占位（文件本体不入库） */}
        <div className="flex h-14 w-24 shrink-0 flex-col items-center justify-center rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-800 text-zinc-400">
          <span className="text-lg">🎬</span>
          <span className="font-mono text-[10px]">{formatDuration(clip.duration)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {clip.isBest && <span title="最优候选">⭐</span>}
            <span className="truncate font-mono text-xs font-medium">{clip.fileName}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
            <span className={`badge ${CLIP_STATUS_STYLE[clip.status]}`}>{clip.status}</span>
            <span className="font-mono">
              {clip.width}×{clip.height} · {clip.fps}fps
            </span>
            <span className="font-mono">{formatFileSize(clip.fileSize)}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-zinc-400">
            <span>{shotLabel}</span>
            <span>模型 {clip.model}</span>
            <span>提示词 v{clip.promptVersion}</span>
            {clip.retryCount > 0 && <span className="text-amber-500">已重试 {clip.retryCount} 次</span>}
          </div>
        </div>
      </div>

      {clip.failReason && (
        <p className="mt-2 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-500">
          失败原因：{clip.failReason}
          {clip.failNote && ` · ${clip.failNote}`}
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
        {editScore ? (
          <span className="flex items-center gap-1">
            <input
              className="input w-16 px-1.5 py-1 font-mono text-xs"
              value={scoreDraft}
              onChange={(e) => setScoreDraft(e.target.value)}
              autoFocus
            />
            <button className="btn-primary px-2 py-1 text-xs" onClick={() => void handleScoreSave()}>
              存
            </button>
          </span>
        ) : (
          <button
            className="badge bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            title="点击改分（人工分覆盖自动分）"
            onClick={() => {
              setScoreDraft(String(clip.score));
              setEditScore(true);
            }}
          >
            评分 {clip.score}
          </button>
        )}

        {clip.status !== '通过' && (
          <button className="btn-outline px-2 py-1 text-xs" onClick={() => void handleBest()}>
            ⭐ 选最优
          </button>
        )}
        {canRetry(clip) && (
          <button className="btn-outline px-2 py-1 text-xs" onClick={() => void handleRetry()}>
            🔁 重试
          </button>
        )}
        {clip.status !== '通过' && clip.status !== '放弃' && (
          <button
            className="btn-ghost px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 dark:text-red-400"
            onClick={() => setFailOpen(true)}
          >
            记失败
          </button>
        )}
        <select
          className="input w-20 px-1.5 py-1 text-xs"
          value={clip.status}
          onChange={async (e) => {
            await update(clip.id, { status: e.target.value as ClipStatus });
            showToast(`状态改为「${e.target.value}」`);
          }}
          title="手动推进状态"
        >
          {CLIP_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          className="btn-ghost ml-auto px-1.5 py-1 text-xs text-red-500 hover:bg-red-500/10 dark:text-red-400"
          onClick={() => setDeleting(true)}
        >
          🗑️
        </button>
      </div>

      <Modal open={failOpen} title="记录失败原因" onClose={() => setFailOpen(false)}>
        <label className="block text-sm">
          <span>失败原因</span>
          <select
            className="input mt-1"
            value={failReason}
            onChange={(e) => setFailReason(e.target.value as FailReason)}
          >
            {FAIL_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-sm">
          <span>补充说明{failReason === '其他' ? '（必填）' : '（可空；穿帮可写：脸变 / 衣服变 / 道具变）'}</span>
          <input
            className="input mt-1"
            value={failNote}
            onChange={(e) => setFailNote(e.target.value)}
            placeholder="如：第 4 段女主 B 手臂多了红臂章"
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-outline" onClick={() => setFailOpen(false)}>
            取消
          </button>
          <button
            className="btn-danger"
            onClick={() => void handleFail()}
            disabled={failReason === '其他' && !failNote.trim()}
          >
            确认失败
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting}
        danger
        title="删除片段"
        message={`确定删除「${clip.fileName}」的记录？（本地视频文件不受影响）`}
        confirmText="删除"
        onConfirm={async () => {
          await remove(clip.id);
          setDeleting(false);
          showToast('已删除片段记录');
        }}
        onCancel={() => setDeleting(false)}
      />
    </div>
  );
}
