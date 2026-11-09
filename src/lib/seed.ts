import { projectsRepo, shotsRepo, charactersRepo, promptsRepo, templatesRepo, clipsRepo, qcReportsRepo, dubbingsRepo, musicsRepo } from './db';
import { buildSeedBundle } from '../data/seedProjects';
import { SEED_TEMPLATES } from '../data/templates';
import { buildBuiltinMusics } from './bgm';

/** 种子数据版本：版本变化时自动把同名示例项目重灌成新格式（用户自建项目不动） */
const SEED_FLAG = 'pixelflow-seeded';
const SEED_VERSION = '5';

/** 历史版本里用过后来改掉的示例项目名：重灌时一并清掉，避免改名后旧名字残留 */
const LEGACY_SEED_NAMES = ['重生之我在月见公寓当房东'];

/** 首次启动或种子版本升级：灌入/重灌 5 个示例项目 + 模板种子 */
export async function seedIfNeeded(): Promise<void> {
  const current =
    typeof localStorage !== 'undefined' ? localStorage.getItem(SEED_FLAG) : null;
  if (current === SEED_VERSION) return;

  const [existingProjects, existingTemplates] = await Promise.all([
    projectsRepo.list(),
    templatesRepo.list(),
  ]);

  if (existingProjects.length === 0) {
    await insertSeedBundle();
  } else {
    // 老数据升级：同名示例项目整个换成新格式（分镜带光线、提示词带编号接力）
    await reseedDemoProjects();
  }

  if (existingTemplates.length === 0) {
    await templatesRepo.saveMany(SEED_TEMPLATES);
  }

  // 音乐库为空时灌入内置 BGM（程序化生成的免授权曲子）
  if ((await musicsRepo.count()) === 0) {
    await musicsRepo.saveMany(buildBuiltinMusics());
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SEED_FLAG, SEED_VERSION);
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

/** 恢复示例数据：同名（含历史旧名）示例项目整个删掉重灌（用户自建项目不受影响） */
export async function reseedDemoProjects(): Promise<number> {
  const bundle = buildSeedBundle();
  const existing = await projectsRepo.list();
  const seedNames = [...bundle.projects.map((p) => p.name), ...LEGACY_SEED_NAMES];
  for (const p of existing) {
    if (seedNames.includes(p.name)) await cascadeDeleteProject(p.id);
  }
  await insertSeedBundle();
  return bundle.projects.length;
}
