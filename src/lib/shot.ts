import type { Shot, ShotStatus } from '../types/shot';
import { uid } from './utils';

/** 默认单镜时长 10 秒（项目可选 5 秒） */
export const SHOT_LENGTH_DEFAULT = 10;

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

/** 按目标时长和单镜时长估算分镜数量：60 秒 ÷ 10 秒 = 6 个 */
export function planShotCount(targetDuration: number, shotLength = SHOT_LENGTH_DEFAULT): number {
  return Math.max(1, Math.round(targetDuration / shotLength));
}

/**
 * 按故事自动算单镜时长：情节数 × 单镜时长 ≈ 目标时长。
 * 结果贴近 5 或 10 就吸附过去，其余收在 4–12 秒；拆不出情节时回退默认 10 秒。
 */
export function autoShotLength(story: string, targetDuration: number): number {
  const units = splitStoryUnits(story).length;
  if (units <= 0 || targetDuration <= 0) return SHOT_LENGTH_DEFAULT;
  const raw = targetDuration / units;
  for (const preset of [5, 10]) {
    if (Math.abs(raw - preset) <= 1.25) return preset;
  }
  return Math.min(12, Math.max(4, Math.round(raw)));
}

/** 重新按顺序编号并重算时间点：index 从 1 起，startTime = (index-1) × 单镜时长 */
export function recalcShots(shots: Shot[], shotLength = SHOT_LENGTH_DEFAULT): Shot[] {
  return shots.map((s, i) => ({ ...s, index: i + 1, startTime: i * shotLength }));
}

export interface ShotDraft {
  description: string;
  visualContent: string;
  camera: string;
  light: string;
  dialogue: string;
}

const STORY_BEATS = ['开端', '发展', '推进', '转折', '高潮', '收尾'];

/** 在标点处把长文本切成 ~size 字的段；完全无标点时超长硬切 */
function chunkAtPunctuation(text: string, size: number): string[] {
  const parts: string[] = [];
  let buf = '';
  for (const ch of text) {
    buf += ch;
    if (/[，,、。！？；;：\s]/.test(ch) && buf.length >= size) {
      parts.push(buf.trim());
      buf = '';
    } else if (buf.length >= size + 8) {
      // 一路没碰到标点：按长度硬切
      parts.push(buf.trim());
      buf = '';
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

/** 碎片判定：以逗号类标点结尾（句子未完）且去掉标点后少于 4 个字，如「清晨，」「深夜，」 */
function isFragment(clause: string): boolean {
  return /[，,、：:]$/.test(clause) && clause.replace(/[，,、：:。！？；;…\s]/g, '').length < 4;
}

/**
 * 把故事切成叙事单元（多级切分 + 碎片合并）：
 * ① 句子级（。！？；…）→ ② 每句再按逗号/顿号/冒号降到分句级 → ③ 不到 4 字的碎片并入下一分句
 * 保证「清晨，」这类时间词不会单独成镜，多句+逗号混合的故事每个情节都能拆出来。
 */
export function splitStoryUnits(story: string): string[] {
  const clean = story.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const sentences = clean
    .split(/(?<=[。！？!?；;…])\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  let units = sentences.flatMap((s) =>
    s
      .split(/(?<=[，,、：:])/)
      .map((t) => t.trim())
      .filter(Boolean),
  );
  if (units.length <= 1 && clean.length > 36) {
    units = chunkAtPunctuation(clean, 36);
  }
  // 碎片合并：碎片开头的分句并入下一条
  const merged: string[] = [];
  for (const u of units) {
    if (merged.length > 0 && isFragment(merged[merged.length - 1])) {
      merged[merged.length - 1] = merged[merged.length - 1] + u;
    } else {
      merged.push(u);
    }
  }
  // 结尾碎片并入前一条
  if (merged.length > 1 && isFragment(merged[merged.length - 1])) {
    const tail = merged.pop() as string;
    merged[merged.length - 1] += tail;
  }
  return merged.filter(Boolean);
}

/** 从情节文本里猜光线（对齐柑橘 6 镜提示词的光线写法） */
const LIGHT_HINTS: Array<[RegExp, string]> = [
  [/便利店|室内|店里|超市|货架/, '便利店暖白室内光'],
  [/日落|晚霞|黄昏|夕阳|落日|余晖|傍晚/, '日落暖橙色光'],
  [/雨|淋湿|伞/, '雨天柔和冷光'],
  [/深夜|凌晨|午夜|月光|夜里|黑夜/, '夜色冷蓝光'],
  [/雪/, '雪地反光明亮冷调'],
  [/清晨|早晨|早上|晨光/, '清晨柔光'],
  [/烛|炉火|篝火|火光/, '暖色火光'],
  [/面馆|食堂|蒸汽|热汤/, '暖黄室内灯光配蒸汽'],
];

export function lightFromText(text: string): string {
  for (const [re, light] of LIGHT_HINTS) {
    if (re.test(text)) return light;
  }
  return '';
}

/**
 * 一句话故事 → 分镜草稿。
 * 核心原则：有故事内容时，绝不为凑数生成空模板——
 * 叙事单元少于时长上限时，一段一个情节（短故事 6 条以内但条条有内容）；
 * 单元多于上限时按上限均匀分配。
 * 只有故事完全为空时才用节拍占位（且最多 6 条）。
 */
export function splitStoryToShots(
  story: string,
  targetDuration: number,
  shotLength = SHOT_LENGTH_DEFAULT,
): ShotDraft[] {
  const units = splitStoryUnits(story);
  const maxCount = planShotCount(targetDuration, shotLength);

  if (units.length === 0) {
    const count = Math.min(maxCount, 6);
    return Array.from({ length: count }, (_, i) => ({
      description: `${STORY_BEATS[i % STORY_BEATS.length]}：待补充`,
      visualContent: '画面待补充：写清楚场景、人物动作、出现什么。',
      camera: CAMERA_PRESETS[i % CAMERA_PRESETS.length],
      light: '',
      dialogue: '',
    }));
  }

  const count = Math.min(units.length, maxCount);
  const groups: string[][] = Array.from({ length: count }, () => []);
  units.forEach((u, i) => {
    const g = Math.min(count - 1, Math.floor((i * count) / units.length));
    groups[g].push(u);
  });

  return groups.map((sent, i) => {
    const description = sent.join('');
    return {
      description,
      visualContent: description,
      camera: CAMERA_PRESETS[i % CAMERA_PRESETS.length],
      light: lightFromText(description),
      dialogue: '',
    };
  });
}

/** 由草稿生成完整分镜记录（时间点按单镜时长算） */
export function draftToShot(
  projectId: string,
  draft: ShotDraft,
  index: number,
  shotLength = SHOT_LENGTH_DEFAULT,
): Shot {
  return {
    id: uid(),
    projectId,
    index,
    startTime: (index - 1) * shotLength,
    description: draft.description,
    visualContent: draft.visualContent,
    camera: draft.camera,
    light: draft.light,
    dialogue: draft.dialogue,
    characterIds: [],
    status: '待写',
    promptVersion: 0,
  };
}
