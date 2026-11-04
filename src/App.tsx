import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Topbar from './components/Layout/Topbar';
import StatusBar from './components/Layout/StatusBar';
import MobileTabbar from './components/Layout/MobileTabbar';
import Toasts from './components/ui/Toasts';
import PageHelp from './components/ui/PageHelp';
import { useProjectStore } from './store/projectStore';
import { seedIfNeeded } from './lib/seed';

/** 全局壳：左导航 + 顶栏 + 主内容 + 状态栏，手机端导航变底部 tab */
export default function App() {
  useEffect(() => {
    void (async () => {
      await seedIfNeeded();
      await useProjectStore.getState().load();
    })();
  }, []);

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
