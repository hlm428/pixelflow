import { useEffect, useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import { useClipStore } from '../../store/clipStore';
import { usePromptStore } from '../../store/promptStore';
import { useProjectStore } from '../../store/projectStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useToastStore } from '../../store/toastStore';
import { generateVideo, isAIConfigured, type AIGenerateConfig } from '../../lib/ai';
import { ASPECT_RESOLUTION, type AspectRatio } from '../../types/project';
import type { Shot } from '../../types/shot';

interface AIGenerateModalProps {
  open: boolean;
  onClose: () => void;
  shots: Shot[];
  defaultShotId: string | null;
  projectAspect: AspectRatio;
}

/** AI 一键生成：选分镜 → 用最新提示词调生成服务 → 出片自动入库打分 → 待质检 */
export default function AIGenerateModal({ open, onClose, shots, defaultShotId, projectAspect }: AIGenerateModalProps) {
  const showToast = useToastStore((s) => s.show);
  const startAI = useClipStore((s) => s.startAI);
  const completeAI = useClipStore((s) => s.completeAI);
  const failAI = useClipStore((s) => s.failAI);
  const byShot = usePromptStore((s) => s.byShot);
  const projects = useProjectStore((s) => s.projects);
  const currentProjectId = useSettingsStore((s) => s.currentProjectId);

  const [shotId, setShotId] = useState(defaultShotId ?? '');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');

  const cfg: AIGenerateConfig = useMemo(
    () => {
      const s = useSettingsStore.getState();
      return { provider: s.aiProvider, endpoint: s.aiEndpoint, apiKey: s.aiKey, model: s.aiModel };
    },
    // 打开弹窗时读取最新配置
    [open],
  );

  const project = projects.find((p) => p.id === currentProjectId) ?? null;

  useEffect(() => {
    if (open) {
      setShotId(defaultShotId ?? (shots[0]?.id ?? ''));
      setBusy(false);
      setProgress('');
      // 关键：本页此前没加载过提示词库，不加载的话弹窗只能显示原始描述句
      if (currentProjectId) void usePromptStore.getState().load(currentProjectId);
    }
  }, [open, defaultShotId, shots, currentProjectId]);

  const shot = shots.find((s) => s.id === shotId) ?? null;
  const latestPrompt = shot ? (byShot(shot.id).slice(-1)[0] ?? null) : null;
  const target = ASPECT_RESOLUTION[projectAspect];
  const promptText = latestPrompt?.content ?? (shot ? shot.visualContent || shot.description : '');

  const run = async () => {
    if (!shot || !project) return;
    if (!isAIConfigured(cfg)) {
      showToast('还没配置 AI 生成服务——去「设置」页选服务商、填密钥');
      return;
    }
    const prompt = promptText;
    setBusy(true);
    setProgress('创建生成记录…');
    try {
      const clip = await startAI(project.id, shot.id, cfg.provider === 'fal' ? cfg.model || 'fal' : '自定义接口', shot.promptVersion);
      const result = await generateVideo(cfg, { prompt, aspectRatio: projectAspect, durationSec: project.shotLength ?? 10 }, setProgress);
      let meta = { duration: project.shotLength ?? 10, width: target.width, height: target.height };
      let fileSize = 0;
      const fileName = clip.fileName;
      if (result.blob) {
        const objectUrl = URL.createObjectURL(result.blob);
        try {
          const el = document.createElement('video');
          el.preload = 'metadata';
          el.src = objectUrl;
          meta = await new Promise<{ duration: number; width: number; height: number }>((resolve) => {
            el.onloadedmetadata = () =>
              resolve({
                duration: el.duration || meta.duration,
                width: el.videoWidth || target.width,
                height: el.videoHeight || target.height,
              });
            el.onerror = () => resolve(meta);
            setTimeout(() => resolve(meta), 5000);
          });
          fileSize = result.blob.size;
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      }
      await completeAI(
        clip.id,
        { fileName, duration: meta.duration, width: meta.width, height: meta.height, fileSize, blob: result.blob, url: result.url },
        target,
      );
      showToast(`✅ 生成完成，已入库待质检${result.blob ? '（视频已存本地，可直接预览）' : '（仅存外链，可用「上传」补本地文件）'}`);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const clips = useClipStore.getState().clips.filter((c) => c.status === '生成中');
      const last = clips[clips.length - 1];
      if (last) await failAI(last.id, msg);
      showToast(`生成失败：${msg}`);
      setProgress('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title="🤖 AI 一键生成" onClose={onClose} wide>
      <div className="space-y-3">
        {isAIConfigured(cfg) ? (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
            已配置：{cfg.provider === 'fal' ? `fal.ai · ${cfg.model || '默认模型'}` : '自定义接口'}
            {cfg.model && cfg.provider !== 'fal' ? ` · ${cfg.model}` : ''}。密钥只存在你的浏览器。
          </p>
        ) : (
          <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            还没配置生成服务——到「设置」页的「🤖 AI 生成服务」选服务商（推荐 fal.ai）、填 API Key。
          </p>
        )}

        <label className="block text-sm">
          <span>
            分镜 <span className="text-red-500">*</span>
          </span>
          <select className="input mt-1" value={shotId} onChange={(e) => setShotId(e.target.value)}>
            <option value="">选择分镜…</option>
            {shots.map((s) => (
              <option key={s.id} value={s.id}>
                #{s.index} · {s.startTime}s · {s.description.slice(0, 20)}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="text-sm">将使用的提示词{latestPrompt ? `（v${latestPrompt.version}）` : ''}</span>
          <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-emerald-400">
            {promptText || '该分镜还没有提示词——将只用画面描述生成，建议先回「提示词」页生成'}
          </pre>
        </div>

        {busy && (
          <p className="text-sm text-indigo-500">
            {progress || '处理中…'}
            <span className="ml-2 text-xs text-zinc-400">出片一般要 1–5 分钟，页面可以放着不动</span>
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button className="btn-outline" onClick={onClose}>
            取消
          </button>
          <button className="btn-primary" onClick={() => void run()} disabled={busy || !shotId}>
            {busy ? '生成中…' : '🚀 开始生成'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
