import { useProjectStore } from '../../store/projectStore';

/** 底部状态栏：数据库状态、数据量提示 */
export default function StatusBar() {
  const projectCount = useProjectStore((s) => s.projects.length);

  return (
    <footer className="hidden items-center gap-4 border-t border-zinc-200 px-4 py-1.5 text-[11px] text-zinc-500 dark:border-zinc-800 md:flex">
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        IndexedDB 已连接
      </span>
      <span>项目 {projectCount}</span>
      <span className="ml-auto">PixelFlow · 数据只存在你的浏览器里</span>
    </footer>
  );
}
