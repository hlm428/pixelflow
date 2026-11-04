import type { CharacterCard } from '../../types/character';

interface CharacterCardItemProps {
  card: CharacterCard;
  shotCount: number;
  active: boolean;
  isProjectEra: boolean;
  onClick: () => void;
}

/** 角色卡列表项：头像占位 + 名字 + 时代 + 出现的分镜数 */
export default function CharacterCardItem({
  card,
  shotCount,
  active,
  isProjectEra,
  onClick,
}: CharacterCardItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
        active
          ? 'border-indigo-500 bg-indigo-500/10'
          : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60'
      }`}
    >
      {/* 头像占位：名字首字 */}
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${
          isProjectEra ? 'from-indigo-500 to-fuchsia-500' : 'from-zinc-400 to-zinc-500'
        }`}
      >
        {card.name.slice(0, 1) || '?'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{card.name || '（未命名）'}</span>
          <span
            className={`badge shrink-0 ${
              isProjectEra
                ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            {card.era}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-zinc-500">
          出现于 {shotCount} 个分镜 · {card.hair || '未填头发'}
        </span>
      </span>
    </button>
  );
}
