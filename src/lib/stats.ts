import type { Shot } from '../types/shot';
import type { Clip } from '../types/clip';
import type { QCReport } from '../types/qc';

export interface ProjectStats {
  totalShots: number;
  passedShots: number; /** 分镜状态 = 通过 */
  pendingQCShots: number; /** 分镜状态 = 待质检 */
  failedShots: number; /** 分镜状态 = 失败 */
  shotsWithPassingClip: number; /** 有「通过」片段的分镜数 */
  totalClips: number;
  passingClips: number;
  qcTotal: number; /** QC 报告数 */
  qcPassed: number; /** overall = pass 的报告数 */
}

/** 由分镜、片段、QC 报告三份列表算出项目统计（纯函数，可单测） */
export function computeProjectStats(shots: Shot[], clips: Clip[], reports: QCReport[]): ProjectStats {
  const passingClipShotIds = new Set(clips.filter((c) => c.status === '通过').map((c) => c.shotId));
  return {
    totalShots: shots.length,
    passedShots: shots.filter((s) => s.status === '通过').length,
    pendingQCShots: shots.filter((s) => s.status === '待质检').length,
    failedShots: shots.filter((s) => s.status === '失败').length,
    shotsWithPassingClip: shots.filter((s) => passingClipShotIds.has(s.id)).length,
    totalClips: clips.length,
    passingClips: clips.filter((c) => c.status === '通过').length,
    qcTotal: reports.length,
    qcPassed: reports.filter((r) => r.overall === 'pass').length,
  };
}

/** QC 通过率（0–100） */
export function qcPassRate(stats: ProjectStats): number {
  if (stats.qcTotal === 0) return 0;
  return Math.round((stats.qcPassed / stats.qcTotal) * 100);
}

/** 成片进度：有通过片段的分镜 / 总分镜（0–100） */
export function shotProgress(stats: ProjectStats): number {
  if (stats.totalShots === 0) return 0;
  return Math.round((stats.shotsWithPassingClip / stats.totalShots) * 100);
}
