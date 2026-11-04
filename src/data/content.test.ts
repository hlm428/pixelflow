import { describe, expect, it } from 'vitest';
import { SEED_TEMPLATES } from '../data/templates';
import { SEED_PROJECTS, buildSeedBundle } from '../data/seedProjects';
import { SEED_TTS_PROVIDERS } from '../data/ttsProviders';
import { FAQ, HELP_SECTIONS, PAGE_HELP } from '../data/helpContent';

describe('内置内容数量达标（任务书交付标准）', () => {
  it('模板库 = 260 条：风格 100 + 运镜 50 + 光线 40 + 情绪 30 + 场景 40', () => {
    expect(SEED_TEMPLATES).toHaveLength(260);
    const by = (cat: string) => SEED_TEMPLATES.filter((t) => t.category === cat).length;
    expect(by('风格词')).toBe(100);
    expect(by('运镜词')).toBe(50);
    expect(by('光线词')).toBe(40);
    expect(by('情绪词')).toBe(30);
    expect(by('场景词')).toBe(40);
    // 每条都有中文说明和场景
    expect(SEED_TEMPLATES.every((t) => t.description.length > 0 && t.scene.length > 0)).toBe(true);
    // id 无重复
    expect(new Set(SEED_TEMPLATES.map((t) => t.id)).size).toBe(260);
  });

  it('示例项目 5 个、共 63 个分镜（6+12+10+15+20），每镜都有画面内容', () => {
    expect(SEED_PROJECTS).toHaveLength(5);
    const counts = SEED_PROJECTS.map((p) => p.shots.length);
    expect(counts).toEqual([6, 12, 10, 15, 20]);
    expect(SEED_PROJECTS.every((p) => p.characters.length > 0 && p.story.length > 10)).toBe(true);
    expect(SEED_PROJECTS.every((p) => p.shots.every((s) => s.visual.length > 10 && s.camera !== ''))).toBe(true);
  });

  it('种子打包后每镜都带 v1 提示词（63 条）且含接力句（第 2 镜起）', () => {
    const bundle = buildSeedBundle();
    expect(bundle.projects).toHaveLength(5);
    expect(bundle.shots).toHaveLength(63);
    expect(bundle.prompts).toHaveLength(63);
    expect(bundle.shots.every((s) => s.promptVersion === 1)).toBe(true);
    const shot2 = bundle.shots.find((s) => s.index === 2)!;
    const prompt2 = bundle.prompts.find((p) => p.shotId === shot2.id)!;
    expect(prompt2.content).toContain('【接力】');
  });

  it('TTS 供应商 15 家，资料齐全', () => {
    expect(SEED_TTS_PROVIDERS).toHaveLength(15);
    expect(
      SEED_TTS_PROVIDERS.every(
        (p) => p.name && p.website && p.freeQuota && p.endpoint && p.bestFor && p.pros && p.cons,
      ),
    ).toBe(true);
  });

  it('FAQ 30 条；每页帮助文案 ≥ 200 字；帮助有 5 个章节', () => {
    expect(FAQ).toHaveLength(30);
    expect(HELP_SECTIONS).toHaveLength(5);
    expect(FAQ.every((f) => f.q && f.a.length > 20)).toBe(true);
    const shortPages = Object.entries(PAGE_HELP).filter(([k, v]) => k !== '/help' && v.text.length < 200);
    expect(shortPages).toEqual([]);
  });
});
