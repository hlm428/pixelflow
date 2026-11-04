import type { Shot, ShotStatus } from '../types/shot';
import { uid } from './utils';

/** 每个分镜固定 10 秒 */
export const SHOT_LENGTH = 10;

/** 运镜预设（分镜表单 / 拆分镜时轮换用） */
export const CAMERA_PRESETS = [
  '推近',
  '拉远',
  '平移',
  '跟随',
  '环绕',
  '俯拍',
  '仰拍',
  '摇镜',
  '手持晃动',
  '定格',
];

/** 分镜状态徽章配色（6 种状态 6 种颜色） */
export const SHOT_STATUS_STYLE: Record<ShotStatus, string> = {
  待写: 'bg-zinc-500/15 text-zinc-500 dark:text-zinc-400',
  待生成: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  生成中: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  待质检: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  通过: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  失败: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

/** 时间轴分段用的实色底 */
export const SHOT_STATUS_BG: Record<ShotStatus, string> = {
  待写: 'bg-zinc-400 dark:bg-zinc-600',
  待生成: 'bg-sky-500',
  生成中: 'bg-amber-500',
  待质检: 'bg-violet-500',
  通过: 'bg-emerald-500',
  失败: 'bg-red-500',
};

/** 按目标时长估算分镜数量：60 秒 = 6 个 10 秒分镜 */
export function planShotCount(targetDuration: number): number {
  return Math.max(1, Math.round(targetDuration / SHOT_LENGTH));
}

/** 重新按顺序编号并重算时间点：index 从 1 起，startTime = (index-1) × 10 */
export function recalcShots(shots: Shot[]): Shot[] {
  return shots.map((s, i) => ({ ...s, index: i + 1, startTime: i * SHOT_LENGTH }));
}

export interface ShotDraft {
  description: string;
  visualContent: string;
  camera: string;
  dialogue: string;
}

const STORY_BEATS = ['开端', '发展', '推进', '转折', '高潮', '收尾'];

/**
 * 一句话故事 → N 个 10 秒分镜草稿（模板化拆分：句子均匀分配，不足的用节拍模板补）
 */
export function splitStoryToShots(story: string, targetDuration: number): ShotDraft[] {
  const count = planShotCount(targetDuration);
  const sentences = story
    .split(/(?<=[。！？!?；;])\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const drafts: ShotDraft[] = [];
  if (sentences.length === 0) {
    for (let i = 0; i < count; i++) {
      drafts.push({
        description: `第 ${i + 1} 幕（${STORY_BEATS[i % STORY_BEATS.length]}）`,
        visualContent: '画面待补充：写清楚场景、人物动作、出现什么。',
        camera: CAMERA_PRESETS[i % CAMERA_PRESETS.length],
        dialogue: '',
      });
    }
    return drafts;
  }

  // 均匀分配句子到 count 组
  const groups: string[][] = Array.from({ length: count }, () => []);
  sentences.forEach((s, i) => {
    const g = Math.min(count - 1, Math.floor((i * count) / sentences.length));
    groups[g].push(s);
  });

  groups.forEach((sent, i) => {
    const description = sent.length > 0 ? sent.join('') : `${STORY_BEATS[i % STORY_BEATS.length]}：待补充`;
    drafts.push({
      description,
      visualContent: sent.length > 0 ? `${description}\n（画面细节待补充）` : '画面待补充：写清楚场景、人物动作、出现什么。',
      camera: CAMERA_PRESETS[i % CAMERA_PRESETS.length],
      dialogue: '',
    });
  });
  return drafts;
}

/** 由草稿生成完整分镜记录（追加到末尾，时间点由 recalcShots 统一算） */
export function draftToShot(projectId: string, draft: ShotDraft, index: number): Shot {
  return {
    id: uid(),
    projectId,
    index,
    startTime: (index - 1) * SHOT_LENGTH,
    description: draft.description,
    visualContent: draft.visualContent,
    camera: draft.camera,
    dialogue: draft.dialogue,
    characterIds: [],
    status: '待写',
    promptVersion: 0,
  };
}
