import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TTSProvider } from '../types/dubbing';
import { SEED_TTS_PROVIDERS } from '../data/ttsProviders';

interface ProviderState {
  providers: TTSProvider[];
  updateProvider: (id: string, patch: Partial<TTSProvider>) => void;
  resetProviders: () => void;
}

/**
 * TTS 供应商资料（存 localStorage：额度 / 截止日期用户可改，快到期在看板和配音页提醒）
 */
export const useProviderStore = create<ProviderState>()(
  persist(
    (set, get) => ({
      providers: SEED_TTS_PROVIDERS,
      updateProvider(id, patch) {
        set({
          providers: get().providers.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        });
      },
      resetProviders() {
        set({ providers: SEED_TTS_PROVIDERS });
      },
    }),
    { name: 'pixelflow-providers' },
  ),
);
