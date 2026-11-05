import { create } from 'zustand';
import type { Shot, ShotStatus } from '../types/shot';
import { clipsRepo, promptsRepo, qcReportsRepo, dubbingsRepo, shotsRepo } from '../lib/db';
import { recalcShots, draftToShot, SHOT_LENGTH_DEFAULT, type ShotDraft } from '../lib/shot';
import { uid } from '../lib/utils';
import { useProjectStore } from './projectStore';

/** 项目的单镜时长（未设置则默认 10 秒） */
function projectShotLength(projectId: string): number {
  return (
    useProjectStore.getState().projects.find((p) => p.id === projectId)?.shotLength ??
    SHOT_LENGTH_DEFAULT
  );
}

interface ShotState {
  /** 当前项目的分镜（按 index 升序） */
  shots: Shot[];
  loadedProjectId: string | null;
  load: (projectId: string) => Promise<void>;
  /** 追加一个空分镜到末尾 */
  create: (projectId: string, partial?: Partial<Shot>) => Promise<Shot>;
  update: (id: string, patch: Partial<Shot>) => Promise<void>;
  /** 删除分镜并级联删除其片段 / 提示词 / QC / 配音，然后重算时间点 */
  remove: (id: string) => Promise<void>;
  /** 拖拽排序后重算全部编号和时间点 */
  reorder: (fromIndex0: number, toIndex0: number) => Promise<void>;
  /** 批量改状态 */
  batchStatus: (ids: string[], status: ShotStatus) => Promise<void>;
  /** 一句话故事拆分镜：清空该项目现有分镜（含级联数据）后批量写入草稿 */
  replaceAllWithDrafts: (projectId: string, drafts: ShotDraft[], shotLength?: number) => Promise<void>;
}

function sortByIdx(list: Shot[]): Shot[] {
  return [...list].sort((a, b) => a.index - b.index);
}

export const useShotStore = create<ShotState>()((set, get) => ({
  shots: [],
  loadedProjectId: null,

  async load(projectId) {
    const all = await shotsRepo.listByProject(projectId);
    set({ shots: sortByIdx(all), loadedProjectId: projectId });
  },

  async create(projectId, partial) {
    const current = get().shots;
    const shot: Shot = {
      id: uid(),
      projectId,
      index: current.length + 1,
      startTime: current.length * 10,
      description: '',
      visualContent: '',
      camera: '',
      dialogue: '',
      characterIds: [],
      status: '待写',
      promptVersion: 0,
      ...partial,
    };
    await shotsRepo.save(shot);
    set({ shots: sortByIdx([...current, shot]) });
    return shot;
  },

  async update(id, patch) {
    const current = get().shots;
    const target = current.find((s) => s.id === id);
    if (!target) return;
    const next: Shot = { ...target, ...patch };
    await shotsRepo.save(next);
    set({ shots: current.map((s) => (s.id === id ? next : s)) });
  },

  async remove(id) {
    const current = get().shots;
    const target = current.find((s) => s.id === id);
    if (!target) return;
    // 级联删除该分镜的片段、提示词、QC 报告、配音
    const [clips, prompts, reports, dubbings] = await Promise.all([
      clipsRepo.listByProject(target.projectId),
      promptsRepo.listByProject(target.projectId),
      qcReportsRepo.listByProject(target.projectId),
      dubbingsRepo.listByProject(target.projectId),
    ]);
    await shotsRepo.delete(id);
    await Promise.all([
      clipsRepo.deleteMany(clips.filter((c) => c.shotId === id).map((c) => c.id)),
      promptsRepo.deleteMany(prompts.filter((p) => p.shotId === id).map((p) => p.id)),
      qcReportsRepo.deleteMany(reports.filter((r) => r.shotId === id).map((r) => r.id)),
      dubbingsRepo.deleteMany(dubbings.filter((d) => d.shotId === id).map((d) => d.id)),
    ]);
    set({ shots: recalcShots(current.filter((s) => s.id !== id), projectShotLength(target.projectId)) });
    await shotsRepo.saveMany(recalcShots(get().shots, projectShotLength(target.projectId)));
  },

  async reorder(fromIndex0, toIndex0) {
    const current = get().shots;
    if (fromIndex0 === toIndex0 || fromIndex0 < 0 || toIndex0 < 0 || fromIndex0 >= current.length || toIndex0 >= current.length) return;
    const len = projectShotLength(current[0]?.projectId ?? '');
    const moved = [...current];
    const [item] = moved.splice(fromIndex0, 1);
    moved.splice(toIndex0, 0, item);
    const recalced = recalcShots(moved, len);
    set({ shots: recalced });
    await shotsRepo.saveMany(recalced);
  },

  async batchStatus(ids, status) {
    const current = get().shots;
    const changed = current
      .filter((s) => ids.includes(s.id))
      .map((s) => ({ ...s, status }));
    if (changed.length === 0) return;
    await shotsRepo.saveMany(changed);
    set({ shots: current.map((s) => (ids.includes(s.id) ? { ...s, status } : s)) });
  },

  async replaceAllWithDrafts(projectId, drafts, shotLength = SHOT_LENGTH_DEFAULT) {
    const current = get().shots;
    // 级联清掉现有分镜的所有关联数据
    const [clips, prompts, reports, dubbings] = await Promise.all([
      clipsRepo.listByProject(projectId),
      promptsRepo.listByProject(projectId),
      qcReportsRepo.listByProject(projectId),
      dubbingsRepo.listByProject(projectId),
    ]);
    await Promise.all([
      clipsRepo.deleteMany(clips.map((c) => c.id)),
      promptsRepo.deleteMany(prompts.map((p) => p.id)),
      qcReportsRepo.deleteMany(reports.map((r) => r.id)),
      dubbingsRepo.deleteMany(dubbings.map((d) => d.id)),
    ]);
    if (current.length > 0) {
      await shotsRepo.deleteMany(current.map((s) => s.id));
    }
    const created = drafts.map((d, i) => draftToShot(projectId, d, i + 1, shotLength));
    await shotsRepo.saveMany(created);
    set({ shots: created, loadedProjectId: projectId });
  },
}));
