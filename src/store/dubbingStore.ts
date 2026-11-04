import { create } from 'zustand';
import type { Dubbing, DubbingStatus } from '../types/dubbing';
import { dubbingsRepo } from '../lib/db';
import { uid } from '../lib/utils';

/** 新建台词的输入（未传的字段用默认值） */
export interface NewDubbingData {
  shotId: string;
  speaker: string;
  text: string;
  startSec: number;
  endSec: number;
  provider?: string;
  voice?: string;
  fileName?: string;
  audioDuration?: number;
  status?: DubbingStatus;
}

interface DubbingState {
  /** 当前项目的台词 / 配音记录（按 startSec 排序） */
  dubbings: Dubbing[];
  loadedProjectId: string | null;
  load: (projectId: string) => Promise<void>;
  create: (projectId: string, data: NewDubbingData) => Promise<Dubbing>;
  update: (id: string, patch: Partial<Dubbing>) => Promise<void>;
  /** 上传配音文件后：记文件名 + 时长，状态改已完成 */
  uploadAudio: (id: string, fileName: string, audioDuration: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** 从分镜 dialogue 字段批量导入台词（跳过已有台词的分镜），返回导入条数 */
  importFromShots: (projectId: string, dialogues: Array<{ shotId: string; text: string; startSec: number; endSec: number }>) => Promise<number>;
}

function sortByStart(list: Dubbing[]): Dubbing[] {
  return [...list].sort((a, b) => a.startSec - b.startSec || a.id.localeCompare(b.id));
}

export const useDubbingStore = create<DubbingState>()((set, get) => ({
  dubbings: [],
  loadedProjectId: null,

  async load(projectId) {
    const all = await dubbingsRepo.listByProject(projectId);
    set({ dubbings: sortByStart(all), loadedProjectId: projectId });
  },

  async create(projectId, data) {
    const record: Dubbing = {
      id: uid(),
      projectId,
      shotId: data.shotId,
      speaker: data.speaker,
      text: data.text,
      startSec: data.startSec,
      endSec: data.endSec,
      provider: data.provider ?? 'mimo',
      voice: data.voice ?? '',
      fileName: data.fileName ?? '',
      audioDuration: data.audioDuration ?? 0,
      status: data.status ?? '待配音',
    };
    await dubbingsRepo.save(record);
    set({ dubbings: sortByStart([...get().dubbings, record]) });
    return record;
  },

  async update(id, patch) {
    const current = get().dubbings;
    const target = current.find((d) => d.id === id);
    if (!target) return;
    const next: Dubbing = { ...target, ...patch };
    await dubbingsRepo.save(next);
    set({ dubbings: sortByStart(current.map((d) => (d.id === id ? next : d))) });
  },

  async uploadAudio(id, fileName, audioDuration) {
    await get().update(id, { fileName, audioDuration, status: '已完成' });
  },

  async remove(id) {
    await dubbingsRepo.delete(id);
    set({ dubbings: get().dubbings.filter((d) => d.id !== id) });
  },

  async importFromShots(projectId, dialogues) {
    const existingShotIds = new Set(get().dubbings.filter((d) => d.projectId === projectId).map((d) => d.shotId));
    const records: Dubbing[] = dialogues
      .filter((d) => !existingShotIds.has(d.shotId))
      .map((d) => ({
        id: uid(),
        projectId,
        shotId: d.shotId,
        speaker: '旁白',
        text: d.text,
        startSec: d.startSec,
        endSec: d.endSec,
        provider: 'mimo',
        voice: '',
        fileName: '',
        audioDuration: 0,
        status: '待配音',
      }));
    if (records.length === 0) return 0;
    await dubbingsRepo.saveMany(records);
    set({ dubbings: sortByStart([...get().dubbings, ...records]) });
    return records.length;
  },
}));
