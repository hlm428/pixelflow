import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';

/** 左侧固定导航（220px），手机端隐藏、由 MobileTabbar 接管 */
export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:flex">
      <div className="flex h-14 items-center gap-2.5 border-b border-zinc-200 px-4 dark:border-zinc-800">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm text-white">
          ▶
        </span>
        <div>
          <div className="text-sm font-bold leading-tight">PixelFlow</div>
          <div className="text-[10px] text-zinc-500">AI 视频工作台</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-500/10 font-medium text-indigo-600 dark:text-indigo-400'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`
            }
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-zinc-200 p-3 text-[11px] leading-relaxed text-zinc-500 dark:border-zinc-800">
        本地运行 · 数据存 IndexedDB
        <br />
        不联网 · 不上传
      </div>
    </aside>
  );
}
