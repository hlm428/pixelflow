import type { AIProviderKind } from '../store/settingsStore';

/**
 * AI 视频生成适配层：
 * - fal.ai：官方队列 API（浏览器可直连），提交 → 轮询 → 拉结果 → 下载视频
 * - custom：任意「提交返回 JSON」的接口（OpenAI 兼容聚合站 / 自建代理），
 *   深度解析响应里的视频地址或任务 id（有 id 自动轮询 GET {endpoint}/{id}）
 *
 * 注意：部分服务商禁止网页直连（CORS），失败信息里会提示走自建代理。
 */

export interface AIGenerateConfig {
  provider: AIProviderKind;
  endpoint: string;
  apiKey: string;
  model: string;
}

export interface AIGenerateParams {
  prompt: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  durationSec: number;
}

export interface AIGenerateResult {
  blob?: Blob;
  url?: string;
}

/** fal.ai 默认模型与端点 */
export const FAL_QUEUE_BASE = 'https://queue.fal.run';
export const FAL_DEFAULT_MODEL = 'fal-ai/kling-video/v1/standard/text-to-video';

export function isAIConfigured(cfg: AIGenerateConfig): boolean {
  if (cfg.provider === 'none') return false;
  if (!cfg.apiKey.trim()) return false;
  if (cfg.provider === 'fal') return (cfg.model || FAL_DEFAULT_MODEL).includes('/');
  return cfg.endpoint.trim().startsWith('http');
}

/** 从任意 JSON 里深度找视频地址 / 任务 id */
export function findInJson(
  data: unknown,
  kind: 'video' | 'task',
): { value: string } | null {
  const VIDEO_RE = /^https?:\/\/\S+\.(mp4|webm|mov)(\?\S*)?$/i;
  const URL_RE = /^https?:\/\//i;
  const found: Array<{ key: string; value: string }> = [];
  const walk = (node: unknown, keyPath: string) => {
    if (Array.isArray(node)) {
      node.forEach((n, i) => walk(n, `${keyPath}[${i}]`));
      return;
    }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        walk(v, keyPath ? `${keyPath}.${k}` : k);
      }
      return;
    }
    if (typeof node === 'string' && URL_RE.test(node)) {
      found.push({ key: keyPath.toLowerCase(), value: node });
    }
  };
  walk(data, '');
  if (kind === 'video') {
    const exact = found.find((f) => VIDEO_RE.test(f.value));
    if (exact) return { value: exact.value };
    const byKey = found.find((f) => /(video|output|result|url)/.test(f.key));
    if (byKey) return { value: byKey.value };
    return null;
  }
  const task = found.find((f) => /status_url|response_url/.test(f.key));
  if (task) return { value: task.value };
  // 找短 id 字段（相对路径轮询用）
  const walkId = (node: unknown): string | null => {
    if (Array.isArray(node)) {
      for (const n of node) {
        const r = walkId(n);
        if (r) return r;
      }
      return null;
    }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        if ((k === 'request_id' || k === 'task_id' || k === 'id') && typeof v === 'string' && v.length > 4) {
          return v;
        }
        const r = walkId(v);
        if (r) return r;
      }
    }
    return null;
  };
  const id = walkId(data);
  return id ? { value: id } : null;
}

/** 构造请求体 */
export function buildPayload(cfg: AIGenerateConfig, params: AIGenerateParams): Record<string, unknown> {
  if (cfg.provider === 'fal') {
    return {
      prompt: params.prompt,
      duration: String(params.durationSec),
      aspect_ratio: params.aspectRatio,
    };
  }
  return {
    model: cfg.model || undefined,
    prompt: params.prompt,
    duration: params.durationSec,
    aspect_ratio: params.aspectRatio,
  };
}

/** 构造请求头与提交地址 */
export function buildRequest(cfg: AIGenerateConfig, params: AIGenerateParams): { url: string; init: RequestInit } {
  const payload = buildPayload(cfg, params);
  if (cfg.provider === 'fal') {
    const model = cfg.model.trim() || FAL_DEFAULT_MODEL;
    return {
      url: `${FAL_QUEUE_BASE}/${model}`,
      init: {
        method: 'POST',
        headers: {
          Authorization: `Key ${cfg.apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    };
  }
  return {
    url: cfg.endpoint.trim(),
    init: {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  };
}

/** 判断轮询响应是否已完成（fal 用 status 字段，custom 看有没有视频地址） */
export function pollDone(json: unknown, provider: AIProviderKind): 'done' | 'pending' | 'failed' {
  if (provider === 'fal') {
    const status = (json as { status?: string } | null)?.status?.toUpperCase();
    if (status === 'OK' || status === 'COMPLETED') return 'done';
    if (status === 'ERROR' || status === 'FAILED') return 'failed';
    return 'pending';
  }
  return findInJson(json, 'video') ? 'done' : 'pending';
}

async function downloadVideo(url: string): Promise<Blob | undefined> {
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    return await res.blob();
  } catch {
    return undefined; // 视频域名 CORS 拦截时退化为只记外链
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 提交生成任务并等待出片（最长 ~8 分钟） */
export async function generateVideo(
  cfg: AIGenerateConfig,
  params: AIGenerateParams,
  onProgress?: (msg: string) => void,
): Promise<AIGenerateResult> {
  const { url, init } = buildRequest(cfg, params);
  onProgress?.('提交生成任务…');
  const submitRes = await fetch(url, init);
  if (!submitRes.ok) {
    const text = await submitRes.text().catch(() => '');
    throw new Error(`提交失败 HTTP ${submitRes.status}：${text.slice(0, 160) || submitRes.statusText}`);
  }
  const submitted: unknown = await submitRes.json();

  // 直接返回了视频地址
  const direct = findInJson(submitted, 'video');
  if (direct) {
    onProgress?.('拿到视频地址，下载中…');
    const blob = await downloadVideo(direct.value);
    return blob ? { blob, url: direct.value } : { url: direct.value };
  }

  // 队列模式：轮询
  const task = findInJson(submitted, 'task');
  if (!task) {
    throw new Error('服务返回里既没有视频地址也没有任务 id，无法跟踪进度。请确认接口返回格式。');
  }
  const statusUrl = task.value.startsWith('http')
    ? task.value
    : cfg.provider === 'fal'
      ? `${FAL_QUEUE_BASE}/${cfg.model.trim() || FAL_DEFAULT_MODEL}/requests/${task.value}/status`
      : `${cfg.endpoint.trim().replace(/\/$/, '')}/${task.value}`;

  const deadline = Date.now() + 8 * 60_000;
  while (Date.now() < deadline) {
    await sleep(4000);
    onProgress?.('生成中，每 4 秒查询一次…');
    const pollRes = await fetch(statusUrl, {
      headers:
        cfg.provider === 'fal'
          ? { Authorization: `Key ${cfg.apiKey.trim()}` }
          : { Authorization: `Bearer ${cfg.apiKey.trim()}` },
    });
    if (!pollRes.ok) continue;
    const json: unknown = await pollRes.json();
    const state = pollDone(json, cfg.provider);
    if (state === 'failed') throw new Error('服务端报告生成失败（status=ERROR/FAILED）');
    if (state !== 'done') continue;
    // fal：结果在 response_url
    const finalJson =
      cfg.provider === 'fal'
        ? await fetch(
            findInJson(json, 'task')?.value?.startsWith('http')
              ? (findInJson(json, 'task') as { value: string }).value
              : statusUrl.replace(/\/status$/, ''),
            { headers: { Authorization: `Key ${cfg.apiKey.trim()}` } },
          ).then((r) => r.json()).catch(() => json)
        : json;
    const video = findInJson(finalJson, 'video') ?? findInJson(json, 'video');
    if (!video) throw new Error('任务完成但响应里找不到视频地址');
    onProgress?.('拿到视频地址，下载中…');
    const blob = await downloadVideo(video.value);
    return blob ? { blob, url: video.value } : { url: video.value };
  }
  throw new Error('等待超时（8 分钟）：任务还在队列里。可以稍后在片段列表重试或手动上传。');
}

/** 测试连接：只验证「网络可达 + 密钥被接受与否」，不产生计费 */
export async function testConnection(cfg: AIGenerateConfig): Promise<{ ok: boolean; message: string }> {
  if (!isAIConfigured(cfg)) {
    return { ok: false, message: '配置不完整：选服务商、填密钥，fal 需要模型 id，自定义需要 http 开头的接口地址。' };
  }
  const probe =
    cfg.provider === 'fal'
      ? `${FAL_QUEUE_BASE}/${cfg.model.trim() || FAL_DEFAULT_MODEL}`
      : cfg.endpoint.trim();
  try {
    const res = await fetch(probe, {
      method: 'GET',
      headers: cfg.provider === 'fal' ? { Authorization: `Key ${cfg.apiKey.trim()}` } : { Authorization: `Bearer ${cfg.apiKey.trim()}` },
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: `服务可达，但密钥被拒（HTTP ${res.status}）——检查 API Key。` };
    }
    return { ok: true, message: `连接成功（HTTP ${res.status}），可以开始生成。` };
  } catch (err) {
    return {
      ok: false,
      message: `连不上：${err instanceof Error ? err.message : String(err)}。多半是 CORS 拦截（服务商禁止网页直连）——需要自建代理转发，或换支持浏览器的服务商（fal.ai 支持）。`,
    };
  }
}
