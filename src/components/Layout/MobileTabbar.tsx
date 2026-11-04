import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';

/** 手机端底部导航：横向可滚动，按钮高度 ≥ 44px */
export default function MobileTabbar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex gap-1 overflow-x-auto border-t border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-900 md:hidden">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex min-h-[44px] min-w-[64px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[10px] ${
              isActive
                ? 'bg-indigo-500/10 font-medium text-indigo-600 dark:text-indigo-400'
                : 'text-zinc-500'
            }`
          }
        >
          <span className="text-lg leading-none">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
