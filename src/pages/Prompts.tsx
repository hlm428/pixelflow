import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { useSettingsStore } from '../store/settingsStore';
import { useToastStore } from '../store/toastStore';
import { useShotStore } from '../store/shotStore';
import { usePromptStore } from '../store/promptStore';
import { useTemplateStore } from '../store/templateStore';
import { SHOT_STATUS_STYLE } from '../lib/shot';
import PromptEditor from '../components/Prompt/PromptEditor';

/** 提示词页：左侧分镜选择（可多选批量生成），右侧编辑器 + 历史版本 */
export default function Prompts() {
  const currentProjectId = useSettingsStore((s) => s.currentProjectId);
  const projects = useProjectStore((s) => s.projects);
  const project = projects.find((p) => p.id === currentProjectId) ?? null;

  const shots = useShotStore((s) => s.shots);
  const loadShots = useShotStore((s) => s.load);
  const prompts = usePromptStore((s) => s.prompts);
  const loadPrompts = usePromptStore((s) => s.load);
  const generateMany = usePromptStore((s) => s.generateMany);
  const loadTemplates = useTemplateStore((s) => s.loadAll);
  const showToast = useToastStore((s) => s.show);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());
  const [batching, setBatching] = useState(false);

  useEffect(() => {
    if (!currentProjectId) return;
    void loadShots(currentProjectId);
    void loadPrompts(currentProjectId);
    void loadTemplates();
  }, [currentProjectId, loadShots, loadPrompts, loadTemplates]);

  // 生成的版本变化后同步列表（promptStore prompts 数组变化即重渲染）

  const latestVersionMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of prompts) {
      const cur = m.get(p.shotId) ?? 0;
      if (p.version > cur) m.set(p.shotId, p.version);
    }
    return m;
  }, [prompts]);

  if (!currentProjectId || !project) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <div className="text-4xl">✍️</div>
        <p className="mt-3 text-sm text-zinc-500">先在顶部选择一个项目。</p>
        <Link to="/projects" className="btn-primary mt-4 inline-flex">
          去项目页
        </Link>
      </div>
    );
  }

  const selectedShot = shots.find((s) => s.id === selectedId) ?? null;

  const toggleMulti = (id: string) => {
    setMultiSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchGenerate = async () => {
    const ids = [...multiSelected];
    if (ids.length === 0) return;
    setBatching(true);
    try {
      const ok = await generateMany(ids);
      showToast(`已为 ${ok} 个分镜生成提示词新版本`);
      setMultiSelected(new Set());
    } finally {
      setBatching(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2 p-4">
        <h1 className="text-lg font-semibold">提示词</h1>
        <span className="text-sm text-zinc-500">{project.name}</span>
        <span className="text-xs text-zinc-400">
          公式：角色卡原文 + 场景 + 风格 + 运镜 + 光线/补充 + 接力句
        </span>
        {multiSelected.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm">已选 {multiSelected.size} 个分镜</span>
            <button className="btn-ghost text-xs" onClick={() => setMultiSelected(new Set())}>
              清空
            </button>
            <button
              className="btn-primary"
              onClick={() => void handleBatchGenerate()}
              disabled={batching}
            >
              {batching ? '生成中…' : `⚡ 批量生成提示词（${multiSelected.size}）`}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
        {/* 分镜选择列表 */}
        <aside className="card max-h-[70vh] overflow-y-auto p-2">
          {shots.length === 0 ? (
            <p className="p-6 text-center text-sm text-zinc-500">
              还没有分镜 —— 先到「故事分镜」页拆分镜。
            </p>
          ) : (
            shots.map((s) => {
              const v = latestVersionMap.get(s.id) ?? 0;
              return (
                <div
                  key={s.id}
                  className={`mb-1.5 flex items-center gap-2 rounded-lg border p-2.5 transition-colors ${
                    s.id === selectedId
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-indigo-600"
                    checked={multiSelected.has(s.id)}
                    onChange={() => toggleMulti(s.id)}
                    title="勾选用于批量生成"
                  />
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setSelectedId(s.id)}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-sm font-bold text-indigo-500">
                        #{String(s.index).padStart(2, '0')}
                      </span>
                      <span className="truncate text-xs text-zinc-600 dark:text-zinc-300">
                        {s.description || '（无描述）'}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`badge ${SHOT_STATUS_STYLE[s.status]}`}>{s.status}</span>
                      <span className="font-mono text-[10px] text-zinc-400">
                        提示词 {v > 0 ? `v${v}` : '未生成'}
                      </span>
                    </div>
                  </button>
                </div>
              );
            })
          )}
        </aside>

        <PromptEditor shot={selectedShot} />
      </div>
    </div>
  );
}
