import { useRef } from 'react';
import { useDubbingStore } from '../../store/dubbingStore';
import { useProviderStore } from '../../store/providerStore';
import { useToastStore } from '../../store/toastStore';
import { readAudioMeta } from '../../lib/audio';
import { formatClock } from '../../lib/utils';
import { DUBBING_STATUS_STYLE } from '../../lib/dubbing';
import type { Dubbing } from '../../types/dubbing';
import type { Shot } from '../../types/shot';

interface DubbingListProps {
  dubbings: Dubbing[];
  shots: Shot[];
  audioUrls: Map<string, string>;
  onEdit: (d: Dubbing) => void;
  onDelete: (d: Dubbing) => void;
  onAudioUrl: (id: string, url: string) => void;
}

const STATUS_STYLE: Record<string, string> = DUBBING_STATUS_STYLE;

/** 台词列表：对齐检查（音频时长 vs 台词窗口，差 >0.5s 标红）+ 音频上传试听 */
export default function DubbingList({
  dubbings,
  shots,
  audioUrls,
  onEdit,
  onDelete,
  onAudioUrl,
}: DubbingListProps) {
  const uploadAudio = useDubbingStore((s) => s.uploadAudio);
  const providers = useProviderStore((s) => s.providers);
  const showToast = useToastStore((s) => s.show);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const shotMap = new Map(shots.map((s) => [s.id, s]));

  const handleUpload = async (d: Dubbing, file: File) => {
    try {
      const duration = await readAudioMeta(file);
      await uploadAudio(d.id, file.name, duration);
      onAudioUrl(d.id, URL.createObjectURL(file));
      showToast(`已上传配音（${duration.toFixed(1)}s），试听检查对齐`);
    } catch {
      showToast('音频读取失败');
    }
  };

  if (dubbings.length === 0) {
    return (
      <p className="card p-8 text-center text-sm text-zinc-500">
        还没有台词。点「从分镜导入」把各分镜的台词/旁白批量拉过来，或手动新增。
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {dubbings.map((d) => {
        const shot = shotMap.get(d.shotId);
        const span = d.endSec - d.startSec;
        const hasAudio = d.audioDuration > 0;
        const diff = d.audioDuration - span;
        const misaligned = hasAudio && Math.abs(diff) > 0.5;
        const providerName = providers.find((p) => p.id === d.provider)?.name ?? d.provider;
        return (
          <div key={d.id} className="card p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-indigo-500">
                #{shot?.index ?? '?'}
              </span>
              <span className="badge bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {d.speaker}
              </span>
              <span className={`badge ${STATUS_STYLE[d.status]}`}>{d.status}</span>
              <span className="font-mono text-xs text-zinc-500">
                {formatClock(d.startSec)}–{formatClock(d.endSec)}（窗 {span.toFixed(1)}s）
              </span>
              <span className="text-[11px] text-zinc-400">
                {providerName}
                {d.voice ? ` · ${d.voice}` : ''}
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                <button className="btn-ghost px-2 py-1 text-xs" onClick={() => onEdit(d)}>
                  ✏️
                </button>
                <button
                  className="btn-ghost px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 dark:text-red-400"
                  onClick={() => onDelete(d)}
                >
                  🗑️
                </button>
              </span>
            </div>

            <p className="mt-1.5 text-sm text-zinc-700 dark:text-zinc-300">{d.text}</p>

            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
              {/* 对齐检查 */}
              {hasAudio ? (
                misaligned ? (
                  <span className="badge bg-red-500/15 text-red-500" title="音频时长和台词窗口差超过 0.5 秒">
                    ⚠ 未对齐：音频 {d.audioDuration.toFixed(1)}s / 窗口 {span.toFixed(1)}s（差 {diff > 0 ? '+' : ''}
                    {diff.toFixed(1)}s）
                  </span>
                ) : (
                  <span className="badge bg-emerald-500/15 text-emerald-500">对齐 ✓（{d.audioDuration.toFixed(1)}s）</span>
                )
              ) : (
                <span className="text-[11px] text-zinc-400">未上传音频</span>
              )}
              {d.fileName && (
                <span className="font-mono text-[11px] text-zinc-400">{d.fileName}</span>
              )}

              {/* 试听（本次会话内有效） */}
              {audioUrls.get(d.id) && (
                <audio controls src={audioUrls.get(d.id)} className="h-8 max-w-[220px]" />
              )}

              <label className="btn-outline ml-auto cursor-pointer text-xs">
                ⬆ 上传配音
                <input
                  ref={(el) => {
                    if (el) inputRefs.current.set(d.id, el);
                    else inputRefs.current.delete(d.id);
                  }}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUpload(d, f);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}
