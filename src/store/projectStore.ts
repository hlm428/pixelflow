import { create } from 'zustand';
import type { AspectRatio, ProjectStyle, Project } from '../types/project';
import {
  projectsRepo,
  shotsRepo,
  charactersRepo,
  clipsRepo,
  promptsRepo,
  qcReportsRepo,
  dubbingsRepo,
} from '../lib/db';
import { duplicateProject } from '../lib/export';
import { uid } from '../lib/utils';
import { useSettingsStore } from './settingsStore';

/** 创建项目时的表单数据 */
export interface NewProjectData {
  name: string;
  theme: string;
  oneLineStory: string;
  targetDuration: number;
  aspectRatio: AspectRatio;
  style: ProjectStyle;
}

interface ProjectState {
  projects: Project[];
  loaded: boolean;
  load: () => Promise<void>;
  create: (data: NewProjectData) => Promise<Project>;
  update: (id: string, patch: Partial<Project>) => Promise<void>;
  /** 删除项目并级联删除分镜、角色卡、片段、提示词、QC、配音 */
  remove: (id: string) => Promise<void>;
  /** 复制项目（连分镜、角色卡、片段、提示词、QC、配音一起复制），返回副本 */
  duplicate: (id: string) => Promise<Project | null>;
}

function sortByCreatedDesc(list: Project[]): Project[] {
  return [...list].sort((a, b) => b.createdAt - a.createdAt);
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  projects: [],
  loaded: false,

  async load() {
    const list = await projectsRepo.list();
    set({ projects: sortByCreatedDesc(list), loaded: true });
  },

  async create(data) {
    const now = Date.now();
    const project: Project = {
      id: uid(),
      ...data,
      activeEra: '现代',
      status: '构思中',
      createdAt: now,
      updatedAt: now,
    };
    await projectsRepo.save(project);
    set({ projects: sortByCreatedDesc([project, ...get().projects]) });
    return project;
  },

  async update(id, patch) {
    const current = get().projects.find((p) => p.id === id);
    if (!current) return;
    const next: Project = { ...current, ...patch, updatedAt: Date.now() };
    await projectsRepo.save(next);
    set({ projects: get().projects.map((p) => (p.id === id ? next : p)) });
  },

  async remove(id) {
    // 级联删除项目下的所有关联数据
    const [shots, characters, clips, prompts, qcReports, dubbings] = await Promise.all([
      shotsRepo.listByProject(id),
      charactersRepo.listByProject(id),
      clipsRepo.listByProject(id),
      promptsRepo.listByProject(id),
      qcReportsRepo.listByProject(id),
      dubbingsRepo.listByProject(id),
    ]);
    await projectsRepo.delete(id);
    await Promise.all([
      shotsRepo.deleteMany(shots.map((s) => s.id)),
      charactersRepo.deleteMany(characters.map((c) => c.id)),
      clipsRepo.deleteMany(clips.map((c) => c.id)),
      promptsRepo.deleteMany(prompts.map((p) => p.id)),
      qcReportsRepo.deleteMany(qcReports.map((q) => q.id)),
      dubbingsRepo.deleteMany(dubbings.map((d) => d.id)),
    ]);
    set({ projects: get().projects.filter((p) => p.id !== id) });
    if (useSettingsStore.getState().currentProjectId === id) {
      useSettingsStore.getState().update({ currentProjectId: null });
    }
  },

  async duplicate(id) {
    const copy = await duplicateProject(id);
    if (copy) {
      set({ projects: sortByCreatedDesc([copy, ...get().projects]) });
    }
    return copy;
  },
}));
