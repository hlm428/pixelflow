import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { useDubbingStore } from '../../store/dubbingStore';
import { useProviderStore } from '../../store/providerStore';
import { DUBBING_STATUSES, type Dubbing, type DubbingStatus } from '../../types/dubbing';
import type { Shot } from '../../types/shot';

interface DubbingFormProps {
  open: boolean;
  projectId: string;
  shots: Shot[];
  /** null = 新建 */
  dubbing: Dubbing | null;
  onClose: () => void;
}

/** 台词编辑弹窗：对应分镜、起止时间、说话人、台词内容、TTS 供应商、声音 */
export default function DubbingForm({ open, projectId, shots, dubbing, onClose }: DubbingFormProps) {
  const create = useDubbingStore((s) => s.create);
  const update = useDubbingStore((s) => s.update);
  const providers = useProviderStore((s) => s.providers);

  const [shotId, setShotId] = useState('');
  const [startSec, setStartSec] = useState('0');
  const [endSec, setEndSec] = useState('10');
  const [speaker, setSpeaker] = useState('旁白');
  const [text, setText] = useState('');
  const [provider, setProvider] = useState('mimo');
  const [voice, setVoice] = useState('');
  const [status, setStatus] = useState<DubbingStatus>('待配音');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (dubbing) {
      setShotId(dubbing.shotId);
      setStartSec(String(dubbing.startSec));
      setEndSec(String(dubbing.endSec));
      setSpeaker(dubbing.speaker);
      setText(dubbing.text);
      setProvider(dubbing.provider);
      setVoice(dubbing.voice);
      setStatus(dubbing.status);
    } else {
      const first = shots[0];
      setShotId(first?.id ?? '');
      setStartSec(String(first?.startTime ?? 0));
      setEndSec(String((first?.startTime ?? 0) + 10));
      setSpeaker('旁白');
      setText(first?.dialogue ?? '');
      setProvider('mimo');
      setVoice('');
      setStatus('待配音');
    }
  }, [open, dubbing, shots]);

  const submit = async () => {
    const start = Number(startSec);
    const end = Number(endSec);
    if (!shotId) {
      setError('必须选对应分镜');
      return;
    }
    if (!text.trim()) {
      setError('台词内容必填');
      return;
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      setError('结束时间必须大于开始时间');
      return;
    }
    const patch = {
      projectId,
      shotId,
      startSec: start,
      endSec: end,
      speaker: speaker.trim() || '旁白',
      text: text.trim(),
      provider,
      voice: voice.trim(),
      status,
    };
    if (dubbing) await update(dubbing.id, patch);
    else await create(projectId, patch);
    onClose();
  };

  return (
    <Modal open={open} title={dubbing ? '编辑台词' : '新增台词'} onClose={onClose} wide>
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span>
              对应分镜 <span className="text-red-500">*</span>
            </span>
            <select
              className="input mt-1"
              value={shotId}
              onChange={(e) => {
                const shot = shots.find((s) => s.id === e.target.value);
                setShotId(e.target.value);
                if (shot && !dubbing) {
                  setStartSec(String(shot.startTime));
                  setEndSec(String(shot.startTime + 10));
                }
              }}
            >
              <option value="">选择分镜…</option>
              {shots.map((s) => (
                <option key={s.id} value={s.id}>
                  #{s.index} · {s.startTime}s · {(s.description ?? "").slice(0, 18)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span>说话人</span>
            <input
              className="input mt-1"
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
              placeholder="旁白 / 角色名"
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="block text-sm">
            <span>开始（秒）</span>
            <input
              className="input mt-1 font-mono"
              type="number"
              value={startSec}
              onChange={(e) => setStartSec(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span>结束（秒）</span>
            <input
              className="input mt-1 font-mono"
              type="number"
              value={endSec}
              onChange={(e) => setEndSec(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span>状态</span>
            <select
              className="input mt-1"
              value={status}
              onChange={(e) => setStatus(e.target.value as DubbingStatus)}
            >
              {DUBBING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm">
          <span>
            台词内容 <span className="text-red-500">*</span>
          </span>
          <textarea
            className="input mt-1 min-h-[72px]"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="这段画面里的台词或旁白"
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span>TTS 供应商</span>
            <select
              className="input mt-1"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.deadline ? `（截止 ${p.deadline}）` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span>声音名</span>
            <input
              className="input mt-1"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              placeholder="如 zh-CN-XiaoxiaoNeural / 音色 id"
            />
          </label>
        </div>

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
