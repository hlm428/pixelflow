import type { Project, ProjectStyle, CharacterEra } from '../types/project';
import type { CharacterCard } from '../types/character';
import { lightFromText } from './shot';

/** 视觉锁定硬规则（英文，源自风格圣经，逐字带入每条提示词） */
export const VISUAL_RULES_EN =
  'same light source and same color temperature throughout, realistic texture without over-smoothing, relaxed natural expressions, no posing, no subtitles, no watermark, no readable text anywhere in frame';

/** 项目风格 → 风格锁定（英文完整句，给视频模型） */
export const STYLE_WORDS: Record<ProjectStyle, string> = {
  动漫: 'Japanese anime film style, cinematic anime photography, 16:9 cinematic framing',
  写实: 'photorealistic live-action film style, natural skin texture without over-smoothing',
  赛璐璐: 'cel-shaded anime style, flat colors, clean fine lineart, anime series look',
  电影感: 'cinematic live-action style, shallow depth of field, subtle film grain',
  吉卜力风: 'hand-drawn anime style, warm watercolor backgrounds, ghibli-inspired warmth',
};

/** 没填光线时的兜底：先从画面文本猜（便利店→暖白光、雨→冷光），猜不出再按风格给中性默认 */
export function defaultLightFor(style: ProjectStyle, visualContent = ''): string {
  const guessed = lightFromText(visualContent);
  if (guessed) return guessed;
  const map: Record<ProjectStyle, string> = {
    动漫: '柔和均匀的光，画面干净透亮',
    写实: '自然环境光，真实色温',
    赛璐璐: '平光为主，色块干净',
    电影感: '电影级柔主光，暗部有层次',
    吉卜力风: '手绘感阳光，柔和高光',
  };
  return map[style];
}

/** 接力规则：从第 2 个分镜开始承接上一分镜尾帧（中文 + 英文） */
export function relaySentence(shotIndex: number): string {
  return shotIndex >= 2
    ? `承接上一个分镜（#${shotIndex - 1}）的尾帧，动作和位置连续，镜头之间不断档。Continue from the tail frame of shot #${shotIndex - 1}, keep actions and positions continuous.`
    : '';
}

/** 角色卡原文块：原文照搬拼进提示词前面（一个字不改） */
export function characterBlock(cards: CharacterCard[]): string {
  if (cards.length === 0) return '';
  return cards
    .map(
      (c) =>
        `【人物锁定·${c.name}】脸型：${c.face || '未填'}；眼睛：${c.eyes || '未填'}；头发：${
          c.hair || '未填'
        }；衣服：${c.clothing || '未填'}。`,
    )
    .join('\n');
}

/**
 * 时代解析：分镜引用的角色卡，如果同名存在项目当前时代的版本，就用那个时代的卡
 * （这就是"切换时代时提示词自动换卡"的实现）
 */
export function resolveCards(
  cards: CharacterCard[],
  shotCharacterIds: string[],
  activeEra: CharacterEra,
): CharacterCard[] {
  return shotCharacterIds
    .map((id) => {
      const direct = cards.find((c) => c.id === id);
      if (!direct) return null;
      const eraCard = cards.find((c) => c.name === direct.name && c.era === activeEra);
      return eraCard ?? direct;
    })
    .filter((c): c is CharacterCard => c !== null);
}

export interface BuildPromptInput {
  project: Project;
  shotIndex: number; /** 分镜编号（1 起），决定接力句 */
  visualContent: string; /** 画面内容（场景描述） */
  camera: string;
  light?: string; /** 光线（空则按风格给默认） */
  characterCards: CharacterCard[]; /** 已按时代解析好 */
  extraWords?: string; /** 用户从模板库插入的额外词 */
}

/**
 * 提示词生成公式（对齐《柑橘味的夏天-6镜提示词》规格）：
 * 角色卡（原文） + 视觉锁定（英文） + 场景描述 + 运镜 + 光线 + 额外词 + 接力句
 */
export function buildPrompt(input: BuildPromptInput): string {
  const parts: string[] = [];
  const cb = characterBlock(input.characterCards);
  if (cb) parts.push(cb);
  parts.push(`【视觉锁定】${STYLE_WORDS[input.project.style]}, ${VISUAL_RULES_EN}`);
  if (input.visualContent.trim()) parts.push(`【场景】${input.visualContent.trim()}`);
  if (input.camera.trim()) parts.push(`【运镜】${input.camera.trim()}`);
  const light =
    (input.light && input.light.trim()) || defaultLightFor(input.project.style, input.visualContent);
  if (light) parts.push(`【光线】${light}`);
  if (input.extraWords && input.extraWords.trim()) parts.push(`【补充】${input.extraWords.trim()}`);
  const relay = relaySentence(input.shotIndex);
  if (relay) parts.push(`【接力】${relay}`);
  return parts.join('\n');
}

export interface DiffLine {
  type: 'same' | 'add' | 'del';
  text: string;
}

/** 行级 diff（LCS），提示词两版本对比用 */
export function diffLines(a: string, b: string): DiffLine[] {
  const A = a.split('\n');
  const B = b.split('\n');
  const n = A.length;
  const m = B.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      out.push({ type: 'same', text: A[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'del', text: A[i] });
      i++;
    } else {
      out.push({ type: 'add', text: B[j] });
      j++;
    }
  }
  while (i < n) {
    out.push({ type: 'del', text: A[i] });
    i++;
  }
  while (j < m) {
    out.push({ type: 'add', text: B[j] });
    j++;
  }
  return out;
}
