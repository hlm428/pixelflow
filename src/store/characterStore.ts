import { create } from 'zustand';
import type { CharacterCard } from '../types/character';
import type { CharacterEra } from '../types/project';
import { charactersRepo, shotsRepo } from '../lib/db';
import { uid } from '../lib/utils';
import { useShotStore } from './shotStore';

interface CharacterState {
  /** 当前项目的角色卡 */
  characters: CharacterCard[];
  loadedProjectId: string | null;
  load: (projectId: string) => Promise<void>;
  create: (projectId: string, data: Partial<CharacterCard>) => Promise<CharacterCard>;
  update: (id: string, patch: Partial<CharacterCard>) => Promise<void>;
  /** 删除角色卡，并把该项目分镜里对它的引用清掉 */
  remove: (id: string) => Promise<void>;
  /** 复制一张卡为指定时代的新版本（同名） */
  duplicateAsEra: (id: string, era: CharacterEra) => Promise<CharacterCard | null>;
  /** 导入角色卡（重发 id、挂到当前项目） */
  importCards: (projectId: string, cards: CharacterCard[]) => Promise<number>;
}

const ERA_ORDER: Record<CharacterEra, number> = { 现代: 0, 古代: 1, 未来: 2 };

function sortCards(list: CharacterCard[]): CharacterCard[] {
  return [...list].sort((a, b) =>
    a.name === b.name ? ERA_ORDER[a.era] - ERA_ORDER[b.era] : a.name.localeCompare(b.name, 'zh'),
  );
}

export const useCharacterStore = create<CharacterState>()((set, get) => ({
  characters: [],
  loadedProjectId: null,

  async load(projectId) {
    const cards = await charactersRepo.listByProject(projectId);
    set({ characters: sortCards(cards), loadedProjectId: projectId });
  },

  async create(projectId, data) {
    const now = Date.now();
    const card: CharacterCard = {
      id: uid(),
      projectId,
      name: '',
      era: '现代',
      face: '',
      eyes: '',
      hair: '',
      clothing: '',
      personality: '',
      voice: '',
      notes: '',
      createdAt: now,
      updatedAt: now,
      ...data,
    };
    await charactersRepo.save(card);
    set({ characters: sortCards([...get().characters, card]) });
    return card;
  },

  async update(id, patch) {
    const current = get().characters;
    const target = current.find((c) => c.id === id);
    if (!target) return;
    const next: CharacterCard = { ...target, ...patch, updatedAt: Date.now() };
    await charactersRepo.save(next);
    set({ characters: sortCards(current.map((c) => (c.id === id ? next : c))) });
  },

  async remove(id) {
    const current = get().characters;
    const card = current.find((c) => c.id === id);
    if (!card) return;
    await charactersRepo.delete(id);
    // 从该项目全部分镜的 characterIds 里清掉这个引用
    const shots = await shotsRepo.listByProject(card.projectId);
    const affected = shots.filter((s) => s.characterIds.includes(id));
    if (affected.length > 0) {
      const patched = affected.map((s) => ({
        ...s,
        characterIds: s.characterIds.filter((x) => x !== id),
      }));
      await shotsRepo.saveMany(patched);
      const shotState = useShotStore.getState();
      if (shotState.loadedProjectId === card.projectId) {
        const patchedIds = new Map(patched.map((s) => [s.id, s]));
        useShotStore.setState({
          shots: shotState.shots.map((s) => patchedIds.get(s.id) ?? s),
        });
      }
    }
    set({ characters: current.filter((c) => c.id !== id) });
  },

  async duplicateAsEra(id, era) {
    const current = get().characters;
    const card = current.find((c) => c.id === id);
    if (!card) return null;
    const now = Date.now();
    const copy: CharacterCard = {
      ...card,
      id: uid(),
      era,
      notes: card.notes ? `${card.notes}（复制自${card.era}版）` : `复制自${card.era}版`,
      createdAt: now,
      updatedAt: now,
    };
    await charactersRepo.save(copy);
    set({ characters: sortCards([...current, copy]) });
    return copy;
  },

  async importCards(projectId, cards) {
    const now = Date.now();
    const imported = cards.map((c) => ({
      ...c,
      id: uid(),
      projectId,
      createdAt: now,
      updatedAt: now,
    }));
    await charactersRepo.saveMany(imported);
    const existing = get().loadedProjectId === projectId ? get().characters : [];
    set({ characters: sortCards([...existing, ...imported]), loadedProjectId: projectId });
    return imported.length;
  },
}));
