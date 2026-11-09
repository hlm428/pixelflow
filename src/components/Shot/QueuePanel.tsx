import { useEffect, useRef, useState } from 'react';
import Modal from '../ui/Modal';
import { useQueueStore, type QueueItemStatus } from '../../store/queueStore';
import { useShotStore } from '../../store/shotStore';
import { usePromptStore } from '../../store/promptStore';
import { useProjectStore } from '../../store/projectStore';
import { useSettingsStore } from '../../store/settingsStore';
import { generateOneShot } from '../../lib/batchGen';
import { isAIConfigured } from '../../lib/ai';

const STATUS_STYLE: Record<QueueItemStatus, string> = {
  待生成: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  生成中: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  已完成: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  失败: 'bg-red-500/15 text-red-500',
};

interface QueuePanelProps {
  open: boolean;
  onClose: () => void;
  /** 打开时以当前项目的分镜顺序重建队列（保留已完成/失败的结果） */
  buildQueue: () => void;
}

/**
 * 一键生成全部 · 队列面板：
 * 按分镜顺序逐条生成，四种状态一眼看出来；失败显示哪条+原因，可重试失败/跳过继续。
 * 队列状态存 localStorage，刷新页面回来能继续。
 */
export default function QueuePanel({ open, onClose, buildQueue }: QueuePanelProps) {
  const queue = useQueueStore();
  const shots = useShotStore((s) => s.shots);
  const byShot = usePromptStore((s) => s.byShot);
  const projects = useProjectStore((s) => s.projects);
  const currentProjectId = useSettingsStore((s) => s.currentProjectId);

  const [progressMsg, setProgressMsg] = useState('');
  const abortRef = useRef(false);

  const project = projects.find((p) => p.id === currentProjectId) ?? null;
  const cfg = {
    provider: useSettingsStore.getState().aiProvider,
    endpoint: useSettingsStore.getState().aiEndpoint,
    apiKey: useSettingsStore.getState().aiKey,
    model: useSettingsStore.getState().aiModel,
  };
  void cfg;

  // 打开时：没有队列或换了项目就重建；有旧队列则恢复（刷新不丢）
  useEffect(() => {
    if (open) {
      queue.resetInterrupted();
      if (!queue.items.length || queue.projectId !== currentProjectId) buildQueue();
      if (currentProjectId) void usePromptStore.getState().load(currentProjectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const shotById = (id: string) => shots.find((s) => s.id === id);
  const done = queue.items.filter((i) => i.status === '已完成').length;
  const failed = queue.items.filter((i) => i.status === '失败');
  const pendingCount = queue.items.filter((i) => i.status === '待生成').length;

  const runQueue = async () => {
    const q0 = useQueueStore.getState();
    if (q0.running || !project) return;
    abortRef.current = false;
    q0.setRunning(true);
    const total = q0.items.length;
    for (let i = 0; i < total; i++) {
      if (abortRef.current) break;
      const cur = useQueueStore.getState();
      const item = cur.items[i];
      if (!item || item.status !== '待生成') continue;
      const shot = shotById(item.shotId);
      if (!shot) {
        cur.patch(item.shotId, { status: '失败', error: '分镜不存在（可能被删除）' });
        continue;
      }
      cur.patch(item.shotId, { status: '生成中', error: undefined });
      const doneNow = cur.items.filter((x) => x.status === '已完成').length + 1;
      const label = `正在生成第 ${doneNow} / ${total} 镜（#${shot.index}）`;
      cur.setProgress(label);
      setProgressMsg('');
      const latestPrompt = byShot(shot.id).slice(-1)[0];
      const promptText = latestPrompt?.content ?? (shot.visualContent || shot.description);
      const r = await generateOneShot(cfg, project, shot, promptText, (m) => setProgressMsg(m));
      const after = useQueueStore.getState();
      if (r.ok) {
        after.patch(item.shotId, { status: '已完成', at: Date.now() });
      } else {
        after.patch(item.shotId, { status: '失败', error: r.error, at: Date.now() });
      }
    }
    const end = useQueueStore.getState();
    const endDone = end.items.filter((x) => x.status === '已完成').length;
    const endFail = end.items.filter((x) => x.status === '失败').length;
    end.setProgress(abortRef.current ? '已暂停——回来点「继续生成」接着跑' : `队列结束：${endDone} 条完成${endFail ? `，${endFail} 条失败` : ''}`);
    end.setRunning(false);
  };

  const retryFailed = () => {
    for (const f of failed) queue.patch(f.shotId, { status: '待生成', error: undefined });
    void runQueue();
  };

  const skipContinue = () => {
    // 失败项保持失败，继续跑后面的待生成
    void runQueue();
  };

  const aiReady = isAIConfigured(
    (() => {
      const s = useSettingsStore.getState();
      return { provider: s.aiProvider, endpoint: s.aiEndpoint, apiKey: s.aiKey, model: s.aiModel };
    })(),
  );

  return (
    <Modal open={open} title="⚡ 一键生成全部" onClose={onClose} wide>
      <div className="space-y-3">
        {!aiReady && (
          <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            还没配置生成服务——队列会全部失败。先到「设置」页选服务商（Gemini / fal.ai / 自定义）并填 Key。
          </p>
        )}

        {/* 进度 */}
        <div className="rounded-lg bg-indigo-500/5 px-3 py-2.5 text-sm dark:bg-indigo-500/10">
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {queue.running ? queue.progressText || '准备中…' : queue.progressText || `共 ${queue.items.length} 条 · 待生成 ${pendingCount} · 已完成 ${done}`}
            </span>
            <span className="font-mono text-xs text-zinc-500">
              {done}/{queue.items.length} ✓
            </span>
          </div>
          {progressMsg && queue.running && <p className="mt-1 text-xs text-zinc-500">{progressMsg}</p>}
        </div>

        {/* 队列列表 */}
        <div className="max-h-72 space-y-1.5 overflow-y-auto">
          {queue.items.length === 0 && (
            <p className="py-6 text-center text-sm text-zinc-500">队列是空的。关闭后从「一键生成全部」按钮重新打开。</p>
          )}
          {queue.items.map((item, i) => {
            const shot = shotById(item.shotId);
            return (
              <div key={item.shotId} className="flex items-start gap-2 rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800">
                <span className="mt-0.5 font-mono text-xs text-zinc-400">#{String(shot?.index ?? i + 1).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{shot?.description || shot?.visualContent || '（分镜已删除）'}</p>
                  {item.status === '失败' && item.error && (
                    <p className="mt-1 rounded bg-red-500/5 px-2 py-1 text-[11px] leading-relaxed text-red-500">
                      失败原因：{item.error}
                    </p>
                  )}
                  {queue.running && item.status === '生成中' && progressMsg && (
                    <p className="mt-1 text-[11px] text-zinc-400">{progressMsg}</p>
                  )}
                </div>
                <span className={`badge ${STATUS_STYLE[item.status]} shrink-0`}>
                  {item.status === '已完成' ? '✓ ' : ''}
                  {item.status}
                </span>
              </div>
            );
          })}
        </div>

        {/* 操作 */}
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          {!queue.running && pendingCount > 0 && (
            <button className="btn-primary" onClick={() => void runQueue()}>
              🚀 {done > 0 || failed.length > 0 ? '继续生成' : '开始生成'}
            </button>
          )}
          {queue.running && (
            <button
              className="btn-outline"
              onClick={() => {
                abortRef.current = true;
              }}
            >
              ⏸ 暂停
            </button>
          )}
          {!queue.running && failed.length > 0 && (
            <>
              <button className="btn-outline" onClick={retryFailed}>
                ↻ 重试失败的（{failed.length}）
              </button>
              {pendingCount > 0 && (
                <button className="btn-outline" onClick={skipContinue}>
                  ⏭ 跳过继续
                </button>
              )}
            </>
          )}
          {!queue.running && queue.items.length > 0 && (
            <>
              <button className="btn-ghost" onClick={buildQueue} title="按当前分镜列表重排队列（会清掉已有状态）">
                🔄 重建队列
              </button>
              <button className="btn-ghost" onClick={() => queue.clear()}>
                清空队列
              </button>
            </>
          )}
          <button className="btn-ghost" onClick={onClose}>
            关闭
          </button>
        </div>
        <p className="text-[11px] text-zinc-400">
          队列状态存在本地——刷新页面后重新打开这个面板，进度和失败原因都还在，点「继续生成」接着跑。
        </p>
      </div>
    </Modal>
  );
}
