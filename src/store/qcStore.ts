import { create } from 'zustand';
import type { QCReport } from '../types/qc';
import { qcReportsRepo, clipsRepo } from '../lib/db';
import { uid } from '../lib/utils';
import { statusAfterFail } from '../lib/clip';
import { useClipStore } from './clipStore';

interface QCState {
  /** 当前项目的 QC 报告 */
  reports: QCReport[];
  loadedProjectId: string | null;
  load: (projectId: string) => Promise<void>;
  /** 提交报告并联动片段状态：通过 → 通过；不通过 → 失败/放弃 */
  submit: (report: Omit<QCReport, 'id' | 'createdAt'>) => Promise<QCReport>;
}

export const useQCStore = create<QCState>()((set, get) => ({
  reports: [],
  loadedProjectId: null,

  async load(projectId) {
    const all = await qcReportsRepo.listByProject(projectId);
    set({ reports: all, loadedProjectId: projectId });
  },

  async submit(data) {
    const report: QCReport = { ...data, id: uid(), createdAt: Date.now() };
    await qcReportsRepo.save(report);
    // 联动片段状态
    const clipStore = useClipStore.getState();
    const clip = clipStore.clips.find((c) => c.id === report.clipId);
    if (clip) {
      const nextStatus = report.overall === 'pass' ? '通过' : statusAfterFail(clip.retryCount);
      const next: typeof clip = { ...clip, status: nextStatus };
      await clipsRepo.save(next);
      if (clipStore.loadedProjectId === next.projectId) {
        useClipStore.setState({ clips: clipStore.clips.map((c) => (c.id === next.id ? next : c)) });
      }
    }
    set({ reports: [...get().reports, report] });
    return report;
  },
}));
