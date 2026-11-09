import type { Clip } from '../types/clip';
import type { Dubbing } from '../types/dubbing';
import type { QCReport } from '../types/qc';
import type { PromptRecord, Shot } from '../types/shot';
import {
  clipsRepo,
  dubbingsRepo,
  promptsRepo,
  qcReportsRepo,
  shotsRepo,
} from './db';

/** 拆分镜前的项目快照（撤销覆盖用） */
export interface ProjectSnapshot {
  takenAt: number;
  shots: Shot[];
  prompts: PromptRecord[];
  clips: Clip[];
  qcReports: QCReport[];
  dubbings: Dubbing[];
}

/** 抓取一个项目当前的全部分镜相关数据 */
export async function takeProjectSnapshot(projectId: string): Promise<ProjectSnapshot> {
  const [shots, prompts, clips, qcReports, dubbings] = await Promise.all([
    shotsRepo.listByProject(projectId),
    promptsRepo.listByProject(projectId),
    clipsRepo.listByProject(projectId),
    qcReportsRepo.listByProject(projectId),
    dubbingsRepo.listByProject(projectId),
  ]);
  return { takenAt: Date.now(), shots, prompts, clips, qcReports, dubbings };
}

/** 恢复快照：清掉当前项目的分镜相关数据，把备份写回去 */
export async function restoreProjectSnapshot(snapshot: ProjectSnapshot): Promise<void> {
  const projectId =
    snapshot.shots[0]?.projectId ??
    snapshot.prompts[0]?.projectId ??
    snapshot.clips[0]?.projectId;
  if (!projectId) return;

  const [curShots, curPrompts, curClips, curQc, curDubbings] = await Promise.all([
    shotsRepo.listByProject(projectId),
    promptsRepo.listByProject(projectId),
    clipsRepo.listByProject(projectId),
    qcReportsRepo.listByProject(projectId),
    dubbingsRepo.listByProject(projectId),
  ]);
  await Promise.all([
    shotsRepo.deleteMany(curShots.map((s) => s.id)),
    promptsRepo.deleteMany(curPrompts.map((p) => p.id)),
    clipsRepo.deleteMany(curClips.map((c) => c.id)),
    qcReportsRepo.deleteMany(curQc.map((q) => q.id)),
    dubbingsRepo.deleteMany(curDubbings.map((d) => d.id)),
  ]);
  await Promise.all([
    shotsRepo.saveMany(snapshot.shots),
    promptsRepo.saveMany(snapshot.prompts),
    clipsRepo.saveMany(snapshot.clips),
    qcReportsRepo.saveMany(snapshot.qcReports),
    dubbingsRepo.saveMany(snapshot.dubbings),
  ]);
}

const SPLIT_BACKUP_KEY = 'pixelflow-split-backup';

/** 拆分前快照持久化：剥离视频 Blob 后存 localStorage，导航离开再回来仍可撤销 */
export function saveSplitBackup(projectId: string, snapshot: ProjectSnapshot): void {
  try {
    const slim: ProjectSnapshot = {
      ...snapshot,
      clips: snapshot.clips.map(({ videoBlob: _drop, ...rest }) => rest),
    };
    localStorage.setItem(SPLIT_BACKUP_KEY, JSON.stringify({ projectId, snapshot: slim }));
  } catch {
    // 存不下（超限 / 隐私模式）就退化为仅当次页面内的撤销
  }
}

/** 读回当前项目的拆分备份（项目不匹配返回 null） */
export function loadSplitBackup(projectId: string): ProjectSnapshot | null {
  try {
    const raw = localStorage.getItem(SPLIT_BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { projectId: string; snapshot: ProjectSnapshot };
    if (parsed.projectId !== projectId || !parsed.snapshot?.shots?.length) return null;
    return parsed.snapshot;
  } catch {
    return null;
  }
}

/** 撤销完成或用户放弃后清掉备份 */
export function clearSplitBackup(): void {
  try {
    localStorage.removeItem(SPLIT_BACKUP_KEY);
  } catch {
    /* ignore */
  }
}
