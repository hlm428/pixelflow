import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { useClipStore } from '../../store/clipStore';
import { useToastStore } from '../../store/toastStore';
import { readVideoMeta } from '../../lib/video';
import { KNOWN_MODELS } from '../../lib/clip';
import { ASPECT_RESOLUTION, type AspectRatio } from '../../types/project';
import type { Shot } from '../../types/shot';

interface ClipUploadProps {
  open: boolean;
  projectId: string;
  shots: Shot[];
  /** 每个分镜已有候选数 */
  clipCounts: Map<string, number>;
  defaultShotId: string | null;
  projectAspect: AspectRatio;
  onClose: () => void;
}

const MAX_CANDIDATES = 6;

/** 上传候选片段（1–6 个/分镜）：读视频元数据 + 自动打分，不入库文件本体 */
export default function ClipUpload({
  open,
  projectId,
  shots,
  clipCounts,
  defaultShotId,
  projectAspect,
  onClose,
}: ClipUploadProps) {
  const create = useClipStore((s) => s.create);
  const showToast = useToastStore((s) => s.show);

  const [shotId, setShotId] = useState(defaultShotId ?? '');
  const [model, setModel] = useState('');
  const [fps, setFps] = useState('24');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setShotId(defaultShotId ?? (shots[0]?.id ?? ''));
      setModel('');
      setFps('24');
      setError('');
    }
  }, [open, defaultShotId, shots]);

  const target = ASPECT_RESOLUTION[projectAspect];
  const existingCount = clipCounts.get(shotId) ?? 0;

  const handleFiles = async (files: FileList) => {
    if (!shotId) {
      setError('先选分镜');
      return;
    }
    const remaining = MAX_CANDIDATES - existingCount;
    if (remaining <= 0) {
      setError(`该分镜已有 ${MAX_CANDIDATES} 个候选，达到上限`);
      return;
    }
    const list = Array.from(files).slice(0, remaining);
    if (list.length < files.length) {
      setError(`最多 6 个候选，本次只取前 ${remaining} 个文件`);
    }
    setBusy(true);
    let ok = 0;
    let failed = 0;
    const shot = shots.find((s) => s.id === shotId);
    const promptVersion = shot?.promptVersion ?? 0;
    for (const file of list) {
      try {
        const meta = await readVideoMeta(file);
        await create(projectId, shotId, {
          fileName: file.name,
          duration: meta.duration,
          width: meta.width,
          height: meta.height,
          fps: Number(fps) || 24,
          fileSize: file.size,
          model: model.trim() || '未记录',
          promptVersion,
        }, target);
        ok++;
      } catch {
        failed++;
      }
    }
    setBusy(false);
    showToast(`上传完成：成功 ${ok} 个${failed > 0 ? `，失败 ${failed} 个` : ''}`);
    if (ok > 0) onClose();
  };

  return (
    <Modal open={open} title="上传候选片段" onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-sm">
          <span>
            分镜 <span className="text-red-500">*</span>
            {shotId && <span className="ml-2 text-xs text-zinc-400">已有 {existingCount}/6 个候选</span>}
          </span>
          <select className="input mt-1" value={shotId} onChange={(e) => setShotId(e.target.value)}>
            <option value="">选择分镜…</option>
            {shots.map((s) => (
              <option key={s.id} value={s.id}>
                #{s.index} {s.startTime}s · {(s.description ?? "").slice(0, 24)}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span>生成模型</span>
            <input
              className="input mt-1"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              list="model-presets"
              placeholder="如 Muse"
            />
            <datalist id="model-presets">
              {KNOWN_MODELS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </label>
          <label className="block text-sm">
            <span>帧率</span>
            <input
              className="input mt-1"
              type="number"
              min={1}
              value={fps}
              onChange={(e) => setFps(e.target.value)}
            />
          </label>
        </div>

        <label className="block cursor-pointer rounded-xl border-2 border-dashed border-zinc-300 p-6 text-center transition-colors hover:border-indigo-500 dark:border-zinc-700">
          <div className="text-3xl">🎞️</div>
          <p className="mt-2 text-sm text-zinc-500">点击选择视频文件（可多选，最多补到 6 个候选）</p>
          <p className="mt-1 text-[11px] text-zinc-400">
            目标规格 {target.width}×{target.height} · 10 秒；自动按规格打分
          </p>
          <input
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            disabled={busy || !shotId}
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) void handleFiles(files);
              e.target.value = '';
            }}
          />
        </label>

        {error && <p className="text-sm text-amber-500">{error}</p>}
        {busy && <p className="text-sm text-indigo-500">正在读取视频元数据…</p>}
      </div>
    </Modal>
  );
}
