/** 浏览器内读取音频时长 */
export async function readAudioMeta(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`无法读取音频「${file.name}」的时长`));
    };
    audio.src = url;
  });
}

/** 浏览器本机语音合成试听：中文 / 英文各一句样例，返回 false 表示浏览器不支持 */
export function speakSample(lang: 'zh' | 'en'): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(
    lang === 'zh'
      ? '你好呀，这是本机试听音色。今天也要一起做出好看的片子哦。'
      : 'Hello, this is a voice preview from your browser. Have a nice day.',
  );
  utter.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
  const match = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang));
  if (match) utter.voice = match;
  synth.speak(utter);
  return true;
}

/** 停止本机试听 */
export function stopSample(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}
