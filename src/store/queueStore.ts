import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 生成队列四种状态 */
export type QueueItemStatus = '待生成' | '生成中' | '已完成' | '失败';

export interface QueueItem {
  shotId: string;
  status: QueueItemStatus;
  error?: string;
  at?: number;
}

interface QueueState {
  projectId: string | null;
  items: QueueItem[];
  running: boolean;
  progressText: string;
  setQueue: (projectId: string, shotIds: string[]) => void;
  patch: (shotId: string, p: Partial<Omit<QueueItem, 'shotId'>>) => void;
  setRunning: (v: boolean) => void;
  setProgress: (t: string) => void;
  clear: () => void;
  /** 刷新恢复后：把「生成中」复位成「待生成」，running 关掉 */
  resetInterrupted: () => void;
}

/** 队列状态存 localStorage——刷新页面回来进度不丢 */
export const useQueueStore = create<QueueState>()(
  persist(
    (set) => ({
      projectId: null,
      items: [],
      running: false,
      progressText: '',
      setQueue: (projectId, shotIds) =>
        set({
          projectId,
          items: shotIds.map((shotId) => ({ shotId, status: '待生成' as const })),
          progressText: '',
        }),
      patch: (shotId, p) =>
        set((s) => ({
          items: s.items.map((it) => (it.shotId === shotId ? { ...it, ...p } : it)),
        })),
      setRunning: (v) => set({ running: v }),
      setProgress: (t) => set({ progressText: t }),
      clear: () => set({ projectId: null, items: [], running: false, progressText: '' }),
      resetInterrupted: () =>
        set((s) => ({
          running: false,
          items: s.items.map((it) => (it.status === '生成中' ? { ...it, status: '待生成' as const } : it)),
        })),
    }),
    { name: 'pixelflow-queue' },
  ),
);
