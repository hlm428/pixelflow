import { create } from 'zustand';
import type { PromptTemplate } from '../types/template';
import { templatesRepo } from '../lib/db';
import { SEED_TEMPLATES } from '../data/templates';

interface TemplateState {
  templates: PromptTemplate[];
  loaded: boolean;
  /** 首次加载：库为空则播种种子模板 */
  loadAll: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  search: (category: PromptTemplate['category'] | '全部' | '收藏', kw: string) => PromptTemplate[];
}

export const useTemplateStore = create<TemplateState>()((set, get) => ({
  templates: [],
  loaded: false,

  async loadAll() {
    let all = await templatesRepo.list();
    if (all.length === 0) {
      await templatesRepo.saveMany(SEED_TEMPLATES);
      all = SEED_TEMPLATES;
    }
    set({ templates: all, loaded: true });
  },

  async toggleFavorite(id) {
    const current = get().templates;
    const target = current.find((t) => t.id === id);
    if (!target) return;
    const next = { ...target, favorite: !target.favorite };
    await templatesRepo.save(next);
    set({ templates: current.map((t) => (t.id === id ? next : t)) });
  },

  search(category, kw) {
    const keyword = kw.trim().toLowerCase();
    return get().templates.filter((t) => {
      if (category === '收藏') {
        if (!t.favorite) return false;
      } else if (category !== '全部' && t.category !== category) {
        return false;
      }
      if (!keyword) return true;
      return (
        t.content.toLowerCase().includes(keyword) ||
        t.description.toLowerCase().includes(keyword) ||
        t.scene.toLowerCase().includes(keyword) ||
        t.tags.some((tag) => tag.toLowerCase().includes(keyword))
      );
    });
  },
}));
