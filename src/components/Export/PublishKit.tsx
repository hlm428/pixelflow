import { useMemo, useState } from 'react';
import { useToastStore } from '../../store/toastStore';
import { generatePublishKit, kitToText, type PublishKit } from '../../lib/publish';
import { copyText } from '../../lib/utils';
import type { Project } from '../../types/project';

const PLATFORMS: Array<{ key: keyof PublishKit; label: string }> = [
  { key: 'douyin', label: '抖音' },
  { key: 'bilibili', label: 'B站' },
  { key: 'channels', label: '视频号' },
  { key: 'youtube', label: 'YouTube' },
];

interface PublishKitProps {
  project: Project;
}

/** 发布套件卡片：成片标题 → 四平台文案（自动带 AI 声明） */
export default function PublishKitCard({ project }: PublishKitProps) {
  const showToast = useToastStore((s) => s.show);
  const [filmTitle, setFilmTitle] = useState(project.name);
  const [platform, setPlatform] = useState<keyof PublishKit>('douyin');

  const kit = useMemo(() => generatePublishKit(project, filmTitle), [project, filmTitle]);

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">发布套件</h2>
        <span className="text-[11px] text-zinc-400">自动带 AI 声明；画面内不烧录水印文字</span>
        <input
          className="input ml-auto max-w-[280px]"
          value={filmTitle}
          onChange={(e) => setFilmTitle(e.target.value)}
          placeholder="成片标题"
        />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {PLATFORMS.map((pl) => (
          <button
            key={pl.key}
            className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
              platform === pl.key
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}
            onClick={() => setPlatform(pl.key)}
          >
            {pl.label}
          </button>
        ))}
      </div>
      <pre className="mt-2.5 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
        {kitToText(kit, platform)}
      </pre>
      <div className="mt-2 flex justify-end">
        <button
          className="btn-outline text-xs"
          onClick={async () => {
            const ok = await copyText(kitToText(kit, platform));
            showToast(ok ? '已复制发布文案' : '复制失败');
          }}
        >
          📋 复制{PLATFORMS.find((pl) => pl.key === platform)?.label}文案
        </button>
      </div>
    </div>
  );
}
