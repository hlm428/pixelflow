import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { useShotStore } from '../../store/shotStore';
import { charactersRepo } from '../../lib/db';
import { CAMERA_PRESETS } from '../../lib/shot';
import { SHOT_STATUSES, type Shot, type ShotStatus } from '../../types/shot';
import type { CharacterCard } from '../../types/character';

interface ShotFormProps {
  open: boolean;
  projectId: string;
  /** null = 新建 */
  shot: Shot | null;
  onClose: () => void;
}

/** 分镜编辑弹窗：描述、画面内容、运镜、台词、角色、状态 */
export default function ShotForm({ open, projectId, shot, onClose }: ShotFormProps) {
  const create = useShotStore((s) => s.create);
  const update = useShotStore((s) => s.update);

  const [description, setDescription] = useState('');
  const [visualContent, setVisualContent] = useState('');
  const [camera, setCamera] = useState('');
  const [dialogue, setDialogue] = useState('');
  const [status, setStatus] = useState<ShotStatus>('待写');
  const [characterIds, setCharacterIds] = useState<string[]>([]);
  const [characters, setCharacters] = useState<CharacterCard[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (shot) {
      setDescription(shot.description);
      setVisualContent(shot.visualContent);
      setCamera(shot.camera);
      setDialogue(shot.dialogue);
      setStatus(shot.status);
      setCharacterIds(shot.characterIds);
    } else {
      setDescription('');
      setVisualContent('');
      setCamera('');
      setDialogue('');
      setStatus('待写');
      setCharacterIds([]);
    }
    void charactersRepo.listByProject(projectId).then(setCharacters);
  }, [open, shot, projectId]);

  const toggleCharacter = (id: string) => {
    setCharacterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async () => {
    if (!description.trim()) {
      setError('一句话描述必填');
      return;
    }
    setSaving(true);
    try {
      const patch = {
        description: description.trim(),
        visualContent: visualContent.trim(),
        camera: camera.trim(),
        dialogue: dialogue.trim(),
        status,
        characterIds,
      };
      if (shot) await update(shot.id, patch);
      else await create(projectId, patch);
      onClose();
    } catch (err) {
      setError(`保存失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={shot ? `编辑分镜 #${shot.index}` : '新增分镜'} onClose={onClose} wide>
      <div className="space-y-3">
        <label className="block text-sm">
          <span>
            一句话描述 <span className="text-red-500">*</span>
          </span>
          <input
            className="input mt-1"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例：雨夜校门口，短发女生把伞分一半给长发女生"
          />
        </label>

        <label className="block text-sm">
          <span>画面内容（详细，写给视频模型的画面描述）</span>
          <textarea
            className="input mt-1 min-h-[96px]"
            value={visualContent}
            onChange={(e) => setVisualContent(e.target.value)}
            placeholder="场景、人物动作、光线、氛围……越具体越好"
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span>运镜</span>
            <input
              className="input mt-1"
              value={camera}
              onChange={(e) => setCamera(e.target.value)}
              list="camera-presets"
              placeholder="推近 / 拉远 / 环绕…"
            />
            <datalist id="camera-presets">
              {CAMERA_PRESETS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <label className="block text-sm">
            <span>状态</span>
            <select
              className="input mt-1"
              value={status}
              onChange={(e) => setStatus(e.target.value as ShotStatus)}
            >
              {SHOT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm">
          <span>台词 / 旁白</span>
          <textarea
            className="input mt-1 min-h-[48px]"
            value={dialogue}
            onChange={(e) => setDialogue(e.target.value)}
            placeholder="这段画面里的台词或旁白（可空）"
          />
        </label>

        <div className="text-sm">
          <span>出现的角色</span>
          {characters.length === 0 ? (
            <p className="mt-1 text-xs text-zinc-500">
              还没有角色卡 —— 先到「角色卡」页建卡，再回来勾选（M4）
            </p>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-2">
              {characters.map((c) => (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                    characterIds.includes(c.id)
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      : 'border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={characterIds.includes(c.id)}
                    onChange={() => toggleCharacter(c.id)}
                  />
                  {c.name}·{c.era}
                </label>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-outline" onClick={onClose}>
            取消
          </button>
          <button className="btn-primary" onClick={() => void submit()} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
