import { projectsRepo, shotsRepo, charactersRepo, promptsRepo, templatesRepo, clipsRepo, qcReportsRepo, dubbingsRepo } from './db';
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
    await insertSeedBundle();
  }

  if (existingTemplates.length === 0) {
    await templatesRepo.saveMany(SEED_TEMPLATES);
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SEED_FLAG, '1');
  }
}

async function insertSeedBundle(): Promise<void> {
  const bundle = buildSeedBundle();
  await projectsRepo.saveMany(bundle.projects);
  await charactersRepo.saveMany(bundle.characters);
  await shotsRepo.saveMany(bundle.shots);
  await promptsRepo.saveMany(bundle.prompts);
}

/** 级联删除一个项目的全部分镜相关数据（不依赖 store） */
async function cascadeDeleteProject(projectId: string): Promise<void> {
  const [shots, characters, clips, prompts, reports, dubbings] = await Promise.all([
    shotsRepo.listByProject(projectId),
    charactersRepo.listByProject(projectId),
    clipsRepo.listByProject(projectId),
    promptsRepo.listByProject(projectId),
    qcReportsRepo.listByProject(projectId),
    dubbingsRepo.listByProject(projectId),
  ]);
  await projectsRepo.delete(projectId);
  await Promise.all([
    shotsRepo.deleteMany(shots.map((s) => s.id)),
    charactersRepo.deleteMany(characters.map((c) => c.id)),
    clipsRepo.deleteMany(clips.map((c) => c.id)),
    promptsRepo.deleteMany(prompts.map((p) => p.id)),
    qcReportsRepo.deleteMany(reports.map((r) => r.id)),
    dubbingsRepo.deleteMany(dubbings.map((d) => d.id)),
  ]);
}

/** 恢复示例数据：同名示例项目整个删掉重灌（用户自建项目不受影响） */
export async function reseedDemoProjects(): Promise<number> {
  const bundle = buildSeedBundle();
  const existing = await projectsRepo.list();
  for (const seedProject of bundle.projects) {
    const match = existing.find((p) => p.name === seedProject.name);
    if (match) await cascadeDeleteProject(match.id);
  }
  await insertSeedBundle();
  return bundle.projects.length;
}
