import { projectsRepo, shotsRepo, charactersRepo, promptsRepo, templatesRepo } from './db';
import { buildSeedBundle } from '../data/seedProjects';
import { SEED_TEMPLATES } from '../data/templates';

const SEED_FLAG = 'pixelflow-seeded-v2';

/** 首次启动：库为空时灌入 5 个示例项目 + 模板种子（只跑一次） */
export async function seedIfNeeded(): Promise<void> {
  if (typeof localStorage !== 'undefined' && localStorage.getItem(SEED_FLAG) === '1') return;

  const [existingProjects, existingTemplates] = await Promise.all([
    projectsRepo.list(),
    templatesRepo.list(),
  ]);

  if (existingProjects.length === 0) {
    const bundle = buildSeedBundle();
    await projectsRepo.saveMany(bundle.projects);
    await charactersRepo.saveMany(bundle.characters);
    await shotsRepo.saveMany(bundle.shots);
    await promptsRepo.saveMany(bundle.prompts);
  }

  if (existingTemplates.length === 0) {
    await templatesRepo.saveMany(SEED_TEMPLATES);
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SEED_FLAG, '1');
  }
}
