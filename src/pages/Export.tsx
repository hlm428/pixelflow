import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { useSettingsStore, type TransitionMode } from '../store/settingsStore';
import { useShotStore } from '../store/shotStore';
import { useClipStore } from '../store/clipStore';
import { useDubbingStore } from '../store/dubbingStore';
import { buildFfmpegScript, estimateFileMB } from '../lib/ffmpeg';
import FfmpegScript from '../components/Export/FfmpegScript';
import PublishKitCard from '../components/Export/PublishKit';
import { ASPECT_RESOLUTION } from '../types/project';

/** 拼接与导出页：参数面板 + 成片预估 + ffmpeg 脚本 + 发布套件 */
export default function Export() {
  const currentProjectId = useSettingsStore((s) => s.currentProjectId);
  const defaultTransition = useSettingsStore((s) => s.defaultTransition);
  const projects = useProjectStore((s) => s.projects);
  const project = projects.find((p) => p.id === currentProjectId) ?? null;

  const shots = useShotStore((s) => s.shots);
  const loadShots = useShotStore((s) => s.load);
  const clips = useClipStore((s) => s.clips);
  const loadClips = useClipStore((s) => s.load);
  const dubbings = useDubbingStore((s) => s.dubbings);
  const loadDubbings = useDubbingStore((s) => s.load);

  // 拼接参数（v2 实测参考值作默认）
  const [transition, setTransition] = useState<TransitionMode>(defaultTransition);
  const [dissolveSec, setDissolveSec] = useState('0.125');
  const [contrast, setContrast] = useState('1.04');
  const [saturation, setSaturation] = useState('1.06');
  const [brightness, setBrightness] = useState('0.01');
  const [noise, setNoise] = useState('8');
  const [crf, setCrf] = useState('18');
  const [musicFile, setMusicFile] = useState('bgm.mp3');
  const [musicVolumeDb, setMusicVolumeDb] = useState('-15');
  const [outputName, setOutputName] = useState('');
  const [bitrate, setBitrate] = useState('8');

  useEffect(() => {
    if (!currentProjectId) return;
    void loadShots(currentProjectId);
    void loadClips(currentProjectId);
    void loadDubbings(currentProjectId);
  }, [currentProjectId, loadShots, loadClips, loadDubbings]);

  useEffect(() => {
    if (project) setOutputName(`${project.name.replace(/\s+/g, '_')}-final.mp4`);
    // 仅切换项目时重置
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 按分镜顺序取「通过」片段（每镜取最优，无最优取第一个通过的）
  const passedClips = useMemo(() => {
    const result: Array<{ shotIndex: number; fileName: string }> = [];
    for (const s of shots) {
      const candidates = clips.filter((c) => c.shotId === s.id && c.status === '通过');
      if (candidates.length === 0) continue;
      const best = candidates.find((c) => c.isBest) ?? candidates[0];
      result.push({ shotIndex: s.index, fileName: best.fileName });
    }
    return result;
  }, [shots, clips]);

  const missingShotIndexes = useMemo(
    () =>
      shots
        .filter((s) => !clips.some((c) => c.shotId === s.id && c.status === '通过'))
        .map((s) => s.index),
    [shots, clips],
  );

  const narrations = useMemo(
    () =>
      dubbings
        .filter((d) => d.status === '已完成' && d.fileName)
        .map((d) => ({ fileName: d.fileName, startSec: d.startSec, speaker: d.speaker })),
    [dubbings],
  );

  const script = useMemo(() => {
    if (!project) return { bash: '', bat: '' };
    return buildFfmpegScript({
      projectName: project.name,
      aspectRatio: project.aspectRatio,
      clips: passedClips,
      missingShotIndexes,
      transition,
      dissolveSec: Number(dissolveSec) || 0.125,
      contrast: Number(contrast) || 1.04,
      saturation: Number(saturation) || 1.06,
      brightness: Number(brightness) || 0.01,
      noise: Number(noise) || 8,
      narrations,
      musicFile,
      musicVolumeDb: Number(musicVolumeDb) || -15,
      outputName: outputName || 'final.mp4',
      crf: Number(crf) || 18,
    });
  }, [
    project,
    passedClips,
    missingShotIndexes,
    transition,
    dissolveSec,
    contrast,
    saturation,
    brightness,
    noise,
    narrations,
    musicFile,
    musicVolumeDb,
    outputName,
    crf,
  ]);

  const estimate = useMemo(() => {
    const segCount = passedClips.length;
    const dur = segCount * 10 - (transition === '溶解' ? Math.max(0, segCount - 1) * (Number(dissolveSec) || 0.125) : 0);
    const { width, height } = ASPECT_RESOLUTION[project?.aspectRatio ?? '16:9'];
    return {
      duration: dur,
      resolution: `${width}×${height}`,
      sizeMB: estimateFileMB(dur, Number(bitrate) || 8),
      fullDuration: shots.length * 10,
    };
  }, [passedClips, transition, dissolveSec, project?.aspectRatio, bitrate, shots.length]);

  if (!currentProjectId || !project) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <div className="text-4xl">🧩</div>
        <p className="mt-3 text-sm text-zinc-500">先在顶部选择一个项目。</p>
        <Link to="/projects" className="btn-primary mt-4 inline-flex">
          去项目页
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">拼接与导出</h1>
          <span className="text-sm text-zinc-500">{project.name}</span>
          <span className="badge bg-emerald-500/15 text-emerald-500">
            已通过片段 {passedClips.length} / {shots.length} 段
          </span>
          {missingShotIndexes.length > 0 && (
            <span className="badge bg-amber-500/15 text-amber-600 dark:text-amber-400">
              ⚠ 缺片段分镜：{missingShotIndexes.map((i) => `#${i}`).join(' ')}（脚本会跳过它们）
            </span>
          )}
        </div>
        <p className="mt-1.5 text-xs text-zinc-500">
          流程（v2 实测）：每段统一分辨率 → 色彩统一 → 轻颗粒 → 接缝溶解 → 旁白对位 + 音乐 -15dB → H.264 faststart 输出。
        </p>
      </div>

      {/* 参数 */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold">拼接参数</h2>
        <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block text-xs">
            <span className="text-zinc-500">转场</span>
            <select
              className="input mt-1"
              value={transition}
              onChange={(e) => setTransition(e.target.value as TransitionMode)}
            >
              <option value="硬切">硬切</option>
              <option value="溶解">溶解（xfade）</option>
            </select>
          </label>
          <label className="block text-xs">
            <span className="text-zinc-500">溶解时长（秒，3帧=0.125）</span>
            <input
              className="input mt-1 font-mono"
              value={dissolveSec}
              onChange={(e) => setDissolveSec(e.target.value)}
              disabled={transition === '硬切'}
            />
          </label>
          <label className="block text-xs">
            <span className="text-zinc-500">对比度（参考 1.04）</span>
            <input className="input mt-1 font-mono" value={contrast} onChange={(e) => setContrast(e.target.value)} />
          </label>
          <label className="block text-xs">
            <span className="text-zinc-500">饱和度（参考 1.06）</span>
            <input className="input mt-1 font-mono" value={saturation} onChange={(e) => setSaturation(e.target.value)} />
          </label>
          <label className="block text-xs">
            <span className="text-zinc-500">亮度（参考 0.01）</span>
            <input className="input mt-1 font-mono" value={brightness} onChange={(e) => setBrightness(e.target.value)} />
          </label>
          <label className="block text-xs">
            <span className="text-zinc-500">颗粒 noise（参考 8）</span>
            <input className="input mt-1 font-mono" value={noise} onChange={(e) => setNoise(e.target.value)} />
          </label>
          <label className="block text-xs">
            <span className="text-zinc-500">CRF（质量，18=高）</span>
            <input className="input mt-1 font-mono" value={crf} onChange={(e) => setCrf(e.target.value)} />
          </label>
          <label className="block text-xs">
            <span className="text-zinc-500">音乐文件名</span>
            <input className="input mt-1 font-mono" value={musicFile} onChange={(e) => setMusicFile(e.target.value)} />
          </label>
          <label className="block text-xs">
            <span className="text-zinc-500">音乐音量（dB，默认 -15）</span>
            <input className="input mt-1 font-mono" value={musicVolumeDb} onChange={(e) => setMusicVolumeDb(e.target.value)} />
          </label>
          <label className="block text-xs">
            <span className="text-zinc-500">输出文件名</span>
            <input className="input mt-1 font-mono" value={outputName} onChange={(e) => setOutputName(e.target.value)} />
          </label>
          <label className="block text-xs">
            <span className="text-zinc-500">预估码率（Mbps）</span>
            <input className="input mt-1 font-mono" value={bitrate} onChange={(e) => setBitrate(e.target.value)} />
          </label>
          <div className="flex items-end">
            <span className="text-[11px] text-zinc-400">
              旁白 {narrations.length} 条自动对位（adelay），音乐比旁白低 {Math.abs(Number(musicVolumeDb) || 15)}dB
            </span>
          </div>
        </div>
      </div>

      {/* 成片预估 */}
      <div className="card grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <div>
          <div className="text-xs text-zinc-500">本次拼接时长</div>
          <div className="font-mono text-xl font-bold">{estimate.duration.toFixed(1)}s</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">全部分镜时长</div>
          <div className="font-mono text-xl font-bold">{estimate.fullDuration}s</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">输出分辨率</div>
          <div className="font-mono text-xl font-bold">{estimate.resolution}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">预估文件大小（{bitrate}Mbps）</div>
          <div className="font-mono text-xl font-bold">≈ {estimate.sizeMB} MB</div>
        </div>
      </div>

      <FfmpegScript script={script} musicFile={musicFile} empty={passedClips.length === 0} />

      <PublishKitCard project={project} />
    </div>
  );
}
