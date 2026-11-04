import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../store/projectStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useClipStore } from '../../store/clipStore';
import { clipsRepo } from '../../lib/db';
import { startOfToday } from '../../lib/utils';

/** 顶部栏：当前项目、今日配额、搜索、主题切换 */
export default function Topbar() {
  const projects = useProjectStore((s) => s.projects);
  const theme = useSettingsStore((s) => s.theme);
  const dailyQuota = useSettingsStore((s) => s.dailyQuota);
  const currentProjectId = useSettingsStore((s) => s.currentProjectId);
  const update = useSettingsStore((s) => s.update);
  const navigate = useNavigate();

  const [todayUsed, setTodayUsed] = useState(0);
  const refreshQuota = useCallback(async () => {
    const all = await clipsRepo.list();
    setTodayUsed(all.filter((c) => c.createdAt >= startOfToday()).length);
  }, []);

  useEffect(() => {
    void refreshQuota();
    const unsub = useClipStore.subscribe(() => void refreshQuota());
    return unsub;
  }, [refreshQuota]);

  const current = projects.find((p) => p.id === currentProjectId) ?? null;
  const quotaRatio = dailyQuota > 0 ? todayUsed / dailyQuota : 0;
  const quotaColor =
    quotaRatio >= 1 ? 'text-red-500' : quotaRatio >= 0.8 ? 'text-amber-500' : 'text-zinc-700 dark:text-zinc-300';

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white/90 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
      <select
        className="input max-w-[220px]"
        value={currentProjectId ?? ''}
        onChange={(e) => update({ currentProjectId: e.target.value || null })}
        aria-label="当前项目"
      >
        <option value="">未选择项目</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {current && (
        <Link
          to={`/projects/${current.id}`}
          className="hidden shrink-0 text-xs text-zinc-500 hover:text-indigo-500 lg:block"
        >
          {current.name} · 查看详情 →
        </Link>
      )}

      <div className="ml-auto hidden shrink-0 items-center gap-1.5 text-xs text-zinc-500 sm:flex">
        <span>今日配额</span>
        <span className={`font-mono ${quotaColor}`}>
          {todayUsed} / {dailyQuota}
        </span>
      </div>

      <input
        className="input hidden w-44 md:block"
        placeholder="搜索项目，回车跳转…"
        onKeyDown={(e) => {
          const q = e.currentTarget.value.trim();
          if (e.key === 'Enter' && q) {
            navigate(`/projects?q=${encodeURIComponent(q)}`);
            e.currentTarget.value = '';
          }
        }}
      />

      <button
        className="btn-ghost shrink-0 text-base"
        onClick={() => update({ theme: theme === 'dark' ? 'light' : 'dark' })}
        title={theme === 'dark' ? '切到亮色' : '切到暗色'}
      >
        {theme === 'dark' ? '🌙' : '☀️'}
      </button>
    </header>
  );
}
