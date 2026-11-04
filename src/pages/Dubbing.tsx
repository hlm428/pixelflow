import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { useSettingsStore } from '../store/settingsStore';
import { useToastStore } from '../store/toastStore';
import { useShotStore } from '../store/shotStore';
import { useDubbingStore } from '../store/dubbingStore';
import { useProviderStore } from '../store/providerStore';
import { DUBBING_SCHEMES, type Dubbing, type DubbingScheme } from '../types/dubbing';
import { deadlineBadge } from '../components/Dubbing/TTSProviderList';
import DubbingList from '../components/Dubbing/DubbingList';
import DubbingForm from '../components/Dubbing/DubbingForm';
import TTSProviderList from '../components/Dubbing/TTSProviderList';
import ConfirmDialog from '../components/ui/ConfirmDialog';

/** 配音页：台词管理 + 方案切换 + 规则提醒 + 供应商表 + 对齐检查 */
export default function Dubbing() {
  const currentProjectId = useSettingsStore((s) => s.currentProjectId);
  const projects = useProjectStore((s) => s.projects);
  const updateProject = useProjectStore((s) => s.update);
  const project = projects.find((p) => p.id === currentProjectId) ?? null;

  const shots = useShotStore((s) => s.shots);
  const loadShots = useShotStore((s) => s.load);
  const dubbings = useDubbingStore((s) => s.dubbings);
  const loadDubbings = useDubbingStore((s) => s.load);
  const importFromShots = useDubbingStore((s) => s.importFromShots);
  const providers = useProviderStore((s) => s.providers);
  const showToast = useToastStore((s) => s.show);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Dubbing | null>(null);
  const [deleting, setDeleting] = useState<Dubbing | null>(null);
  const [audioUrls, setAudioUrls] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!currentProjectId) return;
    void loadShots(currentProjectId);
    void loadDubbings(currentProjectId);
  }, [currentProjectId, loadShots, loadDubbings]);

  const handleAudioUrl = useCallback((id: string, url: string) => {
    setAudioUrls((prev) => new Map(prev).set(id, url));
  }, []);

  const expiringSoon = useMemo(
    () =>
      providers
        .map((p) => ({ p, badge: deadlineBadge(p) }))
        .filter(({ badge }) => badge !== null && (badge.cls.includes('red') || badge.cls.includes('amber'))),
    [providers],
  );

  if (!currentProjectId || !project) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <div className="text-4xl">🎙️</div>
        <p className="mt-3 text-sm text-zinc-500">先在顶部选择一个项目。</p>
        <Link to="/projects" className="btn-primary mt-4 inline-flex">
          去项目页
        </Link>
      </div>
    );
  }

  const scheme = project.dubbingScheme ?? '无配音';

  const handleImport = async () => {
    const dialogues = shots
      .filter((s) => s.dialogue.trim())
      .map((s) => ({ shotId: s.id, text: s.dialogue.trim(), startSec: s.startTime, endSec: s.startTime + 10 }));
    if (dialogues.length === 0) {
      showToast('分镜里还没有台词内容');
      return;
    }
    const n = await importFromShots(project.id, dialogues);
    showToast(n === 0 ? '分镜台词都已导入过' : `已导入 ${n} 条台词`);
  };

  return (
    <div className="space-y-4">
      {/* 规则提醒卡 */}
      <div className="card border-amber-500/30 bg-amber-500/5 p-4 dark:bg-amber-500/10">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">配音</h1>
          <span className="text-sm text-zinc-500">{project.name}</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500">配音方案</span>
            <select
              className="input w-32"
              value={scheme}
              onChange={(e) => {
                void updateProject(project.id, { dubbingScheme: e.target.value as DubbingScheme });
                showToast(`方案改为「${e.target.value}」`);
              }}
            >
              {DUBBING_SCHEMES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button className="btn-outline" onClick={() => void handleImport()}>
              ⬇ 从分镜导入台词
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              ＋ 新增台词
            </button>
          </div>
        </div>
        <ul className="mt-2 space-y-0.5 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
          <li>· 旁白只在成片剪好后才配，不要先配 —— 拼接顺序和时间点定了再录。</li>
          <li>· 混音时音乐音量比旁白低 15dB，别让 BGM 盖过人声（拼接脚本会自动处理）。</li>
          <li>· 每句旁白 5–8 秒，正好落在各自 10 秒分镜内（日语旁白按段对位的做法见帮助页）。</li>
        </ul>
        {expiringSoon.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-xs text-zinc-500">额度提醒：</span>
            {expiringSoon.map(({ p, badge }) => (
              <span key={p.id} className={`badge ${badge!.cls}`}>
                {p.name} {badge!.text}
              </span>
            ))}
          </div>
        )}
      </div>

      <DubbingList
        dubbings={dubbings}
        shots={shots}
        audioUrls={audioUrls}
        onEdit={(d) => {
          setEditing(d);
          setFormOpen(true);
        }}
        onDelete={(d) => setDeleting(d)}
        onAudioUrl={handleAudioUrl}
      />

      {/* 供应商表 */}
      <div className="pt-2">
        <h2 className="mb-2 text-base font-semibold">TTS 供应商（{providers.length}）</h2>
        <TTSProviderList />
      </div>

      <DubbingForm
        open={formOpen}
        projectId={project.id}
        shots={shots}
        dubbing={editing}
        onClose={() => setFormOpen(false)}
      />
      <ConfirmDialog
        open={deleting !== null}
        danger
        title="删除台词"
        message={`确定删除「${deleting?.speaker}：${deleting?.text.slice(0, 20) ?? ''}…」？`}
        confirmText="删除"
        onConfirm={async () => {
          if (deleting) {
            await useDubbingStore.getState().remove(deleting.id);
            showToast('已删除');
          }
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
