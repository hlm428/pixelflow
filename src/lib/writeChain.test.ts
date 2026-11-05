/**
 * 写入链路集成测试：用 fake-indexeddb 跑真实的 store 写入流程。
 * 对应复测报告「写入功能全坏了」——这条测试保证：建项目 / 改项目 / 拆分镜 / 生成提示词 / 建片段
 * 五条写入链路在真实 IndexedDB 语义下端到端可用。
 */
/** @vitest-environment jsdom */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAllData } from './db';
import { seedIfNeeded } from './seed';
import { splitStoryToShots } from './shot';
import { useProjectStore } from '../store/projectStore';
import { useShotStore } from '../store/shotStore';
import { usePromptStore } from '../store/promptStore';
import { useClipStore } from '../store/clipStore';

describe('写入链路端到端（fake-indexeddb）', () => {
  beforeEach(async () => {
    await clearAllData();
    useProjectStore.setState({ projects: [], loaded: false });
    useShotStore.setState({ shots: [], loadedProjectId: null });
    usePromptStore.setState({ prompts: [], loadedProjectId: null });
    useClipStore.setState({ clips: [], loadedProjectId: null });
  });

  it('建项目 → 改项目 → 刷新后还在', async () => {
    await useProjectStore.getState().load();
    const p = await useProjectStore.getState().create({
      name: '写入链路测试',
      theme: '回归测试',
      oneLineStory: '',
      targetDuration: 60,
      aspectRatio: '16:9',
      style: '动漫',
    });
    expect(p.id).toBeTruthy();
    await useProjectStore.getState().update(p.id, { name: '改名后的项目' });
    // 模拟刷新：重新从库加载
    useProjectStore.setState({ projects: [] });
    await useProjectStore.getState().load();
    const found = useProjectStore.getState().projects.find((x) => x.id === p.id);
    expect(found?.name).toBe('改名后的项目');
  });

  it('拆分镜 → 3 条有内容的分镜落库 → 重新加载还在', async () => {
    await useProjectStore.getState().load();
    const p = await useProjectStore.getState().create({
      name: '拆分镜链路',
      theme: '',
      oneLineStory: '雨中分伞。便利店买汽水。河边碰杯。',
      targetDuration: 60,
      aspectRatio: '16:9',
      style: '动漫',
    });
    await useShotStore.getState().load(p.id);
    const drafts = splitStoryToShots('雨中分伞。便利店买汽水。河边碰杯。', 60);
    await useShotStore.getState().replaceAllWithDrafts(p.id, drafts);
    expect(useShotStore.getState().shots).toHaveLength(3);
    expect(useShotStore.getState().shots.every((s) => s.description.includes('。'))).toBe(true);
    // 模拟刷新
    useShotStore.setState({ shots: [] });
    await useShotStore.getState().load(p.id);
    expect(useShotStore.getState().shots).toHaveLength(3);
  });

  it('新增分镜 → 保存 → 列表里能看到', async () => {
    await useProjectStore.getState().load();
    const p = await useProjectStore.getState().create({
      name: '新增分镜链路',
      theme: '',
      oneLineStory: '',
      targetDuration: 60,
      aspectRatio: '16:9',
      style: '动漫',
    });
    await useShotStore.getState().load(p.id);
    const created = await useShotStore.getState().create(p.id, {
      description: '手动加的分镜',
      visualContent: '画面',
      camera: '推近',
    });
    expect(useShotStore.getState().shots.map((s) => s.description)).toContain('手动加的分镜');
    // 模拟刷新
    useShotStore.setState({ shots: [] });
    await useShotStore.getState().load(p.id);
    expect(useShotStore.getState().shots.find((s) => s.id === created.id)?.description).toBe('手动加的分镜');
  });

  it('拆分镜 → 自动生成提示词 → 每条分镜有 v1 提示词', async () => {
    await useProjectStore.getState().load();
    const p = await useProjectStore.getState().create({
      name: '提示词链路',
      theme: '',
      oneLineStory: '',
      targetDuration: 60,
      aspectRatio: '16:9',
      style: '动漫',
    });
    await useShotStore.getState().load(p.id);
    await useShotStore.getState().replaceAllWithDrafts(
      p.id,
      splitStoryToShots('雨中分伞。便利店买汽水。河边碰杯。', 60),
    );
    await usePromptStore.getState().load(p.id);
    const ok = await usePromptStore.getState().generateMany(useShotStore.getState().shots.map((s) => s.id));
    expect(ok).toBe(3);
    expect(useShotStore.getState().shots.every((s) => s.promptVersion === 1)).toBe(true);
    expect(useShotStore.getState().shots.every((s) => s.status === '待生成')).toBe(true);
    for (const s of useShotStore.getState().shots) {
      const versions = usePromptStore.getState().byShot(s.id);
      expect(versions).toHaveLength(1);
      expect(versions[0].content).toContain('【场景】');
      expect(versions[0].content).toContain('anime film style');
    }
  });

  it('上传片段（建片段记录）→ 待质检 → 刷新后还在', async () => {
    await useProjectStore.getState().load();
    const p = await useProjectStore.getState().create({
      name: '片段链路',
      theme: '',
      oneLineStory: '',
      targetDuration: 60,
      aspectRatio: '16:9',
      style: '动漫',
    });
    await useShotStore.getState().load(p.id);
    await useShotStore.getState().replaceAllWithDrafts(p.id, splitStoryToShots('第一幕。', 60));
    await useClipStore.getState().load(p.id);
    const clip = await useClipStore.getState().create(
      p.id,
      useShotStore.getState().shots[0].id,
      {
        fileName: 'test-clip.mp4',
        duration: 10,
        width: 1280,
        height: 720,
        fps: 24,
        fileSize: 2048,
        model: 'Muse',
        promptVersion: 0,
      },
      { width: 1280, height: 720 },
    );
    expect(clip.status).toBe('待质检');
    expect(clip.score).toBe(100);
    useClipStore.setState({ clips: [] });
    await useClipStore.getState().load(p.id);
    expect(useClipStore.getState().clips.find((c) => c.id === clip.id)?.fileName).toBe('test-clip.mp4');
  });

  it('首次启动播种：5 个示例项目 + 63 分镜，且不重复播种', async () => {
    await seedIfNeeded();
    await useProjectStore.getState().load();
    expect(useProjectStore.getState().projects).toHaveLength(5);
    const citrus = useProjectStore.getState().projects.find((p) => p.name === '柑橘味的夏天');
    expect(citrus).toBeTruthy();
    await useShotStore.getState().load(citrus!.id);
    expect(useShotStore.getState().shots).toHaveLength(6);
    // 再次运行不重复
    await seedIfNeeded();
    await useProjectStore.getState().load();
    expect(useProjectStore.getState().projects).toHaveLength(5);
  });
});
