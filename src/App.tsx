import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Topbar from './components/Layout/Topbar';
import StatusBar from './components/Layout/StatusBar';
import MobileTabbar from './components/Layout/MobileTabbar';
import Toasts from './components/ui/Toasts';
import PageHelp from './components/ui/PageHelp';
import { useProjectStore } from './store/projectStore';
import { seedIfNeeded } from './lib/seed';

/**
 * 全局壳：左导航 + 顶栏 + 主内容 + 状态栏，手机端导航变底部 tab。
 * 数据就绪前只渲染启动屏——避免首次迁移时页面边渲染边换数据（React #310 的根源）。
 */
export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      await seedIfNeeded();
      await useProjectStore.getState().load();
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-100 dark:bg-zinc-950">
        <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-xl text-white">
          ▶
        </span>
        <p className="text-sm text-zinc-500">正在准备数据（首次打开会灌入示例项目）…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <MobileTabbar />
      <div className="flex min-h-screen flex-col md:pl-[220px]">
        <Topbar />
        <main className="flex-1 px-4 pb-24 pt-5 md:pb-8">
          <Outlet />
        </main>
        <StatusBar />
      </div>
      <Toasts />
      <PageHelp />
    </div>
  );
}
