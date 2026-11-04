import { useEffect, useMemo, useState } from 'react';
import { useMusicStore } from '../../store/musicStore';
import { useProjectStore } from '../../store/projectStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useToastStore } from '../../store/toastStore';
import MusicForm from './MusicForm';
import ConfirmDialog from '../ui/ConfirmDialog';
import { formatDuration } from '../../lib/utils';
import type { Music } from '../../types/music';

/** 音乐库：音乐名、文件、时长、用在哪个项目、授权信息 */
export default function MusicLibrary() {
  const musics = useMusicStore((s) => s.musics);
  const loaded = useMusicStore((s) => s.loaded);
  const loadAll = useMusicStore((s) => s.loadAll);
  const markUsedIn = useMusicStore((s) => s.markUsedIn);
  const remove = useMusicStore((s) => s.remove);
  const currentProjectId = useSettingsStore((s) => s.currentProjectId);
  const projects = useProjectStore((s) => s.projects);
  const showToast = useToastStore((s) => s.show);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Music | null>(null);
  const [deleting, setDeleting] = useState<Music | null>(null);
  const [kw, setKw] = useState('');

  const project = projects.find((p) => p.id === currentProjectId) ?? null;

  useEffect(() => {
    if (!loaded) void loadAll();
  }, [loaded, loadAll]);

  const visible = useMemo(() => {
    const keyword = kw.trim().toLowerCase();
    if (!keyword) return musics;
    return musics.filter(
      (m) =>
        m.name.toLowerCase().includes(keyword) ||
        m.tags.some((t) => t.toLowerCase().includes(keyword)),
    );
  }, [musics, kw]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          className="input max-w-xs"
          placeholder="搜音乐名 / 标签…"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
        />
        <span className="text-sm text-zinc-500">{visible.length} 首</span>
        <div className="ml-auto flex gap-2">
          {project && (
            <select
              className="input w-44"
              defaultValue=""
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                void markUsedIn(id, project.name);
                showToast(`已标记「${musics.find((m) => m.id === id)?.name}」用在 ${project.name}`);
                e.target.value = '';
              }}
            >
              <option value="">把音乐标记为「用在当前项目」…</option>
              {musics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            ＋ 新增音乐
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="card p-8 text-center text-sm text-zinc-500">
          音乐库是空的。把常用 BGM 登记进来，记好授权信息，发布不踩坑。
        </p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800">
                <th className="px-3 py-2.5 font-medium">音乐名</th>
                <th className="px-3 py-2.5 font-medium">文件</th>
                <th className="px-3 py-2.5 font-medium">时长</th>
                <th className="px-3 py-2.5 font-medium">用在</th>
                <th className="px-3 py-2.5 font-medium">授权</th>
                <th className="px-3 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((m) => (
                <tr key={m.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                  <td className="px-3 py-2.5 font-medium">
                    {m.name}
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {m.tags.map((t) => (
                        <span key={t} className="text-[10px] text-zinc-400">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-zinc-500">{m.fileName || '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{formatDuration(m.duration)}</td>
                  <td className="px-3 py-2.5 text-xs text-zinc-500">
                    {m.usedIn.length > 0 ? m.usedIn.join('、') : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-zinc-500">{m.license}</td>
                  <td className="px-3 py-2.5">
                    <span className="flex gap-1">
                      <button
                        className="btn-ghost px-2 py-1 text-xs"
                        onClick={() => {
                          setEditing(m);
                          setFormOpen(true);
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-ghost px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 dark:text-red-400"
                        onClick={() => setDeleting(m)}
                      >
                        🗑️
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MusicForm open={formOpen} music={editing} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={deleting !== null}
        danger
        title="删除音乐"
        message={`确定删除「${deleting?.name ?? ''}」？`}
        confirmText="删除"
        onConfirm={async () => {
          if (deleting) {
            await remove(deleting.id);
            showToast('已删除');
          }
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
