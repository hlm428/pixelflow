import { create } from 'zustand';
import type { Music } from '../types/music';
import { musicsRepo } from '../lib/db';
import { uid } from '../lib/utils';

interface MusicState {
  musics: Music[];
  loaded: boolean;
  loadAll: () => Promise<void>;
  create: (data: Omit<Music, 'id'>) => Promise<Music>;
  update: (id: string, patch: Partial<Music>) => Promise<void>;
  /** 把音乐标记为「用在某项目」 */
  markUsedIn: (id: string, projectName: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useMusicStore = create<MusicState>()((set, get) => ({
  musics: [],
  loaded: false,

  async loadAll() {
    const all = await musicsRepo.list();
    set({ musics: all, loaded: true });
  },

  async create(data) {
    const music: Music = { id: uid(), ...data };
    await musicsRepo.save(music);
    set({ musics: [...get().musics, music] });
    return music;
  },

  async update(id, patch) {
    const current = get().musics;
    const target = current.find((m) => m.id === id);
    if (!target) return;
    const next: Music = { ...target, ...patch };
    await musicsRepo.save(next);
    set({ musics: current.map((m) => (m.id === id ? next : m)) });
  },

  async markUsedIn(id, projectName) {
    const target = get().musics.find((m) => m.id === id);
    if (!target || target.usedIn.includes(projectName)) return;
    await get().update(id, { usedIn: [...target.usedIn, projectName] });
  },

  async remove(id) {
    await musicsRepo.delete(id);
    set({ musics: get().musics.filter((m) => m.id !== id) });
  },
}));
