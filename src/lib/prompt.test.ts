import { describe, expect, it } from 'vitest';
import { buildPrompt, characterBlock, diffLines, relaySentence, resolveCards } from './prompt';
import type { CharacterCard } from '../types/character';
import type { Project } from '../types/project';

function card(overrides: Partial<CharacterCard> = {}): CharacterCard {
  return {
    id: 'c1',
    projectId: 'p1',
    name: '小满',
    era: '现代',
    face: '鹅蛋脸',
    eyes: '紫色眼瞳',
    hair: '黑色齐耳短发',
    clothing: '深蓝水手校服，红色格子围巾',
    personality: '安静温柔',
    voice: '日语 TTS',
    notes: '道具：粉色长柄伞',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

const project: Project = {
  id: 'p1',
  name: '柑橘味的夏天',
  theme: '双女主百合',
  oneLineStory: '雨天分伞',
  targetDuration: 60,
  aspectRatio: '16:9',
  style: '动漫',
  activeEra: '现代',
  status: '制作中',
  createdAt: 0,
  updatedAt: 0,
};

describe('relaySentence 接力句', () => {
  it('第 1 个分镜没有接力句', () => {
    expect(relaySentence(1)).toBe('');
  });

  it('第 2 个分镜起带接力句（标上一镜编号，中英双语）', () => {
    const s = relaySentence(2);
    expect(s).toContain('承接上一个分镜（#1）的尾帧');
    expect(s).toContain('连续');
    expect(s).toContain('Continue from the tail frame of shot #1');
  });

  it('第 10 个分镜也有接力句', () => {
    expect(relaySentence(10)).not.toBe('');
  });
});

describe('characterBlock 角色卡原文', () => {
  it('无角色时返回空串', () => {
    expect(characterBlock([])).toBe('');
  });

  it('原文照搬：脸/眼/发/衣服一字不改', () => {
    const block = characterBlock([card()]);
    expect(block).toContain('小满');
    expect(block).toContain('鹅蛋脸');
    expect(block).toContain('紫色眼瞳');
    expect(block).toContain('黑色齐耳短发');
    expect(block).toContain('深蓝水手校服，红色格子围巾');
  });

  it('多角色各占一行', () => {
    const block = characterBlock([card(), card({ id: 'c2', name: '小雪' })]);
    expect(block.split('\n').length).toBe(2);
  });
});

describe('resolveCards 时代解析', () => {
  it('同名存在当前时代版本时自动换卡', () => {
    const cards = [
      card({ id: 'c-ancient', name: '小满', era: '古代' }),
      card({ id: 'c-modern', name: '小满', era: '现代' }),
    ];
    const resolved = resolveCards(cards, ['c-ancient'], '现代');
    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe('c-modern');
  });

  it('没有当前时代版本时回退到原卡', () => {
    const cards = [card({ id: 'c-ancient', name: '小满', era: '古代' })];
    const resolved = resolveCards(cards, ['c-ancient'], '未来');
    expect(resolved[0].id).toBe('c-ancient');
  });

  it('引用不存在的卡直接跳过', () => {
    expect(resolveCards([card()], ['ghost'], '现代')).toHaveLength(0);
  });
});

describe('buildPrompt 生成公式', () => {
  it('完整公式：角色卡+视觉锁定+场景+运镜+光线+接力句（第 2 镜）', () => {
    const content = buildPrompt({
      project,
      shotIndex: 2,
      visualContent: '两人共伞走过商店街',
      camera: '跟随',
      light: '雨天柔和冷光',
      characterCards: [card()],
    });
    expect(content).toContain('【人物锁定·小满】');
    expect(content).toContain('【视觉锁定】Japanese anime film style');
    expect(content).toContain('【场景】两人共伞走过商店街');
    expect(content).toContain('【运镜】跟随');
    expect(content).toContain('【光线】雨天柔和冷光');
    expect(content).toContain('【接力】');
  });

  it('第 1 镜不含接力段', () => {
    const content = buildPrompt({
      project,
      shotIndex: 1,
      visualContent: '雨夜校门',
      camera: '推近',
      characterCards: [card()],
    });
    expect(content).not.toContain('【接力】');
  });

  it('包含视觉锁定（英文硬规则：no readable text）', () => {
    const content = buildPrompt({
      project,
      shotIndex: 1,
      visualContent: 'x',
      camera: '',
      characterCards: [],
    });
    expect(content).toContain('no readable text anywhere in frame');
    expect(content).toContain('same light source and same color temperature');
  });

  it('光线：没填时给风格默认光线段', () => {
    const content = buildPrompt({
      project,
      shotIndex: 1,
      visualContent: 'x',
      camera: '',
      characterCards: [],
    });
    expect(content).toContain('【光线】');
  });

  it('光线：自定义光线原样带入', () => {
    const content = buildPrompt({
      project,
      shotIndex: 1,
      visualContent: 'x',
      camera: '',
      light: '雨夜霓虹湿路反光',
      characterCards: [],
    });
    expect(content).toContain('【光线】雨夜霓虹湿路反光');
  });

  it('光线兜底链：画面是便利店 → 便利店暖白光（不套风格暖光默认）', () => {
    const content = buildPrompt({
      project,
      shotIndex: 1,
      visualContent: '便利店冷白灯光下，小雪从冰柜拿出两瓶橘子汽水',
      camera: '',
      characterCards: [],
    });
    expect(content).toContain('【光线】便利店暖白室内光');
  });

  it('光线兜底链：雨夜画面 → 冷光', () => {
    const content = buildPrompt({
      project,
      shotIndex: 1,
      visualContent: '雨夜校门口，短发女生撑伞站着',
      camera: '',
      characterCards: [],
    });
    expect(content).toContain('【光线】雨天柔和冷光');
  });

  it('接力句中英双语并标上一镜编号', () => {
    const content = buildPrompt({
      project,
      shotIndex: 3,
      visualContent: 'x',
      camera: '',
      characterCards: [],
    });
    expect(content).toContain('承接上一个分镜（#2）的尾帧');
    expect(content).toContain('Continue from the tail frame of shot #2');
  });

  it('extraWords 会作为【补充】段插入', () => {
    const content = buildPrompt({
      project,
      shotIndex: 1,
      visualContent: 'x',
      camera: '',
      characterCards: [],
      extraWords: 'rainy night neon reflections',
    });
    expect(content).toContain('【补充】rainy night neon reflections');
  });

  it('空画面内容不生成空【场景】段', () => {
    const content = buildPrompt({ project, shotIndex: 1, visualContent: '  ', camera: '', characterCards: [] });
    expect(content).not.toContain('【场景】');
  });
});

describe('diffLines 行级 diff', () => {
  it('完全相同 → 全是 same', () => {
    const d = diffLines('a\nb\nc', 'a\nb\nc');
    expect(d.every((l) => l.type === 'same')).toBe(true);
  });

  it('改一行 → 一删一增', () => {
    const d = diffLines('a\nold\nc', 'a\nnew\nc');
    expect(d.filter((l) => l.type === 'del').map((l) => l.text)).toEqual(['old']);
    expect(d.filter((l) => l.type === 'add').map((l) => l.text)).toEqual(['new']);
  });

  it('空串到多行 → 全部 add', () => {
    const d = diffLines('', 'a\nb');
    expect(d.filter((l) => l.type === 'add')).toHaveLength(2);
  });

  it('删掉尾部行 → del', () => {
    const d = diffLines('a\nb\nc', 'a\nb');
    expect(d.filter((l) => l.type === 'del').map((l) => l.text)).toEqual(['c']);
  });
});
