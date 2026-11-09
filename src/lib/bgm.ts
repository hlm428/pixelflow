import type { Music } from '../types/music';
import { uid } from './utils';

/**
 * 内置 BGM：纯程序化生成的免授权背景音乐（正弦音符 + 包络 → WAV）。
 * 每首 32 秒左右、可循环听感，32000 Hz 单声道控制体积（约 2 MB/首）。
 * 首次启动音乐库为空时灌入。
 */

const SAMPLE_RATE = 32000;

/** 16-bit PCM WAV 编码 */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buf);
  const w = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  w(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  w(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

interface NoteSpec {
  freq: number;
  start: number;
  dur: number;
  gain: number;
}

/** A4=440，半音偏移 → 频率 */
const N = (semisFromA4: number): number => 440 * 2 ** (semisFromA4 / 12);

/** 渲染音符序列：快起慢衰包络 + 首尾淡入淡出（循环更顺） */
function renderNotes(notes: NoteSpec[], totalSec: number): Float32Array {
  const len = Math.ceil(totalSec * SAMPLE_RATE);
  const out = new Float32Array(len);
  for (const n of notes) {
    const start = Math.floor(n.start * SAMPLE_RATE);
    const nLen = Math.floor(n.dur * SAMPLE_RATE);
    for (let i = 0; i < nLen && start + i < len; i++) {
      const t = i / SAMPLE_RATE;
      const env = Math.min(1, t * 40) * Math.exp(-t * 2.2);
      out[start + i] += Math.sin(2 * Math.PI * n.freq * t) * n.gain * env;
    }
  }
  const fade = Math.floor(1.2 * SAMPLE_RATE);
  for (let i = 0; i < fade; i++) {
    const g = i / fade;
    out[i] *= g;
    out[len - 1 - i] *= g;
  }
  return out;
}

/** 低音持续 + 琶音：一个和弦占 chordSec 秒 */
function chordNotes(
  bass: number,
  tones: number[],
  start: number,
  chordSec: number,
  stepSec: number,
): NoteSpec[] {
  const notes: NoteSpec[] = [
    { freq: N(bass), start, dur: chordSec, gain: 0.1 },
    { freq: N(bass + 12), start, dur: chordSec, gain: 0.045 },
  ];
  const count = Math.floor(chordSec / stepSec);
  for (let i = 0; i < count; i++) {
    notes.push({
      freq: N(tones[(i + start * 3) % tones.length]),
      start: start + i * stepSec,
      dur: stepSec * 1.6,
      gain: 0.075,
    });
  }
  return notes;
}

interface TrackSpec {
  name: string;
  fileName: string;
  tags: string[];
  bass: number[]; // 每个和弦的低音（半音，A4=0）
  tones: number[][]; // 每个和弦的琶音音集（半音，A4=0）
  chordSec: number;
  stepSec: number;
}

const TRACKS: TrackSpec[] = [
  {
    // 慢速小调，安静夜里听（半音以 A4=440 为 0：A3=-12，C4=-9，C5=3）
    name: '月见夜色（内置）',
    fileName: 'builtin-moonlit-night.wav',
    tags: ['内置', '安静', '夜'],
    bass: [-12, -16, -21, -14], // Am F C G 的低音（A3 F3 C3 G3）
    tones: [
      [0, 3, 7, 10], // Am7：A4 C5 E5 G5
      [-4, 0, 3, 7], // Fmaj7：F4 A4 C5 E5
      [-9, -5, -2, 2], // Cmaj7：C4 E4 G4 B4
      [-2, 2, 5, 7], // G6：G4 B4 D5 E5
    ],
    chordSec: 8,
    stepSec: 0.5,
  },
  {
    // 明亮大调，清晨汽水感（进度走两遍凑满 32 秒）
    name: '柑橘晨光（内置）',
    fileName: 'builtin-citrus-morning.wav',
    tags: ['内置', '轻快', '晨'],
    bass: [-21, -14, -12, -16, -21, -14, -12, -16], // C G Am F ×2（C3 G3 A3 F3）
    tones: [
      [3, 7, 10, 14], // Cmaj7：C5 E5 G5 B5
      [-2, 2, 5, 10], // G：G4 B4 D5 G5
      [0, 3, 7, 10], // Am7：A4 C5 E5 G5
      [-4, 0, 3, 7], // Fmaj7：F4 A4 C5 E5
      [3, 7, 10, 14],
      [-2, 2, 5, 10],
      [0, 3, 7, 10],
      [-4, 0, 3, 7],
    ],
    chordSec: 4,
    stepSec: 0.375,
  },
  {
    // 稀疏冷调，法医的实验室
    name: '云笙冷调（内置）',
    fileName: 'builtin-cool-blue.wav',
    tags: ['内置', '冷调', '稀疏'],
    bass: [-19, -11, -14, -12], // Dm B♭ Gm A 的低音（D3 B♭3 G3 A3）
    tones: [
      [-7, -4, 0, 3], // Dm7：D4 F4 A4 C5
      [-11, -7, -4, -1], // B♭：B♭3 D4 F4 B♭4
      [-14, -11, -7, -4], // Gm7：G3 B♭3 D4 F4
      [-12, -8, -5, 0], // A：A3 C♯4 E4 A4
    ],
    chordSec: 8,
    stepSec: 1,
  },
  {
    // 暖 pad，黄昏河堤
    name: '落日余温（内置）',
    fileName: 'builtin-sunset-warmth.wav',
    tags: ['内置', '暖', '黄昏'],
    bass: [-16, -12, -14, -21], // F Am G C 的低音（F3 A3 G3 C3）
    tones: [
      [-4, 0, 3, 7], // Fmaj7：F4 A4 C5 E5
      [0, 3, 7, 10], // Am7：A4 C5 E5 G5
      [-2, 2, 5, 7], // G6：G4 B4 D5 E5
      [-9, -5, -2, 2], // Cmaj7：C4 E4 G4 B4
    ],
    chordSec: 8,
    stepSec: 0.75,
  },
];

/** 生成全部内置 BGM 记录（blob 已编好，可直接入库） */
export function buildBuiltinMusics(): Music[] {
  return TRACKS.map((t) => {
    const chordCount = t.bass.length;
    const totalSec = chordCount * t.chordSec;
    const notes: NoteSpec[] = [];
    t.bass.forEach((b, i) => {
      notes.push(...chordNotes(b, t.tones[i], i * t.chordSec, t.chordSec, t.stepSec));
    });
    const samples = renderNotes(notes, totalSec);
    return {
      id: uid(),
      name: t.name,
      fileName: t.fileName,
      duration: Math.round(totalSec),
      license: '内置自制 · 免授权（本工作台程序化生成）',
      usedIn: [],
      tags: t.tags,
      audioBlob: encodeWav(samples, SAMPLE_RATE),
    };
  });
}
