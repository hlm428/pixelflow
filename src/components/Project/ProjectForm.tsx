import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { useProjectStore } from '../../store/projectStore';
import { useSettingsStore } from '../../store/settingsStore';
import {
  ASPECT_RATIOS,
  PROJECT_STYLES,
  type AspectRatio,
  type Project,
  type ProjectStyle,
} from '../../types/project';

const DURATION_OPTIONS = [
  { label: '60 秒', value: 60 },
  { label: '120 秒', value: 120 },
  { label: '300 秒', value: 300 },
  { label: '自定义…', value: -1 },
];

interface ProjectFormProps {
  open: boolean;
  /** null = 新建；有值 = 编辑 */
  initial: Project | null;
  onClose: () => void;
}

/** 新建 / 编辑项目表单（必填项标红星，提交时验证） */
export default function ProjectForm({ open, initial, onClose }: ProjectFormProps) {
  const create = useProjectStore((s) => s.create);
  const update = useProjectStore((s) => s.update);
  const defaultAspectRatio = useSettingsStore((s) => s.defaultAspectRatio);
  const defaultStyle = useSettingsStore((s) => s.defaultStyle);

  const [name, setName] = useState('');
  const [theme, setTheme] = useState('');
  const [oneLineStory, setOneLineStory] = useState('');
  const [durationChoice, setDurationChoice] = useState(60);
  const [customDuration, setCustomDuration] = useState('90');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [style, setStyle] = useState<ProjectStyle>('动漫');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (initial) {
      setName(initial.name);
      setTheme(initial.theme);
      setOneLineStory(initial.oneLineStory);
      setAspectRatio(initial.aspectRatio);
      setStyle(initial.style);
      if (initial.targetDuration === 60 || initial.targetDuration === 120 || initial.targetDuration === 300) {
        setDurationChoice(initial.targetDuration);
      } else {
        setDurationChoice(-1);
        setCustomDuration(String(initial.targetDuration));
      }
    } else {
      setName('');
      setTheme('');
      setOneLineStory('');
      setAspectRatio(defaultAspectRatio);
      setStyle(defaultStyle);
      setDurationChoice(60);
      setCustomDuration('90');
    }
  }, [open, initial, defaultAspectRatio, defaultStyle]);

  const submit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('项目名必填');
      return;
    }
    const custom = Number(customDuration);
    if (durationChoice === -1 && (!Number.isFinite(custom) || custom <= 0)) {
      setError('自定义时长必须是正数（秒）');
      return;
    }
    const targetDuration = durationChoice === -1 ? Math.floor(custom) : durationChoice;
    setSaving(true);
    try {
      if (initial) {
        await update(initial.id, {
          name: trimmedName,
          theme: theme.trim(),
          oneLineStory: oneLineStory.trim(),
          targetDuration,
          aspectRatio,
          style,
        });
      } else {
        const created = await create({
          name: trimmedName,
          theme: theme.trim(),
          oneLineStory: oneLineStory.trim(),
          targetDuration,
          aspectRatio,
          style,
        });
        useSettingsStore.getState().update({ currentProjectId: created.id });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={initial ? '编辑项目' : '新建项目'} onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-sm">
          <span>
            项目名 <span className="text-red-500">*</span>
          </span>
          <input
            className="input mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：柑橘味的夏天"
            autoFocus
          />
        </label>

        <label className="block text-sm">
          <span>主题</span>
          <input
            className="input mt-1"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="例：双女主百合 / 科幻悬疑"
          />
        </label>

        <label className="block text-sm">
          <span>一句话故事</span>
          <textarea
            className="input mt-1 min-h-[64px]"
            value={oneLineStory}
            onChange={(e) => setOneLineStory(e.target.value)}
            placeholder="例：雨天校门口，短发女生把伞分一半给长发女生。"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span>
              目标时长 <span className="text-red-500">*</span>
            </span>
            <select
              className="input mt-1"
              value={durationChoice}
              onChange={(e) => setDurationChoice(Number(e.target.value))}
            >
              {DURATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {durationChoice === -1 && (
            <label className="block text-sm">
              <span>秒数 <span className="text-red-500">*</span></span>
              <input
                className="input mt-1"
                type="number"
                min={10}
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                placeholder="如 90"
              />
            </label>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span>
              画幅 <span className="text-red-500">*</span>
            </span>
            <select
              className="input mt-1"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            >
              {ASPECT_RATIOS.map((r) => (
                <option key={r} value={r}>
                  {r === '16:9' ? '16:9 横屏' : r === '9:16' ? '9:16 竖屏' : '1:1 方形'}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span>
              风格 <span className="text-red-500">*</span>
            </span>
            <select
              className="input mt-1"
              value={style}
              onChange={(e) => setStyle(e.target.value as ProjectStyle)}
            >
              {PROJECT_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
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
