import { useEffect, useRef, useState } from 'react';
import Modal from '../ui/Modal';
import { useMusicStore } from '../../store/musicStore';
import { readAudioMeta } from '../../lib/audio';
import { useToastStore } from '../../store/toastStore';
import type { Music } from '../../types/music';

interface MusicFormProps {
  open: boolean;
  /** null = 新建 */
  music: Music | null;
  onClose: () => void;
}

/** 音乐编辑弹窗：名字、文件（可上传）、时长、授权信息、标签 */
export default function MusicForm({ open, music, onClose }: MusicFormProps) {
  const create = useMusicStore((s) => s.create);
  const update = useMusicStore((s) => s.update);
  const showToast = useToastStore((s) => s.show);

  const [name, setName] = useState('');
  const [fileName, setFileName] = useState('');
  const [duration, setDuration] = useState('60');
  const [license, setLicense] = useState('');
  const [tags, setTags] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | undefined>(undefined);
  const [audioLoading, setAudioLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (music) {
      setName(music.name);
      setFileName(music.fileName);
      setDuration(String(music.duration));
      setLicense(music.license);
      setTags(music.tags.join(' '));
      setAudioBlob(music.audioBlob);
    } else {
      setName('');
      setFileName('');
      setDuration('60');
      setLicense('');
      setTags('');
      setAudioBlob(undefined);
    }
    setAudioLoading(false);
    if (fileRef.current) fileRef.current.value = '';
  }, [open, music]);

  const handleFile = async (file: File) => {
    setAudioLoading(true);
    setError('');
    try {
      const dur = await readAudioMeta(file);
      setAudioBlob(file);
      setFileName(file.name);
      if (dur > 0) setDuration(String(Math.round(dur)));
      showToast(`已读取「${file.name}」${dur > 0 ? `，时长 ${Math.round(dur)} 秒` : ''}——文件只存本地浏览器`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAudioLoading(false);
    }
  };

  const submit = async () => {
    if (!name.trim()) {
      setError('音乐名必填');
      return;
    }
    const dur = Number(duration);
    const data = {
      name: name.trim(),
      fileName: fileName.trim(),
      duration: Number.isFinite(dur) && dur > 0 ? dur : 60,
      license: license.trim() || '未登记授权（发布前确认）',
      tags: tags.split(/[\s,，]+/).filter(Boolean),
      audioBlob,
    };
    if (music) await update(music.id, data);
    else await create({ ...data, usedIn: [] });
    onClose();
  };

  return (
    <Modal open={open} title={music ? '编辑音乐' : '新增音乐'} onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-sm">
          <span>
            音乐名 <span className="text-red-500">*</span>
          </span>
          <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span>音频文件（可选上传，存本地浏览器，存了就能直接试听）</span>
          <input
            ref={fileRef}
            className="input mt-1"
            type="file"
            accept="audio/*"
            disabled={audioLoading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <input
            className="input mt-1 font-mono"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="bgm.mp3"
          />
          {audioBlob && (
            <span className="mt-1 block text-[11px] text-emerald-600 dark:text-emerald-400">
              ✓ 已附带音频本体（{Math.round(audioBlob.size / 1024)} KB），保存后可在列表直接播放
            </span>
          )}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span>时长（秒）</span>
            <input
              className="input mt-1 font-mono"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span>标签（空格分隔）</span>
            <input
              className="input mt-1"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="治愈 轻快 钢琴"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span>授权信息</span>
          <input
            className="input mt-1"
            value={license}
            onChange={(e) => setLicense(e.target.value)}
            placeholder="如：免版权曲库 / CC-BY / 自制"
          />
        </label>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-outline" onClick={onClose}>
            取消
          </button>
          <button className="btn-primary" onClick={() => void submit()}>
            保存
          </button>
        </div>
      </div>
    </Modal>
  );
}
