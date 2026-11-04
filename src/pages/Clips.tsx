import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { useSettingsStore } from '../store/settingsStore';
import { useShotStore } from '../store/shotStore';
import { useClipStore } from '../store/clipStore';
import { CLIP_STATUSES, FAIL_REASONS, type ClipStatus, type FailReason } from '../types/clip';
import ClipList from '../components/Clip/ClipList';
import ClipCompare from '../components/Clip/ClipCompare';
import ClipUpload from '../components/Clip/ClipUpload';

/** 片段管理页：上传候选、对比选优、状态机、失败原因、多维筛选 */
export default function Clips() {
  const currentProjectId = useSettingsStore((s) => s.currentProjectId);
  const projects = useProjectStore((s) => s.projects);
  const project = projects.find((p) => p.id === currentProjectId) ?? null;

  const shots = useShotStore((s) => s.shots);
  const loadShots = useShotStore((s) => s.load);
  const clips = useClipStore((s) => s.clips);
  const loadClips = useClipStore((s) => s.load);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [filterShot, setFilterShot] = useState('全部');
  const [filterStatus, setFilterStatus] = useState<'全部' | ClipStatus>('全部');
  const [filterModel, setFilterModel] = useState('全部');
  const [filterFail, setFilterFail] = useState<'全部' | FailReason>('全部');
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    if (!currentProjectId) return;
    void loadShots(currentProjectId);
    void loadClips(currentProjectId);
  }, [currentProjectId, loadShots, loadClips]);

  const models = useMemo(() => {
    const set = new Set<string>();
    for (const c of clips) if (c.model) set.add(c.model);
    return [...set].sort();
  }, [clips]);

  const clipCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of clips) m.set(c.shotId, (m.get(c.shotId) ?? 0) + 1);
    return m;
  }, [clips]);

  const shotMap = useMemo(() => new Map(shots.map((s) => [s.id, s])), [shots]);

  const filtered = useMemo(
    () =>
      clips
        .filter((c) => filterShot === '全部' || c.shotId === filterShot)
        .filter((c) => filterStatus === '全部' || c.status === filterStatus)
        .filter((c) => filterModel === '全部' || c.model === filterModel)
        .filter((c) => filterFail === '全部' || c.failReason === filterFail)
        .sort((a, b) => b.createdAt - a.createdAt),
    [clips, filterShot, filterStatus, filterModel, filterFail],
  );

  if (!currentProjectId || !project) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <div className="text-4xl">🎞️</div>
        <p className="mt-3 text-sm text-zinc-500">先在顶部选择一个项目。</p>
        <Link to="/projects" className="btn-primary mt-4 inline-flex">
          去项目页
        </Link>
      </div>
    );
  }

  const shotLabel = (shotId: string) => {
    const s = shotMap.get(shotId);
    return s ? `#${s.index}` : '已删分镜';
  };

  const compareClips =
    filterShot !== '全部'
      ? clips.filter((c) => c.shotId === filterShot)
      : [];

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2 p-4">
        <h1 className="text-lg font-semibold">片段</h1>
        <span className="text-sm text-zinc-500">{project.name}</span>
        <span className="badge bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {filtered.length} / {clips.length} 条
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            className="input w-36"
            value={filterShot}
            onChange={(e) => {
              setFilterShot(e.target.value);
              if (e.target.value === '全部') setCompareMode(false);
            }}
          >
            <option value="全部">全部分镜</option>
            {shots.map((s) => (
              <option key={s.id} value={s.id}>
                #{s.index} · {s.description.slice(0, 14)}
              </option>
            ))}
          </select>
          <select
            className="input w-24"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as '全部' | ClipStatus)}
          >
            <option value="全部">全部状态</option>
            {CLIP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="input w-28"
            value={filterModel}
            onChange={(e) => setFilterModel(e.target.value)}
          >
            <option value="全部">全部模型</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            className="input w-28"
            value={filterFail}
            onChange={(e) => setFilterFail(e.target.value as '全部' | FailReason)}
          >
            <option value="全部">全部失败原因</option>
            {FAIL_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {filterShot !== '全部' && (
            <button
              className={`btn-outline text-xs ${compareMode ? 'border-indigo-500 text-indigo-500' : ''}`}
              onClick={() => setCompareMode(!compareMode)}
            >
              ⬌ 对比模式
            </button>
          )}
          <button
            className="btn-primary"
            onClick={() => setUploadOpen(true)}
            disabled={shots.length === 0}
          >
            ⬆️ 上传片段
          </button>
        </div>
      </div>

      {shots.length === 0 ? (
        <div className="card p-10 text-center text-sm text-zinc-500">
          还没有分镜 —— 先到「故事分镜」页拆分镜，才能给分镜传候选片段。
        </div>
      ) : compareMode && filterShot !== '全部' ? (
        <ClipCompare clips={compareClips} shotLabel={shotLabel(filterShot)} />
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl">📼</div>
          <p className="mt-3 text-sm text-zinc-500">
            {clips.length === 0
              ? '还没有片段记录。点「⬆️ 上传片段」把生成的 10 秒视频挂到分镜上（1–6 个候选）。'
              : '没有符合筛选条件的片段。'}
          </p>
        </div>
      ) : (
        <ClipList clips={filtered} shotLabel={shotLabel} />
      )}

      <ClipUpload
        open={uploadOpen}
        projectId={project.id}
        shots={shots}
        clipCounts={clipCounts}
        defaultShotId={filterShot !== '全部' ? filterShot : null}
        projectAspect={project.aspectRatio}
        onClose={() => setUploadOpen(false)}
      />
    </div>
  );
}
