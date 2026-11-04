import { useEffect, useState } from 'react';
import ConfirmDialog from '../ui/ConfirmDialog';
import Modal from '../ui/Modal';
import { useCharacterStore } from '../../store/characterStore';
import { useToastStore } from '../../store/toastStore';
import { downloadFile } from '../../lib/utils';
import { CHARACTER_ERAS, type CharacterEra } from '../../types/project';
import type { CharacterCard } from '../../types/character';

interface CharacterFormProps {
  /** 右侧选中的角色卡；null 显示引导 */
  card: CharacterCard | null;
  /** 该卡被多少个分镜引用（改卡会影响这些分镜的提示词） */
  affectedShotCount: number;
}

/** 角色卡编辑面板（角色卡只定脸、头发、衣服，不定动作和场景） */
export default function CharacterForm({ card, affectedShotCount }: CharacterFormProps) {
  const update = useCharacterStore((s) => s.update);
  const remove = useCharacterStore((s) => s.remove);
  const duplicateAsEra = useCharacterStore((s) => s.duplicateAsEra);
  const showToast = useToastStore((s) => s.show);

  const [name, setName] = useState('');
  const [era, setEra] = useState<CharacterEra>('现代');
  const [face, setFace] = useState('');
  const [eyes, setEyes] = useState('');
  const [hair, setHair] = useState('');
  const [clothing, setClothing] = useState('');
  const [personality, setPersonality] = useState('');
  const [voice, setVoice] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [eraPickOpen, setEraPickOpen] = useState(false);

  useEffect(() => {
    if (!card) return;
    setName(card.name);
    setEra(card.era);
    setFace(card.face);
    setEyes(card.eyes);
    setHair(card.hair);
    setClothing(card.clothing);
    setPersonality(card.personality);
    setVoice(card.voice);
    setNotes(card.notes);
    setError('');
  }, [card]);

  if (!card) {
    return (
      <div className="card flex min-h-[300px] flex-col items-center justify-center p-10 text-center">
        <div className="text-4xl">👥</div>
        <p className="mt-3 text-sm text-zinc-500">
          从左侧选择一张角色卡，或点「新建角色卡」。
          <br />
          角色卡只定<span className="text-indigo-500">脸、头发、衣服</span>
          ，动作和场景写在分镜里。
        </p>
      </div>
    );
  }

  const changed =
    card.name !== name ||
    card.era !== era ||
    card.face !== face ||
    card.eyes !== eyes ||
    card.hair !== hair ||
    card.clothing !== clothing ||
    card.personality !== personality ||
    card.voice !== voice ||
    card.notes !== notes;

  const doSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('角色名必填');
      return;
    }
    await update(card.id, {
      name: trimmed,
      era,
      face: face.trim(),
      eyes: eyes.trim(),
      hair: hair.trim(),
      clothing: clothing.trim(),
      personality: personality.trim(),
      voice: voice.trim(),
      notes: notes.trim(),
    });
    setConfirmSave(false);
    showToast('角色卡已保存');
  };

  const submit = async () => {
    if (!name.trim()) {
      setError('角色名必填');
      return;
    }
    if (affectedShotCount > 0 && changed) {
      setConfirmSave(true);
      return;
    }
    await doSave();
  };

  const handleDelete = async () => {
    await remove(card.id);
    setConfirmDelete(false);
    showToast(`已删除「${card.name}」并从分镜引用中移除`);
  };

  const handleExportOne = () => {
    downloadFile(
      `${card.name || '角色'}-${card.era}-character.json`,
      JSON.stringify({ app: 'pixelflow-character', version: 1, character: card }, null, 2),
    );
    showToast('已导出角色卡 JSON');
  };

  const handleDuplicateEra = async (targetEra: CharacterEra) => {
    const copy = await duplicateAsEra(card.id, targetEra);
    setEraPickOpen(false);
    if (copy) showToast(`已创建「${card.name}」的${targetEra}版本`);
  };

  const field = (label: string, value: string, setter: (v: string) => void, hint?: string) => (
    <label className="block text-sm">
      <span>{label}</span>
      <input className="input mt-1" value={value} onChange={(e) => setter(e.target.value)} />
      {hint && <span className="mt-0.5 block text-[11px] text-zinc-400">{hint}</span>}
    </label>
  );

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-bold text-white">
          {card.name.slice(0, 1) || '?'}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold">{card.name || '（未命名）'}</h2>
          <p className="text-xs text-zinc-500">
            {card.era} · 被引用于 {affectedShotCount} 个分镜
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button className="btn-outline" onClick={() => setEraPickOpen(true)}>
            复制为新时代
          </button>
          <button className="btn-outline" onClick={handleExportOne}>
            导出
          </button>
          <button
            className="btn-ghost text-red-500 hover:bg-red-500/10 dark:text-red-400"
            onClick={() => setConfirmDelete(true)}
          >
            删除
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {field('角色名 *', name, setName)}
        <label className="block text-sm">
          <span>时代</span>
          <select
            className="input mt-1"
            value={era}
            onChange={(e) => setEra(e.target.value as CharacterEra)}
          >
            {CHARACTER_ERAS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
        {field('脸型', face, setFace, '如：鹅蛋脸 / 尖下巴')}
        {field('眼睛', eyes, setEyes, '如：紫眼睛 / 冷灰蓝眼')}
        {field('头发', hair, setHair, '如：黑色短发 / 浅棕长发')}
        {field('衣服', clothing, setClothing, '如：校服、红格子围巾 / 黑西装白衬衫')}
        {field('性格', personality, setPersonality, '不进提示词，供表演参考')}
        {field('配音', voice, setVoice, '用哪个 TTS、哪个声音（配音页用）')}
      </div>
      <label className="mt-3 block text-sm">
        <span>备注</span>
        <textarea
          className="input mt-1 min-h-[56px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="口头禅、伏笔、注意事项……"
        />
      </label>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-primary" onClick={() => void submit()} disabled={!changed}>
          {changed ? '保存' : '无改动'}
        </button>
      </div>

      <p className="mt-3 rounded-lg bg-indigo-500/5 p-3 text-[11px] leading-relaxed text-zinc-500 dark:bg-indigo-500/10">
        <b className="text-indigo-500">角色卡锁定规则：</b>
        卡只定脸、头发、衣服；动作和场景写在分镜里。生成提示词时，角色卡内容
        <b>原文照搬</b>拼进提示词前面（一个字不改），保证每段长得一样。
      </p>

      <ConfirmDialog
        open={confirmSave}
        title="改卡提醒"
        message={`这张卡被 ${affectedShotCount} 个分镜引用。改了角色卡会影响这些分镜的提示词（角色脸崩往往就是从这里开始的）。要不要重新生成提示词？——M5 提示词页支持一键批量重新生成。`}
        confirmText="保存并去重新生成"
        onConfirm={async () => {
          await doSave();
          showToast('已保存。到「提示词」页对受影响分镜重新生成提示词');
        }}
        onCancel={() => setConfirmSave(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        danger
        title="删除角色卡"
        message={`确定删除「${card.name}（${card.era}）」？它会从 ${affectedShotCount} 个分镜的引用里移除（分镜本身保留）。`}
        confirmText="删除"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
      <Modal open={eraPickOpen} title="复制为新时代版本" onClose={() => setEraPickOpen(false)}>
        <p className="mb-3 text-sm text-zinc-500">
          同一个角色可以有三个时代版本（现代 / 古代 / 未来），每个版本独立一张卡。
        </p>
        <div className="flex flex-col gap-2">
          {CHARACTER_ERAS.filter((e) => e !== card.era).map((e) => (
            <button key={e} className="btn-outline justify-start" onClick={() => void handleDuplicateEra(e)}>
              {e}版
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
