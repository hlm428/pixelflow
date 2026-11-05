import type { AspectRatio } from '../types/project';
import type { TransitionMode } from '../store/settingsStore';
import { ASPECT_RESOLUTION } from '../types/project';

export interface FfmpegParams {
  projectName: string;
  aspectRatio: AspectRatio;
  /** 单镜时长（秒）：10 或 5 */
  shotLength: number;
  /** 已通过片段（按分镜顺序）：分镜号 + 文件名 */
  clips: Array<{ shotIndex: number; fileName: string }>;
  /** 缺通过片段的分镜号（脚本里会注释提醒） */
  missingShotIndexes: number[];
  transition: TransitionMode;
  /** 溶解时长（秒），v2 实测 0.125 = 3 帧 @24fps */
  dissolveSec: number;
  /** 色彩统一（v2 参考值：1.04 / 1.06 / 0.01） */
  contrast: number;
  saturation: number;
  brightness: number;
  /** 胶片颗粒强度（v2 参考 8） */
  noise: number;
  /** 已完成配音的旁白：文件名 + 对位时间（秒） */
  narrations: Array<{ fileName: string; startSec: number; speaker: string }>;
  /** 背景音乐文件名 */
  musicFile: string;
  /** 音乐相对旁白的音量（默认 -15dB） */
  musicVolumeDb: number;
  outputName: string;
  crf: number;
}

/** 预估文件大小（MB）：码率 × 时长 */
export function estimateFileMB(durationSec: number, bitrateMbps: number): number {
  return Math.round(((bitrateMbps * 1_000_000) / 8) * durationSec / 1024 / 1024);
}

function preprocessFilter(p: FfmpegParams): string {
  const { width, height } = ASPECT_RESOLUTION[p.aspectRatio];
  return [
    `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
    'setsar=1',
    `eq=contrast=${p.contrast}:saturation=${p.saturation}:brightness=${p.brightness}`,
    `noise=alls=${p.noise}:allf=t`,
  ].join(',');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** xfade 链的 offset：第 k 个接缝 = k×10 − k×dissolve（v2 实测 0/9.875/19.75/…） */
export function xfadeOffset(k: number, shotLength = 10, dissolveSec = 0.125): number {
  return Math.round((k * shotLength - k * dissolveSec) * 1000) / 1000;
}

/** 生成 ffmpeg 拼接脚本（bash + bat 双版本） */
export function buildFfmpegScript(p: FfmpegParams): { bash: string; bat: string } {
  const { width, height } = ASPECT_RESOLUTION[p.aspectRatio];
  const filter = preprocessFilter(p);
  const n = p.clips.length;
  const totalSec = n * p.shotLength - (p.transition === '溶解' ? (n - 1) * p.dissolveSec : 0);

  const missingNote =
    p.missingShotIndexes.length > 0
      ? `# ⚠ 以下分镜没有「通过」片段，未计入拼接：${p.missingShotIndexes.map((i) => `#${i}`).join(' ')}\n`
      : '';

  const procLines = p.clips
    .map(
      (c, i) =>
        `# 分镜 #${c.shotIndex}\nffmpeg -y -i "${c.fileName}" -vf "${filter}" -c:v libx264 -crf ${p.crf} -preset medium -an proc_${pad2(i + 1)}.mp4`,
    )
    .join('\n');

  const concatList = p.clips.map((_, i) => `file 'proc_${pad2(i + 1)}.mp4'`).join('\n');

  // 溶解：xfade 链；硬切：concat demuxer
  const mergeBlockBash =
    p.transition === '溶解' && n >= 2
      ? [
          `# 2) 接缝 ${p.dissolveSec}s 溶解（xfade 链），片长约 ${totalSec.toFixed(3)} 秒`,
          `ffmpeg -y ${p.clips.map((_, i) => `-i proc_${pad2(i + 1)}.mp4`).join(' ')} \\`,
          `  -filter_complex "${p.clips.slice(1).map((_, k) => {
            const prev = k === 0 ? '0:v' : `v${pad2(k)}`;
            const offset = xfadeOffset(k + 1, p.shotLength, p.dissolveSec);
            return `[${prev}][${k + 1}:v]xfade=transition=fade:duration=${p.dissolveSec}:offset=${offset}[v${pad2(k + 1)}]`;
          }).join(';')}" \\`,
          `  -map "[v${pad2(n - 1)}]" -c:v libx264 -crf ${p.crf} -preset medium merged.mp4`,
        ].join('\n')
      : [
          `# 2) 硬切拼接`,
          `printf "${concatList.replace(/'/g, "'").split('\n').map((l) => `${l}\\n`).join('')}" > concat.txt`,
          `ffmpeg -y -f concat -safe 0 -i concat.txt -c copy merged.mp4`,
        ].join('\n');

  // 音频：旁白 adelay 对位 + 音乐低 musicVolumeDb
  const audioLines: string[] = [];
  if (p.narrations.length > 0) {
    p.narrations.forEach((nar, i) => {
      const ms = Math.round(nar.startSec * 1000);
      audioLines.push(`[${i + 1}:a]adelay=${ms}|${ms},volume=1.0[nar${i}]`);
    });
    const musicIdx = 1 + p.narrations.length;
    if (p.musicFile.trim()) {
      audioLines.push(`[${musicIdx}:a]volume=${p.musicVolumeDb}dB[music]`);
      audioLines.push(
        `${p.narrations.map((_, i) => `[nar${i}]`).join('')}[music]amix=inputs=${p.narrations.length + 1}:normalize=0[aout]`,
      );
    } else {
      audioLines.push(
        `${p.narrations.map((_, i) => `[nar${i}]`).join('')}amix=inputs=${p.narrations.length}:normalize=0[aout]`,
      );
    }
  }

  const audioInputs = [
    ...p.narrations.map((nar) => `-i "${nar.fileName}"`),
    ...(p.musicFile.trim() ? [`-i "${p.musicFile.trim()}"`] : []),
  ].join(' ');

  const audioBlock =
    audioLines.length > 0
      ? [
          `# 3) 音频：旁白对位 + 音乐低 ${Math.abs(p.musicVolumeDb)}dB（旁白只在成片剪好后才配）`,
          `ffmpeg -y -i merged.mp4 ${audioInputs} \\`,
          `  -filter_complex "${audioLines.join(';')}" \\`,
          `  -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k ${p.outputName}`,
        ].join('\n')
      : [
          `# 3) 无音轨（无配音方案）：直接封装`,
          `ffmpeg -y -i merged.mp4 -c:v copy -an ${p.outputName}`,
        ].join('\n');

  const bash = [
    `#!/usr/bin/env bash`,
    `# PixelFlow 拼接脚本 —— 项目「${p.projectName}」`,
    `# 片段与音频文件放在本脚本同目录，运行：bash run.sh`,
    `set -e`,
    ``,
    `# 0) 规格：${width}×${height}（${p.aspectRatio}）· 转场：${p.transition} · CRF ${p.crf} · 色彩 eq=${p.contrast}/${p.saturation}/${p.brightness} · 颗粒 noise=${p.noise}`,
    missingNote,
    `# 1) 逐段统一分辨率 + 色彩统一 + 轻胶片颗粒（去原音轨）`,
    procLines,
    ``,
    mergeBlockBash,
    ``,
    audioBlock,
    ``,
    `echo "完成：${p.outputName}（H.264 + faststart，手机可直接播放）"`,
    ``,
  ].join('\n');

  // bat 版：同流程，Windows 引号规则
  const batMerge =
    p.transition === '溶解' && n >= 2
      ? [
          `REM 2) 接缝溶解（xfade 链）`,
          `ffmpeg -y ${p.clips.map((_, i) => `-i proc_${pad2(i + 1)}.mp4`).join(' ')} -filter_complex "${p.clips.slice(1).map((_, k) => {
            const prev = k === 0 ? '0:v' : `v${pad2(k)}`;
            const offset = xfadeOffset(k + 1, p.shotLength, p.dissolveSec);
            return `[${prev}][${k + 1}:v]xfade=transition=fade:duration=${p.dissolveSec}:offset=${offset}[v${pad2(k + 1)}]`;
          }).join(';')}" -map "[v${pad2(n - 1)}]" -c:v libx264 -crf ${p.crf} -preset medium merged.mp4`,
        ].join('\n')
      : [
          `REM 2) 硬切拼接`,
          `(echo ${concatList.split('\n').join('& echo ')})> concat.txt`,
          `ffmpeg -y -f concat -safe 0 -i concat.txt -c copy merged.mp4`,
        ].join('\n');

  const batAudio =
    audioLines.length > 0
      ? [
          `REM 3) 音频：旁白对位 + 音乐低 ${Math.abs(p.musicVolumeDb)}dB`,
          `ffmpeg -y -i merged.mp4 ${audioInputs} -filter_complex "${audioLines.join(';')}" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k ${p.outputName}`,
        ].join('\n')
      : [`REM 3) 无音轨`, `ffmpeg -y -i merged.mp4 -c:v copy -an ${p.outputName}`].join('\n');

  const bat = [
    `@echo off`,
    `REM PixelFlow 拼接脚本 —— 项目「${p.projectName}」`,
    `REM 片段与音频文件放在本脚本同目录，双击或 cmd 运行 run.bat`,
    missingNote.replace(/^#/gm, 'REM'),
    `REM 1) 逐段统一分辨率 + 色彩统一 + 轻胶片颗粒`,
    procLines.replace(/^ffmpeg/m, 'ffmpeg'),
    ``,
    batMerge,
    ``,
    batAudio,
    ``,
    `echo 完成：${p.outputName}`,
    `pause`,
    ``,
  ].join('\n');

  return { bash, bat };
}
