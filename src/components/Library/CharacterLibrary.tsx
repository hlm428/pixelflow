import { useEffect, useMemo, useState } from 'react';
import { charactersRepo, projectsRepo } from '../../lib/db';
import { useCharacterStore } from '../../store/characterStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useToastStore } from '../../store/toastStore';

/** 角色卡库：全库角色卡汇总，一键复制到当前项目 */
export default function CharacterLibrary() {
  const currentProjectId = useSettingsStore((s) => s.currentProjectId);
  const importCards = useCharacterStore((s) => s.importCards);
  const loadCharacters = useCharacterStore((s) => s.load);
  const showToast = useToastStore((s) => s.show);

  const [all, setAll] = useState<Array<{ card: import('../../types/character').CharacterCard; projectName: string }>>([]);
  const [kw, setKw] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [cards, projects] = await Promise.all([charactersRepo.list(), projectsRepo.list()]);
      const nameMap = new Map(projects.map((p) => [p.id, p.name]));
      setAll(cards.map((card) => ({ card, projectName: nameMap.get(card.projectId) ?? '未知项目' })));
    })();
  }, []);

  const visible = useMemo(() => {
    const keyword = kw.trim().toLowerCase();
    if (!keyword) return all;
    return all.filter(
      ({ card }) =>
        card.name.toLowerCase().includes(keyword) ||
        card.hair.toLowerCase().includes(keyword) ||
        card.clothing.toLowerCase().includes(keyword),
    );
  }, [all, kw]);

  const copyToCurrent = async (card: (typeof all)[number]['card']) => {
    if (!currentProjectId) {
      showToast('先在顶部选择目标项目');
      return;
    }
    setBusyId(card.id);
    await importCards(currentProjectId, [card]);
    await loadCharacters(currentProjectId);
    setBusyId(null);
    showToast(`「${card.name}（${card.era}）」已复制到当前项目`);
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <input
          className="input max-w-xs"
          placeholder="搜角色名 / 头发 / 衣服…"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
        />
        <span className="text-sm text-zinc-500">{visible.length} 张</span>
      </div>
      {visible.length === 0 ? (
        <p className="card p-8 text-center text-sm text-zinc-500">库里还没有角色卡 —— 在项目里建卡后会汇总到这里。</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map(({ card, projectName }) => (
            <div key={card.id} className="card p-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-bold text-white">
                  {card.name.slice(0, 1) || '?'}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{card.name || '（未命名）'}</span>
                    <span className="badge bg-zinc-100 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {card.era}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400">来自 {projectName}</span>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-zinc-500">
                {card.hair || '未填头发'} · {card.clothing || '未填衣服'}
              </p>
              <button
                className="btn-outline mt-2.5 w-full text-xs"
                onClick={() => void copyToCurrent(card)}
                disabled={busyId === card.id}
              >
                {busyId === card.id ? '复制中…' : '⧉ 复制到当前项目'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
