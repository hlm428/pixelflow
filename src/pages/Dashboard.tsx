import { useEffect, useState } from 'react';
import { projectsRepo, shotsRepo, clipsRepo, qcReportsRepo } from '../lib/db';
import { useSettingsStore } from '../store/settingsStore';
import type { Clip } from '../types/clip';
import type { QCReport } from '../types/qc';
import type { Project } from '../types/project';
import type { Shot } from '../types/shot';
import DashboardContent from '../components/Dashboard/DashboardContent';

/** 数据看板页 */
export default function Dashboard() {
  const dailyQuota = useSettingsStore((s) => s.dailyQuota);
  const [data, setData] = useState<{
    projects: Project[];
    shots: Shot[];
    clips: Clip[];
    reports: QCReport[];
  } | null>(null);

  useEffect(() => {
    void Promise.all([projectsRepo.list(), shotsRepo.list(), clipsRepo.list(), qcReportsRepo.list()]).then(
      ([projects, shots, clips, reports]) => setData({ projects, shots, clips, reports }),
    );
  }, []);

  if (!data) {
    return <div className="card p-10 text-center text-sm text-zinc-500">加载中…</div>;
  }

  return <DashboardContent {...data} dailyQuota={dailyQuota} />;
}
