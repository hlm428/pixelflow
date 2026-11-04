import { useEffect, useMemo, useState } from 'react';
import { charactersRepo, musicsRepo } from '../../lib/db';
import { useProjectStore } from '../../store/projectStore';
import { useCharacterStore } from '../../store/characterStore';
import { useMusicStore } from '../../store/musicStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useToastStore } from '../../store/toastStore';
import type { CharacterCard } from '../../types/character';
import type { Project } from '../../types/project';
import type { Music } from '../../types/music';

/** 历史项目复用：勾选旧项目的角色卡 / 音乐，一键复制到当前项目 */
export default function ProjectReuse() {
  const currentProjectId = useSettingsStore((s) => s.currentProjectId);
  const projects = useProjectStore((s) => s.projects);
  const importCards = useCharacterStore((s) => s.importCards);
  const loadCharacters = useCharacterStore((s) => s.load);
  const markUsedIn = useMusicStore((s) => s.markUsedIn);
  const showToast = useToastStore((s) => s.show);

  const [sourceId, setSourceId] = useState('');
  const [sourceCards, setSourceCards] = useState<CharacterCard[]>([]);
  const [sourceMusics, setSourceMusics] = useState<Music[]>([]);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [selectedMusics, setSelectedMusics] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const current = projects.find((p) => p.id === currentProjectId) ?? null;
  const others = useMemo(() => projects.filter((p) => p.id !== currentProjectId), [projects, currentProjectId]);

  useEffect(() => {
    if (!sourceId) {
      setSourceCards([]);
      setSourceMusics([]);
      return;
    }
    void Promise.all([charactersRepo.listByProject(sourceId), musicsRepo.list()]).then(([cards, musics]) => {
      setSourceCards(cards);
      // 音乐是全局表：这里显示全部，可勾选复制标记
      setSourceMusics(musics);
      setSelectedCards(new Set(cards.map((c) => c.id)));
      setSelectedMusics(new Set());
    });
  }, [sourceId]);

  const copy = async () => {
    if (!current) {
      showToast('先在顶部选择目标项目');
      return;
    }
    setBusy(true);
    try {
      const cards = sourceCards.filter((c) => selectedCards.has(c.id));
      let n = 0;
      if (cards.length > 0) {
        await importCards(current.id, cards);
        await loadCharacters(current.id);
        n += cards.length;
      }
      const musics = sourceMusics.filter((m) => selectedMusics.has(m.id));
      for (const m of musics) {
        await markUsedIn(m.id, current.name);
        n++;
      }
      showToast(n === 0 ? '没有勾选要复用的素材' : `已复制 ${n} 项到「${current.name}」`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span>从哪个旧项目复用</span>
        <select className="input mt-1 max-w-sm" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
          <option value="">选择源项目…</option>
          {others.map((p: Project) => (
            <option key={p.id} value={p.id}>
              {p.name}（{p.style} · {p.aspectRatio}）
            </option>
          ))}
        </select>
      </label>

      {sourceId && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="card p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">角色卡（{sourceCards.length}）</span>
              <button
                className="btn-ghost text-xs"
                onClick={() =>
                  setSelectedCards((prev) =>
                    prev.size === sourceCards.length ? new Set() : new Set(sourceCards.map((c) => c.id)),
                  )
                }
              >
                {selectedCards.size === sourceCards.length && sourceCards.length > 0 ? '全不选' : '全选'}
              </button>
            </div>
            {sourceCards.length === 0 ? (
              <p className="p-4 text-center text-xs text-zinc-500">该项目还没有角色卡</p>
            ) : (
              <div className="space-y-1.5">
                {sourceCards.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                    <input
                      type="checkbox"
                      className="accent-indigo-600"
                      checked={selectedCards.has(c.id)}
                      onChange={() =>
                        setSelectedCards((prev) => {
                          const n = new Set(prev);
                          if (n.has(c.id)) n.delete(c.id);
                          else n.add(c.id);
                          return n;
                        })
                      }
                    />
                    <span className="font-medium">{c.name}</span>
                    <span className="badge bg-zinc-100 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{c.era}</span>
                    <span className="truncate text-xs text-zinc-400">{c.hair} · {c.clothing}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="card p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">音乐（标记「用在」当前项目）</span>
            </div>
            {sourceMusics.length === 0 ? (
              <p className="p-4 text-center text-xs text-zinc-500">音乐库是空的 —— 先到「音乐库」tab 登记 BGM</p>
            ) : (
              <div className="max-h-56 space-y-1.5 overflow-y-auto">
                {sourceMusics.map((m) => (
                  <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                    <input
                      type="checkbox"
                      className="accent-indigo-600"
                      checked={selectedMusics.has(m.id)}
                      onChange={() =>
                        setSelectedMusics((prev) => {
                          const n = new Set(prev);
                          if (n.has(m.id)) n.delete(m.id);
                          else n.add(m.id);
                          return n;
                        })
                      }
                    />
                    <span className="font-medium">{m.name}</span>
                    <span className="truncate text-xs text-zinc-400">{m.license}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {sourceId && (
        <button className="btn-primary" onClick={() => void copy()} disabled={busy}>
          {busy ? '复制中…' : `⧉ 复制勾选素材到「${current?.name ?? '（未选项目）'}」`}
        </button>
      )}
      <p className="text-[11px] text-zinc-400">
        提示：提示词模板是全库共享的，不需要复制；风格词在新建项目时选「风格」即可复用。
      </p>
    </div>
  );
}
