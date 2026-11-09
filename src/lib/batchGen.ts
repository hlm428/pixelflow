import type { AIGenerateConfig } from './ai';
import { generateVideo, isAIConfigured } from './ai';
import { modelCostPerClip } from './dashboard';
import { ASPECT_RESOLUTION } from '../types/project';
import type { Project } from '../types/project';
import type { Shot } from '../types/shot';
import { useClipStore } from '../store/clipStore';

export interface BatchOneResult {
  ok: boolean;
  error?: string;
}

/**
 * 批量生成的一条：与「AI 一键生成」弹窗同一条链路——
 * startAI 占位 → 调服务商 → 探测时长分辨率 → completeAI（记实测耗时/估算花费）→ 待质检。
 * 失败时 failAI 记原因并返回明确错误（不悄悄失败）。
 */
export async function generateOneShot(
  cfg: AIGenerateConfig,
  project: Project,
  shot: Shot,
  promptText: string,
  onProgress?: (msg: string) => void,
): Promise<BatchOneResult> {
  if (!isAIConfigured(cfg)) {
    return {
      ok: false,
      error: '还没配置生成服务——去「设置」页选服务商（Gemini / fal.ai / 自定义）并填 API Key。',
    };
  }
  if (!promptText.trim()) {
    return { ok: false, error: '该分镜没有提示词——先回「提示词」页生成 v1 提示词再批量。' };
  }
  const clipStore = useClipStore.getState();
  try {
    const clip = await clipStore.startAI(
      project.id,
      shot.id,
      cfg.provider === 'fal' ? cfg.model || 'fal' : cfg.provider === 'gemini' ? cfg.model || 'gemini-omni-1.2-flash' : '自定义接口',
      shot.promptVersion,
    );
    const startedAt = Date.now();
    const target = ASPECT_RESOLUTION[project.aspectRatio];
    const result = await generateVideo(
      cfg,
      { prompt: promptText, aspectRatio: project.aspectRatio, durationSec: project.shotLength ?? 10 },
      onProgress,
    );
    let meta = { duration: project.shotLength ?? 10, width: target.width, height: target.height };
    let fileSize = 0;
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
    const genMs = Date.now() - startedAt;
    const cost = modelCostPerClip(clip.model, meta.duration);
    await clipStore.completeAI(
      clip.id,
      {
        fileName: clip.fileName,
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        fileSize,
        blob: result.blob,
        url: result.url,
        genMs,
        cost,
      },
      target,
    );
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // 失败：把「生成中」的占位记录标失败
    const running = useClipStore.getState().clips.filter((c) => c.status === '生成中');
    const last = running[running.length - 1];
    if (last) await useClipStore.getState().failAI(last.id, msg);
    return { ok: false, error: msg };
  }
}
