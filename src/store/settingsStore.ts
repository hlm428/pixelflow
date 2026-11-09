import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AspectRatio, ProjectStyle } from '../types/project';

export type Theme = 'dark' | 'light';
/** 默认转场方式 */
export type TransitionMode = '硬切' | '溶解';
/** QC 严格程度：影响哪些检查项必须过 */
export type QCStrictness = '严格' | '标准' | '宽松';

/** AI 视频生成服务配置 */
export type AIProviderKind = 'none' | 'fal' | 'custom' | 'gemini';

interface SettingsData {
  theme: Theme;
  defaultAspectRatio: AspectRatio;
  defaultStyle: ProjectStyle;
  defaultTransition: TransitionMode;
  dailyQuota: number; /** 每日生成片段上限 */
  qcStrictness: QCStrictness;
  currentProjectId: string | null; /** 当前选中的项目（顶部栏） */
  aiProvider: AIProviderKind; /** 视频生成服务商 */
  aiEndpoint: string; /** 自定义接口完整 POST 地址（fal 固定 queue.fal.run） */
  aiKey: string; /** API 密钥（只存本浏览器） */
  aiModel: string; /** 模型 id（fal 如 fal-ai/kling-video/...，Gemini 如 gemini-omni-1.2-flash） */
}

interface SettingsState extends SettingsData {
  update: (patch: Partial<SettingsData>) => void;
}

const DEFAULTS: SettingsData = {
  theme: 'dark',
  defaultAspectRatio: '16:9',
  defaultStyle: '动漫',
  defaultTransition: '溶解',
  dailyQuota: 100,
  qcStrictness: '标准',
  currentProjectId: null,
  aiProvider: 'none',
  aiEndpoint: '',
  aiKey: '',
  aiModel: '',
};

/** 全局设置（存 localStorage，小数据不进 IndexedDB） */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      update: (patch) => set(patch),
    }),
    {
      name: 'pixelflow-settings',
      partialize: (s): SettingsData => ({
        theme: s.theme,
        defaultAspectRatio: s.defaultAspectRatio,
        defaultStyle: s.defaultStyle,
        defaultTransition: s.defaultTransition,
        dailyQuota: s.dailyQuota,
        qcStrictness: s.qcStrictness,
        currentProjectId: s.currentProjectId,
        aiProvider: s.aiProvider,
        aiEndpoint: s.aiEndpoint,
        aiKey: s.aiKey,
        aiModel: s.aiModel,
      }),
    },
  ),
);
