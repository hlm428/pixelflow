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
