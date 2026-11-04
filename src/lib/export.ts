import type { Project } from '../types/project';
import type { Shot, PromptRecord } from '../types/shot';
import type { CharacterCard } from '../types/character';
import type { Clip } from '../types/clip';
import type { QCReport } from '../types/qc';
import type { Dubbing } from '../types/dubbing';
import {
  projectsRepo,
  shotsRepo,
  charactersRepo,
  clipsRepo,
  promptsRepo,
  qcReportsRepo,
  dubbingsRepo,
} from './db';
import { uid, downloadFile } from './utils';

/** 项目导出文件结构：项目 + 全部关联数据 */
export interface ProjectExportPayload {
  app: 'pixelflow';
  version: 1;
  exportedAt: number;
  project: Project;
  shots: Shot[];
  characters: CharacterCard[];
  clips: Clip[];
  prompts: PromptRecord[];
  qcReports: QCReport[];
  dubbings: Dubbing[];
}

/** 组装一个项目的导出数据 */
export async function buildProjectPayload(projectId: string): Promise<ProjectExportPayload | null> {
  const project = await projectsRepo.get(projectId);
  if (!project) return null;
  const [shots, characters, clips, prompts, qcReports, dubbings] = await Promise.all([
    shotsRepo.listByProject(projectId),
    charactersRepo.listByProject(projectId),
    clipsRepo.listByProject(projectId),
    promptsRepo.listByProject(projectId),
    qcReportsRepo.listByProject(projectId),
    dubbingsRepo.listByProject(projectId),
  ]);
  return {
    app: 'pixelflow',
    version: 1,
    exportedAt: Date.now(),
    project,
    shots,
    characters,
    clips,
    prompts,
    qcReports,
    dubbings,
  };
}

/** 全部 id 重发一遍（复制项目 / 导入重名项目时避免冲突），并保持内部引用一致 */
export function remapPayload(payload: ProjectExportPayload, nameSuffix = ''): ProjectExportPayload {
  const projectId = uid();
  const shotIds = new Map(payload.shots.map((s) => [s.id, uid()]));
  const characterIds = new Map(payload.characters.map((c) => [c.id, uid()]));
  const clipIds = new Map(payload.clips.map((c) => [c.id, uid()]));
  const now = Date.now();
  return {
    app: 'pixelflow',
    version: 1,
    exportedAt: now,
    project: {
      ...payload.project,
      id: projectId,
      name: payload.project.name + nameSuffix,
      createdAt: now,
      updatedAt: now,
    },
    shots: payload.shots.map((s) => ({
      ...s,
      id: shotIds.get(s.id) as string,
      projectId,
      characterIds: s.characterIds.map((cid) => characterIds.get(cid) ?? cid),
    })),
    characters: payload.characters.map((c) => ({
      ...c,
      id: characterIds.get(c.id) as string,
      projectId,
    })),
    clips: payload.clips.map((c) => ({
      ...c,
      id: clipIds.get(c.id) as string,
      projectId,
      shotId: shotIds.get(c.shotId) ?? c.shotId,
    })),
    prompts: payload.prompts.map((p) => ({
      ...p,
      id: uid(),
      projectId,
      shotId: shotIds.get(p.shotId) ?? p.shotId,
    })),
    qcReports: payload.qcReports.map((r) => ({
      ...r,
      id: uid(),
      projectId,
      shotId: shotIds.get(r.shotId) ?? r.shotId,
      clipId: clipIds.get(r.clipId) ?? r.clipId,
    })),
    dubbings: payload.dubbings.map((d) => ({
      ...d,
      id: uid(),
      projectId,
      shotId: shotIds.get(d.shotId) ?? d.shotId,
    })),
  };
}

/** 把一份数据写进数据库 */
export async function savePayload(payload: ProjectExportPayload): Promise<void> {
  await projectsRepo.save(payload.project);
  await Promise.all([
    shotsRepo.saveMany(payload.shots),
    charactersRepo.saveMany(payload.characters),
    clipsRepo.saveMany(payload.clips),
    promptsRepo.saveMany(payload.prompts),
    qcReportsRepo.saveMany(payload.qcReports),
    dubbingsRepo.saveMany(payload.dubbings),
  ]);
}

/** 导出项目为 JSON 文件（下载） */
export async function exportProjectJson(project: Project): Promise<void> {
  const payload = await buildProjectPayload(project.id);
  if (!payload) return;
  const fileName = `${project.name.replace(/[\\/:*?"<>|]/g, '_')}-pixelflow.json`;
  downloadFile(fileName, JSON.stringify(payload, null, 2));
}

/** 导入项目 JSON：重名项目自动换新 id 导入 */
export async function importProjectJson(text: string): Promise<'ok' | 'invalid'> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return 'invalid';
  }
  if (!isPayload(parsed)) return 'invalid';
  const exists = await projectsRepo.get(parsed.project.id);
  const final = exists ? remapPayload(parsed) : parsed;
  await savePayload(final);
  return 'ok';
}

/** 复制项目（重发 id，名字加后缀） */
export async function duplicateProject(projectId: string): Promise<Project | null> {
  const payload = await buildProjectPayload(projectId);
  if (!payload) return null;
  const copy = remapPayload(payload, ' 副本');
  await savePayload(copy);
  return copy.project;
}

function isPayload(v: unknown): v is ProjectExportPayload {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return o.app === 'pixelflow' && typeof o.project === 'object' && o.project !== null;
}
