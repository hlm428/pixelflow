import type { CharacterCard } from '../../types/character';
import CharacterCardItem from './CharacterCard';

interface CharacterListProps {
  cards: CharacterCard[];
  shotCountMap: Map<string, number>;
  selectedId: string | null;
  projectEra: string;
  onSelect: (id: string) => void;
}

/** 角色卡左侧列表 */
export default function CharacterList({
  cards,
  shotCountMap,
  selectedId,
  projectEra,
  onSelect,
}: CharacterListProps) {
  if (cards.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-zinc-500">
        还没有角色卡。角色卡锁定角色的脸、头发、衣服，是防止脸崩的关键。
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {cards.map((c) => (
        <CharacterCardItem
          key={c.id}
          card={c}
          shotCount={shotCountMap.get(c.id) ?? 0}
          active={c.id === selectedId}
          isProjectEra={c.era === projectEra}
          onClick={() => onSelect(c.id)}
        />
      ))}
    </div>
  );
}
