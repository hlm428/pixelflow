import type { Project, ProjectStyle, CharacterEra } from '../types/project';
import type { CharacterCard } from '../types/character';

/** 视觉锁定（每条提示词都带，保证画风统一 —— 源自风格圣经） */
export const VISUAL_BIBLE =
  '同一光源同一色温，柔和暖光，真实质感不塑料，表情自然，画面内不出现任何文字或水印';

/** 项目风格 → 风格词 */
export const STYLE_WORDS: Record<ProjectStyle, string> = {
  动漫: 'anime movie style, cinematic anime',
  写实: 'photorealistic, live action film',
  赛璐璐: 'cel shading, flat colors, clean fine lineart',
  电影感: 'cinematic film look, shallow depth of field, film grain',
  吉卜力风: 'ghibli style, hand-drawn warmth, soft watercolor background',
};

/** 接力规则：从第 2 个分镜开始承接上一分镜尾帧 */
export function relaySentence(shotIndex: number): string {
  return shotIndex >= 2 ? '承接上一个分镜的尾帧，动作和位置连续，镜头之间不断档。' : '';
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
  characterCards: CharacterCard[]; /** 已按时代解析好 */
  extraWords?: string; /** 用户从模板库插入的额外词 */
}

/**
 * 提示词生成公式：
 * 角色卡（原文） + 场景描述 + 风格词 + 运镜词 + 额外词 + 接力句
 */
export function buildPrompt(input: BuildPromptInput): string {
  const parts: string[] = [];
  const cb = characterBlock(input.characterCards);
  if (cb) parts.push(cb);
  if (input.visualContent.trim()) parts.push(`【场景】${input.visualContent.trim()}`);
  parts.push(`【风格】${STYLE_WORDS[input.project.style]}，${VISUAL_BIBLE}`);
  if (input.camera.trim()) parts.push(`【运镜】${input.camera.trim()}`);
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
