import { describe, expect, it } from 'vitest';
import {
  buildRequest,
  buildPayload,
  findInJson,
  isAIConfigured,
  pollDone,
  extractGeminiVideo,
  base64ToMp4Blob,
  GEMINI_BASE,
  GEMINI_DEFAULT_MODEL,
  FAL_DEFAULT_MODEL,
} from './ai';

const falCfg = { provider: 'fal' as const, endpoint: '', apiKey: 'key-123', model: FAL_DEFAULT_MODEL };
const geminiCfg = { provider: 'gemini' as const, endpoint: '', apiKey: 'AIza-test', model: GEMINI_DEFAULT_MODEL };
const customCfg = {
  provider: 'custom' as const,
  endpoint: 'https://my-proxy.example.com/video/generate',
  apiKey: 'sk-abc',
  model: 'muse-10s',
};

describe('isAIConfigured', () => {
  it('none = 未配置', () => {
    expect(isAIConfigured({ provider: 'none', endpoint: '', apiKey: '', model: '' })).toBe(false);
  });

  it('fal：有 key + 模型 id 含斜杠即可', () => {
    expect(isAIConfigured(falCfg)).toBe(true);
    expect(isAIConfigured({ ...falCfg, model: 'kling' })).toBe(false);
    expect(isAIConfigured({ ...falCfg, apiKey: '' })).toBe(false);
  });

  it('custom：有 key + http 开头的接口地址即可', () => {
    expect(isAIConfigured(customCfg)).toBe(true);
    expect(isAIConfigured({ ...customCfg, endpoint: 'my-proxy.com' })).toBe(false);
  });
});

describe('buildRequest / buildPayload', () => {
  it('fal：POST 到 queue.fal.run/{model}，Key 认证，时长转字符串', () => {
    const { url, init } = buildRequest(falCfg, {
      prompt: 'a girl with umbrella',
      aspectRatio: '16:9',
      durationSec: 10,
    });
    expect(url).toBe(`https://queue.fal.run/${FAL_DEFAULT_MODEL}`);
    expect((init.headers as Record<string, string>).Authorization).toBe('Key key-123');
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ prompt: 'a girl with umbrella', duration: '10', aspect_ratio: '16:9' });
  });

  it('custom：POST 到自填地址，Bearer 认证，带 model', () => {
    const { url, init } = buildRequest(customCfg, {
      prompt: 'p',
      aspectRatio: '9:16',
      durationSec: 5,
    });
    expect(url).toBe('https://my-proxy.example.com/video/generate');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-abc');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('muse-10s');
    expect(body.duration).toBe(5);
  });
});

describe('findInJson 深度解析', () => {
  it('找视频地址：精确匹配 .mp4 后缀', () => {
    const r = findInJson({ data: { outputs: [{ url: 'https://cdn.x.com/v.mp4?sign=1' }] } }, 'video');
    expect(r?.value).toBe('https://cdn.x.com/v.mp4?sign=1');
  });

  it('找视频地址：后缀不匹配时按字段名兜底', () => {
    const r = findInJson({ video_url: 'https://cdn.x.com/signed/abc' }, 'video');
    expect(r?.value).toBe('https://cdn.x.com/signed/abc');
  });

  it('找任务：优先 status_url / response_url', () => {
    const r = findInJson(
      { request_id: 'abc-123', status_url: 'https://queue.fal.run/m/requests/abc-123/status' },
      'task',
    );
    expect(r?.value).toBe('https://queue.fal.run/m/requests/abc-123/status');
  });

  it('找任务：没有 url 时回退到 request_id', () => {
    const r = findInJson({ some: { request_id: 'task-999' } }, 'task');
    expect(r?.value).toBe('task-999');
  });

  it('什么都没有返回 null', () => {
    expect(findInJson({ hello: 'world' }, 'video')).toBeNull();
  });
});

describe('pollDone 轮询判定', () => {
  it('fal：OK/COMPLETED 完成，ERROR 失败，其他 pending', () => {
    expect(pollDone({ status: 'OK' }, 'fal')).toBe('done');
    expect(pollDone({ status: 'IN_QUEUE' }, 'fal')).toBe('pending');
    expect(pollDone({ status: 'ERROR' }, 'fal')).toBe('failed');
  });

  it('custom：响应里出现视频地址即完成', () => {
    expect(pollDone({ video_url: 'https://x.com/a.mp4' }, 'custom')).toBe('done');
    expect(pollDone({ progress: 50 }, 'custom')).toBe('pending');
  });
});


describe('gemini / veo（Interactions API）', () => {
  it('isAIConfigured：填 Key 即可（模型有默认值）', () => {
    expect(isAIConfigured(geminiCfg)).toBe(true);
    expect(isAIConfigured({ ...geminiCfg, apiKey: '' })).toBe(false);
    expect(isAIConfigured({ ...geminiCfg, model: '' })).toBe(true);
  });

  it('buildRequest：POST /v1beta/interactions，x-goog-api-key 鉴权（不认 Bearer）', () => {
    const { url, init } = buildRequest(geminiCfg, {
      prompt: '雨中分伞，日系动画',
      aspectRatio: '16:9',
      durationSec: 10,
    });
    expect(url).toBe(`${GEMINI_BASE}/interactions`);
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('AIza-test');
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe(GEMINI_DEFAULT_MODEL);
    expect(body.input).toBe('雨中分伞，日系动画');
    expect(body.background).toBe(true);
    expect(body.response_format).toEqual({ type: 'video', aspect_ratio: '16:9' });
  });

  it('buildPayload：9:16 保留，1:1 映射成 16:9（Omni 不支持 1:1）', () => {
    const p9 = buildPayload(geminiCfg, { prompt: 'x', aspectRatio: '9:16', durationSec: 5 });
    expect((p9.response_format as Record<string, string>).aspect_ratio).toBe('9:16');
    const p1 = buildPayload(geminiCfg, { prompt: 'x', aspectRatio: '1:1', durationSec: 5 });
    expect((p1.response_format as Record<string, string>).aspect_ratio).toBe('16:9');
  });

  it('pollDone：status=completed → done；error / failed → failed；其余 pending', () => {
    expect(pollDone({ status: 'completed' }, 'gemini')).toBe('done');
    expect(pollDone({ status: 'running' }, 'gemini')).toBe('pending');
    expect(pollDone({ error: { message: 'quota exceeded' } }, 'gemini')).toBe('failed');
    expect(pollDone({ status: 'failed' }, 'gemini')).toBe('failed');
  });

  it('extractGeminiVideo：从 steps→content 里找 type=video 的 base64 data / uri', () => {
    const withData = {
      steps: [{ type: 'model_output', content: [{ type: 'video', mime_type: 'video/mp4', data: 'AAAA' }] }],
    };
    expect(extractGeminiVideo(withData)).toEqual({ data: 'AAAA', uri: undefined });
    const withUri = {
      steps: [
        { type: 'model_output', content: [{ type: 'video', uri: 'https://generativelanguage.googleapis.com/v1beta/files/x:download?alt=media' }] },
      ],
    };
    expect(extractGeminiVideo(withUri)?.uri).toContain('/files/x:download');
    expect(extractGeminiVideo({ steps: [] })).toBeNull();
  });

  it('base64ToMp4Blob：解码成 video/mp4 Blob', () => {
    // 1x1 mp4 无所谓，验证可解码 + MIME
    const blob = base64ToMp4Blob(btoa('hello'));
    expect(blob.type).toBe('video/mp4');
    expect(blob.size).toBe(5);
  });
});
