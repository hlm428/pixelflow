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

/** Gemini / Veo（Interactions API）常量 */
export const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
export const GEMINI_DEFAULT_MODEL = 'gemini-omni-1.2-flash';

/** Gemini 视频模型下拉项（veo-3.0/2.0 已于 2026-06-30 关停，不再提供） */
export const GEMINI_MODEL_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'gemini-omni-1.2-flash', label: 'Gemini Omni 1.2 Flash（推荐 · 最长 15 秒 · 带原生音频）' },
  { id: 'gemini-omni-1.1-flash', label: 'Gemini Omni 1.1 Flash（上一代 · 2026-12-03 起自动路由到 1.2）' },
];

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
  if (cfg.provider === 'gemini') return true; // 模型有默认值，填 Key 即可
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
  if (cfg.provider === 'gemini') {
    // Interactions API：异步提交（background），出片时长由模型决定（Omni 最长 15 秒，无手动时长参数）
    return {
      model: cfg.model.trim() || GEMINI_DEFAULT_MODEL,
      input: params.prompt,
      background: true,
      response_format: {
        type: 'video',
        // Omni 只支持 16:9 / 9:16，1:1 项目按 16:9 生成
        aspect_ratio: params.aspectRatio === '1:1' ? '16:9' : params.aspectRatio,
      },
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
  if (cfg.provider === 'gemini') {
    // Gemini 不认 Bearer，用 x-goog-api-key 头鉴权
    return {
      url: `${GEMINI_BASE}/interactions`,
      init: {
        method: 'POST',
        headers: {
          'x-goog-api-key': cfg.apiKey.trim(),
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
  if (provider === 'gemini') {
    const j = json as { status?: string; error?: { message?: string } } | null;
    if (j?.error) return 'failed';
    if (j?.status === 'completed') return 'done';
    if (j?.status === 'failed' || j?.status === 'error' || j?.status === 'cancelled') return 'failed';
    return 'pending';
  }
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
  if (cfg.provider === 'gemini') return generateVideoGemini(cfg, params, onProgress);
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

/** base64 → mp4 Blob（Gemini Interactions 轮询结果直接给 base64 视频） */
export function base64ToMp4Blob(b64: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'video/mp4' });
}

/** 从 Interactions 响应里深度提取视频输出：优先 base64 data，其次文件 uri */
export function extractGeminiVideo(json: unknown): { data?: string; uri?: string } | null {
  let found: { data?: string; uri?: string } | null = null;
  const walk = (node: unknown): void => {
    if (found) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === 'object') {
      const o = node as Record<string, unknown>;
      if (o.type === 'video' && (typeof o.data === 'string' || typeof o.uri === 'string')) {
        found = {
          data: typeof o.data === 'string' ? o.data : undefined,
          uri: typeof o.uri === 'string' ? o.uri : undefined,
        };
        return;
      }
      for (const v of Object.values(o)) walk(v);
    }
  };
  walk(json);
  return found;
}

function geminiErrorMessage(json: unknown): string {
  const err = (json as { error?: { message?: string; status?: string } } | null)?.error;
  return err?.message ? `服务端错误：${err.message}${err.status ? `（${err.status}）` : ''}` : '服务端报告生成失败';
}

/**
 * Gemini / Veo 生成流程（Interactions API，2026-11 官方文档）：
 * 提交（background=true 异步）→ 轮询 GET /v1beta/interactions/{id} → 完成后取 base64/uri → 下载存浏览器。
 * veo-3.0/2.0 已于 2026-06-30 关停；当前模型 gemini-omni-1.2-flash（付费层，最长 15 秒带原生音频）。
 */
async function generateVideoGemini(
  cfg: AIGenerateConfig,
  params: AIGenerateParams,
  onProgress?: (msg: string) => void,
): Promise<AIGenerateResult> {
  const { url, init } = buildRequest(cfg, params);
  onProgress?.('提交生成任务…');
  const submitRes = await fetch(url, init);
  if (!submitRes.ok) {
    const text = await submitRes.text().catch(() => '');
    let hint = '';
    if (submitRes.status === 400 && /billing|quota|PERMISSION/i.test(text)) {
      hint = '——视频生成需要 Google Cloud 项目开通计费（paid tier），免费层不可用。';
    }
    throw new Error(`提交失败 HTTP ${submitRes.status}：${text.slice(0, 200) || submitRes.statusText}${hint}`);
  }
  const submitted: unknown = await submitRes.json();

  const take = async (v: { data?: string; uri?: string }): Promise<AIGenerateResult> => {
    if (v.data) return { blob: base64ToMp4Blob(v.data) };
    onProgress?.('拿到视频地址，下载中…');
    const blob = await fetch(v.uri as string, { headers: { 'x-goog-api-key': cfg.apiKey.trim() } })
      .then((r) => (r.ok ? r.blob() : undefined))
      .catch(() => undefined);
    return blob ? { blob, url: v.uri } : { url: v.uri };
  };

  // 同步完成 / 提交响应里直接带视频
  const direct = extractGeminiVideo(submitted);
  if (direct) return take(direct);

  // 异步：轮询 interactions/{id}
  const id = findInJson(submitted, 'task')?.value;
  if (!id) throw new Error('服务返回里既没有视频数据也没有任务 id，无法跟踪进度。请确认接口返回格式。');
  const statusUrl = id.startsWith('http') ? id : `${GEMINI_BASE}/interactions/${id}`;

  const deadline = Date.now() + 10 * 60_000;
  while (Date.now() < deadline) {
    await sleep(5000);
    onProgress?.('生成中，每 5 秒查询一次…');
    const pollRes = await fetch(statusUrl, { headers: { 'x-goog-api-key': cfg.apiKey.trim() } });
    if (!pollRes.ok) continue;
    const json: unknown = await pollRes.json();
    const state = pollDone(json, 'gemini');
    if (state === 'failed') throw new Error(geminiErrorMessage(json));
    if (state !== 'done') continue;
    const video = extractGeminiVideo(json);
    if (!video) throw new Error('任务完成但响应里找不到视频数据');
    onProgress?.('拿到视频，保存中…');
    return take(video);
  }
  throw new Error('等待超时（10 分钟）：任务还在队列里。可以稍后在片段列表重试或手动上传。');
}

/** 测试连接：只验证「网络可达 + 密钥被接受与否」，不产生计费 */
export async function testConnection(cfg: AIGenerateConfig): Promise<{ ok: boolean; message: string }> {
  if (!isAIConfigured(cfg)) {
    return {
      ok: false,
      message:
        cfg.provider === 'gemini'
          ? '配置不完整：填入 Gemini API Key（aistudio.google.com/apikey 可拿）。'
          : '配置不完整：选服务商、填密钥，fal 需要模型 id，自定义需要 http 开头的接口地址。',
    };
  }
  const probe =
    cfg.provider === 'gemini'
      ? `${GEMINI_BASE}/models`
      : cfg.provider === 'fal'
        ? `${FAL_QUEUE_BASE}/${cfg.model.trim() || FAL_DEFAULT_MODEL}`
        : cfg.endpoint.trim();
  const headers: Record<string, string> =
    cfg.provider === 'gemini'
      ? { 'x-goog-api-key': cfg.apiKey.trim() }
      : cfg.provider === 'fal'
        ? { Authorization: `Key ${cfg.apiKey.trim()}` }
        : { Authorization: `Bearer ${cfg.apiKey.trim()}` };
  try {
    const res = await fetch(probe, { method: 'GET', headers });
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      const body = await res.text().catch(() => '');
      const serverMsg = (() => {
        try {
          return (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? '';
        } catch {
          return '';
        }
      })();
      const detail = serverMsg ? `：${serverMsg.slice(0, 120)}` : '';
      return { ok: false, message: `服务可达，但密钥被拒（HTTP ${res.status}）${detail}——检查 API Key。` };
    }
    if (cfg.provider === 'gemini') {
      return { ok: true, message: `连接成功（HTTP ${res.status}），Key 有效。视频生成按量计费（720p 约 $0.07/秒），需项目开通计费。` };
    }
    return { ok: true, message: `连接成功（HTTP ${res.status}），可以开始生成。` };
  } catch (err) {
    return {
      ok: false,
      message: `连不上：${err instanceof Error ? err.message : String(err)}。多半是 CORS 拦截（服务商禁止网页直连）——需要自建代理转发，或换支持浏览器的服务商（fal.ai / Gemini 都支持）。`,
    };
  }
}
