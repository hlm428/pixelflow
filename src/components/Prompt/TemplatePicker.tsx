import { useEffect, useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import { useTemplateStore } from '../../store/templateStore';
import { TEMPLATE_CATEGORIES, type PromptTemplate } from '../../types/template';

type CategoryFilter = '全部' | '收藏' | PromptTemplate['category'];

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  onInsert: (content: string) => void;
}

/** 模板库选择器：分三类+情绪/场景，可搜索、可收藏、点一下插入 */
export default function TemplatePicker({ open, onClose, onInsert }: TemplatePickerProps) {
  const templates = useTemplateStore((s) => s.templates);
  const loaded = useTemplateStore((s) => s.loaded);
  const loadAll = useTemplateStore((s) => s.loadAll);
  const search = useTemplateStore((s) => s.search);
  const toggleFavorite = useTemplateStore((s) => s.toggleFavorite);
  const [category, setCategory] = useState<CategoryFilter>('全部');
  const [kw, setKw] = useState('');

  useEffect(() => {
    if (open && !loaded) void loadAll();
  }, [open, loaded, loadAll]);

  const results = useMemo(() => search(category, kw), [templates, category, kw, search]);

  const tabs: CategoryFilter[] = ['全部', '收藏', ...TEMPLATE_CATEGORIES];

  return (
    <Modal open={open} title="提示词模板库" onClose={onClose} wide>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {tabs.map((t) => (
          <button
            key={t}
            className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
              category === t
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}
            onClick={() => setCategory(t)}
          >
            {t}
          </button>
        ))}
        <input
          className="input ml-auto w-44"
          placeholder="搜索词 / 说明 / 标签…"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
        />
      </div>

      <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
        {results.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">没有匹配的模板</p>
        ) : (
          results.map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-2 rounded-lg border border-zinc-200 p-2.5 dark:border-zinc-800"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="badge bg-indigo-500/10 text-[10px] text-indigo-600 dark:text-indigo-400">
                    {t.category}
                  </span>
                  <code className="break-all text-xs text-emerald-600 dark:text-emerald-400">{t.content}</code>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {t.description} · {t.scene}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {t.tags.map((tag) => (
                    <span key={tag} className="text-[10px] text-zinc-400">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  className="btn-ghost px-2 py-1 text-base"
                  title={t.favorite ? '取消收藏' : '收藏'}
                  onClick={() => void toggleFavorite(t.id)}
                >
                  {t.favorite ? '⭐' : '☆'}
                </button>
                <button
                  className="btn-primary px-2 py-1 text-xs"
                  onClick={() => onInsert(t.content)}
                >
                  插入
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <p className="mt-2 text-[11px] text-zinc-400">
        模板全量库（260 条）在 M14 填充；当前库共 {templates.length} 条。
      </p>
    </Modal>
  );
}
