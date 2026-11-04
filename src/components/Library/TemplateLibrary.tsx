import { useEffect, useMemo, useState } from 'react';
import { useTemplateStore } from '../../store/templateStore';
import { TEMPLATE_CATEGORIES, type PromptTemplate } from '../../types/template';

/** 提示词模板库：五类全览、搜索、标签、收藏管理 */
export default function TemplateLibrary() {
  const templates = useTemplateStore((s) => s.templates);
  const loaded = useTemplateStore((s) => s.loaded);
  const loadAll = useTemplateStore((s) => s.loadAll);
  const search = useTemplateStore((s) => s.search);
  const toggleFavorite = useTemplateStore((s) => s.toggleFavorite);

  const [category, setCategory] = useState<'全部' | '收藏' | PromptTemplate['category']>('全部');
  const [kw, setKw] = useState('');

  useEffect(() => {
    if (!loaded) void loadAll();
  }, [loaded, loadAll]);

  const results = useMemo(() => search(category, kw), [templates, category, kw, search]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {(['全部', '收藏', ...TEMPLATE_CATEGORIES] as const).map((c) => (
          <button
            key={c}
            className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
              category === c
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
        <input
          className="input ml-auto max-w-xs"
          placeholder="搜词 / 说明 / 标签…"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
        />
        <span className="text-sm text-zinc-500">{results.length} 条</span>
      </div>

      {results.length === 0 ? (
        <p className="card p-8 text-center text-sm text-zinc-500">没有匹配的模板</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((t) => (
            <div key={t.id} className="card p-3.5">
              <div className="flex items-center gap-1.5">
                <span className="badge bg-indigo-500/10 text-[10px] text-indigo-600 dark:text-indigo-400">
                  {t.category}
                </span>
                <button
                  className="btn-ghost ml-auto px-1.5 py-0.5 text-base"
                  title={t.favorite ? '取消收藏' : '收藏'}
                  onClick={() => void toggleFavorite(t.id)}
                >
                  {t.favorite ? '⭐' : '☆'}
                </button>
              </div>
              <code className="mt-1 block break-all text-xs text-emerald-600 dark:text-emerald-400">{t.content}</code>
              <p className="mt-1.5 text-xs text-zinc-500">{t.description}</p>
              <p className="mt-0.5 text-[11px] text-zinc-400">场景：{t.scene}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {t.tags.map((tag) => (
                  <span key={tag} className="text-[10px] text-zinc-400">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
