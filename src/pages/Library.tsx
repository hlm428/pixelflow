import { useState } from 'react';
import CharacterLibrary from '../components/Library/CharacterLibrary';
import TemplateLibrary from '../components/Library/TemplateLibrary';
import MusicLibrary from '../components/Library/MusicLibrary';
import ProjectReuse from '../components/Library/ProjectReuse';

type Tab = 'characters' | 'templates' | 'musics' | 'reuse';

const TABS: Array<{ key: Tab; label: string; icon: string }> = [
  { key: 'characters', label: '角色卡库', icon: '👥' },
  { key: 'templates', label: '提示词模板库', icon: '✍️' },
  { key: 'musics', label: '音乐库', icon: '🎵' },
  { key: 'reuse', label: '跨项目复用', icon: '♻️' },
];

/** 素材库：角色卡库 / 模板库 / 音乐库 / 历史项目复用 */
export default function Library() {
  const [tab, setTab] = useState<Tab>('characters');

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">素材库</h1>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  tab === t.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
                onClick={() => setTab(t.key)}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === 'characters' && <CharacterLibrary />}
      {tab === 'templates' && <TemplateLibrary />}
      {tab === 'musics' && <MusicLibrary />}
      {tab === 'reuse' && <ProjectReuse />}
    </div>
  );
}
