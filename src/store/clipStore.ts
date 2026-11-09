import { create } from 'zustand';
import type { Clip, FailReason } from '../types/clip';
import { clipsRepo } from '../lib/db';
import { autoScore, statusAfterFail } from '../lib/clip';
import { uid } from '../lib/utils';

export interface NewClipData {
  fileName: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  fileSize: number;
  model: string;
  promptVersion: number;
  score?: number; // 缺省用 autoScore
  status?: Clip['status'];
}

interface ClipState {
  /** 当前项目的片段 */
  clips: Clip[];
  loadedProjectId: string | null;
  load: (projectId: string) => Promise<void>;
  create: (projectId: string, shotId: string, data: NewClipData, target: { width: number; height: number }) => Promise<Clip>;
  update: (id: string, patch: Partial<Clip>) => Promise<void>;
  /** 记一次失败：填失败原因；重试次数用完自动转「放弃」 */
  fail: (id: string, reason: FailReason, note: string) => Promise<void>;
  /** 重试：失败 → 生成中，重试次数 +1 */
  retry: (id: string) => Promise<void>;
  /** 标记该分镜的最优候选（同分镜其余取消） */
  markBest: (id: string) => Promise<void>;
  /** AI 生成：先建一条「生成中」占位记录 */
  startAI: (projectId: string, shotId: string, model: string, promptVersion: number) => Promise<Clip>;
  /** AI 生成成功：填视频信息 + 耗时/花费 + 自动打分 → 待质检 */
  completeAI: (id: string, data: { fileName: string; duration: number; width: number; height: number; fileSize: number; blob?: Blob; url?: string; genMs?: number; cost?: number }, target: { width: number; height: number }) => Promise<void>;
  /** AI 生成失败：记原因（不计入重试次数，手动重试另算） */
  failAI: (id: string, note: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useClipStore = create<ClipState>()((set, get) => ({
  clips: [],
  loadedProjectId: null,

  async load(projectId) {
    const all = await clipsRepo.listByProject(projectId);
    set({ clips: all, loadedProjectId: projectId });
  },

  async create(projectId, shotId, data, target) {
    const now = Date.now();
    const clip: Clip = {
      id: uid(),
      projectId,
      shotId,
      fileName: data.fileName,
      duration: data.duration,
      width: data.width,
      height: data.height,
      fps: data.fps,
      fileSize: data.fileSize,
      model: data.model,
      promptVersion: data.promptVersion,
      status: data.status ?? '待质检',
      failReason: null,
      failNote: '',
      retryCount: 0,
      score: data.score ?? autoScore(
        { duration: data.duration, width: data.width, height: data.height, fileSize: data.fileSize },
        target,
      ),
      isBest: false,
      createdAt: now,
    };
    await clipsRepo.save(clip);
    set({ clips: [...get().clips, clip] });
    return clip;
  },

  async update(id, patch) {
    const current = get().clips;
    const target = current.find((c) => c.id === id);
    if (!target) return;
    const next: Clip = { ...target, ...patch };
    await clipsRepo.save(next);
    set({ clips: current.map((c) => (c.id === id ? next : c)) });
  },

  async fail(id, reason, note) {
    const clip = get().clips.find((c) => c.id === id);
    if (!clip) return;
    await get().update(id, {
      status: statusAfterFail(clip.retryCount),
      failReason: reason,
      failNote: note,
    });
  },

  async retry(id) {
    const clip = get().clips.find((c) => c.id === id);
    if (!clip || clip.status !== '失败' || clip.retryCount >= 2) return;
    await get().update(id, {
      status: '生成中',
      retryCount: clip.retryCount + 1,
      failReason: null,
      failNote: '',
    });
  },

  async markBest(id) {
    const current = get().clips;
    const target = current.find((c) => c.id === id);
    if (!target) return;
    const sameShot = current.filter((c) => c.shotId === target.shotId);
    const updates: Clip[] = sameShot.map((c) => ({ ...c, isBest: c.id === id }));
    await clipsRepo.saveMany(updates);
    set({ clips: current.map((c) => updates.find((u) => u.id === c.id) ?? c) });
  },

  async startAI(projectId, shotId, model, promptVersion) {
    const now = Date.now();
    const clip: Clip = {
      id: uid(),
      projectId,
      shotId,
      fileName: `AI-${now}.mp4`,
      duration: 0,
      width: 0,
      height: 0,
      fps: 24,
      fileSize: 0,
      model,
      promptVersion,
      status: '生成中',
      failReason: null,
      failNote: '',
      retryCount: 0,
      score: 0,
      isBest: false,
      createdAt: now,
    };
    await clipsRepo.save(clip);
    set({ clips: [...get().clips, clip] });
    return clip;
  },

  async completeAI(id, data, target) {
    const clip = get().clips.find((c) => c.id === id);
    if (!clip) return;
    await get().update(id, {
      fileName: data.fileName,
      duration: data.duration,
      width: data.width,
      height: data.height,
      fps: clip.fps || 24,
      fileSize: data.fileSize,
      status: '待质检',
      failReason: null,
      failNote: '',
      score: autoScore(
        { duration: data.duration, width: data.width, height: data.height, fileSize: data.fileSize },
        target,
      ),
      videoBlob: data.blob,
      sourceUrl: data.url,
      genMs: data.genMs,
      cost: data.cost,
    });
  },

  async failAI(id, note) {
    const clip = get().clips.find((c) => c.id === id);
    if (!clip) return;
    await get().update(id, { status: '失败', failNote: note });
  },

  async remove(id) {
    await clipsRepo.delete(id);
    set({ clips: get().clips.filter((c) => c.id !== id) });
  },
}));
