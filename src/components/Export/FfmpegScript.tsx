import { useState } from 'react';
import { useToastStore } from '../../store/toastStore';
import { copyText, downloadFile } from '../../lib/utils';

interface FfmpegScriptProps {
  script: { bash: string; bat: string };
  musicFile: string;
  empty: boolean;
}

/** ffmpeg 拼接脚本卡片：bash/bat 切换 + 预览 + 复制 + 下载 */
export default function FfmpegScript({ script, musicFile, empty }: FfmpegScriptProps) {
  const showToast = useToastStore((s) => s.show);
  const [format, setFormat] = useState<'bash' | 'bat'>('bash');
  const content = format === 'bash' ? script.bash : script.bat;

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">ffmpeg 拼接脚本</h2>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button
            className={`btn-outline px-2 py-1 text-xs ${format === 'bash' ? 'border-indigo-500 text-indigo-500' : ''}`}
            onClick={() => setFormat('bash')}
          >
            run.sh (mac/linux)
          </button>
          <button
            className={`btn-outline px-2 py-1 text-xs ${format === 'bat' ? 'border-indigo-500 text-indigo-500' : ''}`}
            onClick={() => setFormat('bat')}
          >
            run.bat (windows)
          </button>
          <button
            className="btn-ghost text-xs"
            onClick={async () => {
              const ok = await copyText(content);
              showToast(ok ? '已复制' : '复制失败');
            }}
          >
            📋 复制
          </button>
          <button
            className="btn-outline text-xs"
            onClick={() => {
              downloadFile('run.sh', script.bash, 'text/x-shellscript');
              downloadFile('run.bat', script.bat, 'text/plain');
              showToast('已下载 run.sh + run.bat');
            }}
          >
            ⬇ 下载
          </button>
        </div>
      </div>
      <pre className="mt-2.5 max-h-96 overflow-auto rounded-lg bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-emerald-400">
        {content || '-- 没有可拼接的片段 --'}
      </pre>
      <p className="mt-1.5 text-[11px] text-zinc-400">
        用法：把脚本和「通过」的片段文件、旁白音频、{musicFile || 'bgm.mp3'} 放同一目录运行。本机需装 ffmpeg。
      </p>
      {empty && (
        <p className="mt-1 text-[11px] text-amber-500">当前没有任何「通过」片段 —— 先到 QC 页过检。</p>
      )}
    </div>
  );
}
