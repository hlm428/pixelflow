import { create } from 'zustand';
import type { PromptRecord, Shot } from '../types/shot';
import { promptsRepo, shotsRepo, charactersRepo } from '../lib/db';
import { buildPrompt, resolveCards } from '../lib/prompt';
import { uid } from '../lib/utils';
import { useProjectStore } from './projectStore';
import { useShotStore } from './shotStore';

interface PromptState {
  /** 当前项目全部提示词历史版本 */
  prompts: PromptRecord[];
  loadedProjectId: string | null;
  load: (projectId: string) => Promise<void>;
  /** 该分镜的全部版本（version 升序） */
  byShot: (shotId: string) => PromptRecord[];
  /** 按公式生成新版本（角色卡原文 + 场景 + 风格 + 运镜 + 接力句） */
  generate: (shotId: string) => Promise<PromptRecord | null>;
  /** 手动编辑保存为新版本 */
  saveManual: (shotId: string, content: string) => Promise<PromptRecord | null>;
  /** 回滚到某版本：把旧版本内容另存为最新版本 */
  rollback: (shotId: string, version: number) => Promise<PromptRecord | null>;
  /** 批量生成，返回成功条数 */
  generateMany: (shotIds: string[]) => Promise<number>;
}

/** 更新 shot 的 promptVersion / 状态，并同步回 shotStore */
async function touchShot(shot: Shot, promptVersion: number) {
  const status = shot.status === '待写' ? '待生成' : shot.status;
  const next: Shot = { ...shot, promptVersion, status };
  await shotsRepo.save(next);
  const shotState = useShotStore.getState();
  if (shotState.loadedProjectId === next.projectId) {
    useShotStore.setState({ shots: shotState.shots.map((s) => (s.id === next.id ? next : s)) });
  }
}

export const usePromptStore = create<PromptState>()((set, get) => ({
  prompts: [],
  loadedProjectId: null,

  async load(projectId) {
    const all = await promptsRepo.listByProject(projectId);
    set({ prompts: all, loadedProjectId: projectId });
  },

  byShot(shotId) {
    return get()
      .prompts.filter((p) => p.shotId === shotId)
      .sort((a, b) => a.version - b.version);
  },

  async generate(shotId) {
    const shotState = useShotStore.getState();
    const shot = shotState.shots.find((s) => s.id === shotId);
    if (!shot) return null;
    const project = useProjectStore.getState().projects.find((p) => p.id === shot.projectId);
    if (!project) return null;
    const cards = await charactersRepo.listByProject(project.id);
    const resolved = resolveCards(cards, shot.characterIds, project.activeEra);
    const content = buildPrompt({
      project,
      shotIndex: shot.index,
      visualContent: shot.visualContent || shot.description,
      camera: shot.camera,
      characterCards: resolved,
    });
    const version = shot.promptVersion + 1;
    const record: PromptRecord = {
      id: uid(),
      projectId: shot.projectId,
      shotId,
      content,
      version,
      createdAt: Date.now(),
    };
    await promptsRepo.save(record);
    await touchShot(shot, version);
    set({ prompts: [...get().prompts.filter((p) => !(p.shotId === shotId && p.version === version)), record] });
    return record;
  },

  async saveManual(shotId, content) {
    const shotState = useShotStore.getState();
    const shot = shotState.shots.find((s) => s.id === shotId);
    if (!shot) return null;
    const version = shot.promptVersion + 1;
    const record: PromptRecord = {
      id: uid(),
      projectId: shot.projectId,
      shotId,
      content,
      version,
      createdAt: Date.now(),
    };
    await promptsRepo.save(record);
    await touchShot(shot, version);
    set({ prompts: [...get().prompts, record] });
    return record;
  },

  async rollback(shotId, version) {
    const old = get()
      .prompts.filter((p) => p.shotId === shotId)
      .find((p) => p.version === version);
    if (!old) return null;
    return get().saveManual(shotId, old.content);
  },

  async generateMany(shotIds) {
    let ok = 0;
    for (const id of shotIds) {
      const r = await get().generate(id);
      if (r) ok++;
    }
    return ok;
  },
}));
