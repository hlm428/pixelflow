import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { useSettingsStore } from '../store/settingsStore';
import { useToastStore } from '../store/toastStore';
import { useCharacterStore } from '../store/characterStore';
import { useShotStore } from '../store/shotStore';
import { downloadFile } from '../lib/utils';
import CharacterList from '../components/Character/CharacterList';
import CharacterForm from '../components/Character/CharacterForm';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { CHARACTER_ERAS, type CharacterEra } from '../types/project';
import type { CharacterCard } from '../types/character';

/** 角色卡页：左侧角色列表，右侧详情编辑；支持多时代、改卡提醒、导出导入 */
export default function Characters() {
  const currentProjectId = useSettingsStore((s) => s.currentProjectId);
  const projects = useProjectStore((s) => s.projects);
  const updateProject = useProjectStore((s) => s.update);
  const project = projects.find((p) => p.id === currentProjectId) ?? null;

  const characters = useCharacterStore((s) => s.characters);
  const loadCharacters = useCharacterStore((s) => s.load);
  const createCharacter = useCharacterStore((s) => s.create);
  const importCards = useCharacterStore((s) => s.importCards);
  const shots = useShotStore((s) => s.shots);
  const loadShots = useShotStore((s) => s.load);
  const showToast = useToastStore((s) => s.show);
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CharacterCard | null>(null);
  const [eraFilter, setEraFilter] = useState<'全部' | CharacterEra>('全部');

  useEffect(() => {
    if (!currentProjectId) return;
    void loadCharacters(currentProjectId);
    void loadShots(currentProjectId);
  }, [currentProjectId, loadCharacters, loadShots]);

  useEffect(() => {
    if (selectedId && !characters.some((c) => c.id === selectedId)) {
      setSelectedId(null);
    }
  }, [characters, selectedId]);

  const shotCountMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of shots) {
      for (const cid of s.characterIds) m.set(cid, (m.get(cid) ?? 0) + 1);
    }
    return m;
  }, [shots]);

  const visible = useMemo(
    () => (eraFilter === '全部' ? characters : characters.filter((c) => c.era === eraFilter)),
    [characters, eraFilter],
  );

  if (!currentProjectId || !project) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <div className="text-4xl">👥</div>
        <p className="mt-3 text-sm text-zinc-500">先在顶部选择一个项目。</p>
        <Link to="/projects" className="btn-primary mt-4 inline-flex">
          去项目页
        </Link>
      </div>
    );
  }

  const selected = characters.find((c) => c.id === selectedId) ?? null;

  const handleCreate = async () => {
    const card = await createCharacter(project.id, {
      name: `新角色 ${characters.length + 1}`,
      era: project.activeEra,
    });
    setSelectedId(card.id);
    showToast('已新建角色卡，右侧填写外貌');
  };

  const handleExportAll = () => {
    downloadFile(
      `${project.name}-characters.json`,
      JSON.stringify({ app: 'pixelflow-characters', version: 1, characters }, null, 2),
    );
    showToast(`已导出 ${characters.length} 张角色卡`);
  };

  const handleImport = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const o = parsed as { characters?: CharacterCard[]; character?: CharacterCard };
      const cards = Array.isArray(o.characters) ? o.characters : o.character ? [o.character] : null;
      if (!cards) {
        showToast('导入失败：文件里没有角色卡数据');
        return;
      }
      const n = await importCards(project.id, cards);
      showToast(`已导入 ${n} 张角色卡`);
    } catch {
      showToast('导入失败：JSON 解析出错');
    }
  };

  const handleEraSwitch = (era: CharacterEra) => {
    void updateProject(project.id, { activeEra: era });
    showToast(`项目时代切到「${era}」——生成提示词时自动用${era}版本的卡（M5 生效）`);
  };

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2 p-4">
        <h1 className="text-lg font-semibold">角色卡</h1>
        <span className="text-sm text-zinc-500">{project.name}</span>
        <span className="badge bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          共 {characters.length} 张
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">项目时代</span>
          <select
            className="input w-24"
            value={project.activeEra}
            onChange={(e) => handleEraSwitch(e.target.value as CharacterEra)}
            title="同名角色有多个时代版本时，生成提示词用这个时代的卡"
          >
            {CHARACTER_ERAS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <select
            className="input w-24"
            value={eraFilter}
            onChange={(e) => setEraFilter(e.target.value as '全部' | CharacterEra)}
          >
            <option value="全部">全部时代</option>
            {CHARACTER_ERAS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <label className="btn-outline cursor-pointer">
            导入
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImport(f);
                e.target.value = '';
              }}
            />
          </label>
          <button className="btn-outline" onClick={handleExportAll} disabled={characters.length === 0}>
            导出全部
          </button>
          <button className="btn-primary" onClick={() => void handleCreate()}>
            ＋ 新建角色卡
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        <aside>
          <CharacterList
            cards={visible}
            shotCountMap={shotCountMap}
            selectedId={selectedId}
            projectEra={project.activeEra}
            onSelect={(id) => setSelectedId(id)}
          />
        </aside>
        <CharacterForm card={selected} affectedShotCount={selected ? (shotCountMap.get(selected.id) ?? 0) : 0} />
      </div>

      <ConfirmDialog
        open={deleting !== null}
        danger
        title="删除角色卡"
        message={`确定删除「${deleting?.name ?? ''}（${deleting?.era ?? ''}）」？`}
        confirmText="删除"
        onConfirm={async () => {
          if (deleting) {
            await useCharacterStore.getState().remove(deleting.id);
            showToast('已删除');
          }
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
