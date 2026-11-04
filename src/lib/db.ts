import { openDB, type IDBPDatabase } from 'idb';
import type { Project } from '../types/project';
import type { Shot, PromptRecord } from '../types/shot';
import type { CharacterCard } from '../types/character';
import type { Clip } from '../types/clip';
import type { QCReport } from '../types/qc';
import type { Dubbing } from '../types/dubbing';
import type { PromptTemplate } from '../types/template';
import type { Music } from '../types/music';

/** IndexedDB：库名 pixelflow，版本 1，共 9 张表 */
const DB_NAME = 'pixelflow';
const DB_VERSION = 1;

export const STORE_NAMES = [
  'projects',
  'shots',
  'characters',
  'clips',
  'qcReports',
  'prompts',
  'templates',
  'dubbings',
  'musics',
] as const;

export type StoreName = (typeof STORE_NAMES)[number];

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const name of STORE_NAMES) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id' });
          }
        }
      },
    });
  }
  return dbPromise;
}

interface RecordWithId {
  id: string;
}

/** 每张表一套通用增删改查 */
function createRepo<T extends RecordWithId>(storeName: StoreName) {
  return {
    name: storeName,

    async list(): Promise<T[]> {
      const db = await getDB();
      const values = await db.getAll(storeName);
      return values as T[];
    },

    async get(id: string): Promise<T | undefined> {
      const db = await getDB();
      const value = await db.get(storeName, id);
      return value as T | undefined;
    },

    async save(value: T): Promise<void> {
      await (await getDB()).put(storeName, value);
    },

    async saveMany(values: T[]): Promise<void> {
      if (values.length === 0) return;
      const db = await getDB();
      const tx = db.transaction(storeName, 'readwrite');
      for (const v of values) void tx.store.put(v);
      await tx.done;
    },

    async delete(id: string): Promise<void> {
      await (await getDB()).delete(storeName, id);
    },

    async deleteMany(ids: string[]): Promise<void> {
      if (ids.length === 0) return;
      const db = await getDB();
      const tx = db.transaction(storeName, 'readwrite');
      for (const id of ids) void tx.store.delete(id);
      await tx.done;
    },

    async clear(): Promise<void> {
      await (await getDB()).clear(storeName);
    },

    async count(): Promise<number> {
      return (await getDB()).count(storeName);
    },

    /** 按项目过滤（记录带 projectId 字段时才有意义） */
    async listByProject(projectId: string): Promise<T[]> {
      const all = await this.list();
      return (all as Array<T & { projectId?: string }>).filter((v) => v.projectId === projectId);
    },
  };
}

export const projectsRepo = createRepo<Project>('projects');
export const shotsRepo = createRepo<Shot>('shots');
export const charactersRepo = createRepo<CharacterCard>('characters');
export const clipsRepo = createRepo<Clip>('clips');
export const qcReportsRepo = createRepo<QCReport>('qcReports');
export const promptsRepo = createRepo<PromptRecord>('prompts');
export const templatesRepo = createRepo<PromptTemplate>('templates');
export const dubbingsRepo = createRepo<Dubbing>('dubbings');
export const musicsRepo = createRepo<Music>('musics');

/** 清空全部数据（设置页「清空数据」用） */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  for (const name of STORE_NAMES) {
    await db.clear(name);
  }
}
