import { useMemo, useState } from 'react';
import type { PromptRecord } from '../../types/shot';
import { diffLines } from '../../lib/prompt';

interface PromptHistoryProps {
  /** 该分镜的全部版本（version 升序） */
  versions: PromptRecord[];
  onRollback: (version: number) => void;
  rollingBack: boolean;
}

/** 提示词历史：任选两个版本看 diff，可回滚到旧版本 */
export default function PromptHistory({ versions, onRollback, rollingBack }: PromptHistoryProps) {
  const [aVersion, setAVersion] = useState<number | null>(null);
  const [bVersion, setBVersion] = useState<number | null>(null);

  const a = useMemo(() => {
    const v = aVersion ?? (versions.length >= 2 ? versions[versions.length - 2].version : null);
    return versions.find((p) => p.version === v) ?? null;
  }, [aVersion, versions]);

  const b = useMemo(() => {
    const v = bVersion ?? (versions.length >= 1 ? versions[versions.length - 1].version : null);
    return versions.find((p) => p.version === v) ?? null;
  }, [bVersion, versions]);

  const diff = useMemo(
    () => (a && b ? diffLines(a.content, b.content) : []),
    [a, b],
  );

  if (versions.length === 0) {
    return (
      <p className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-zinc-800/60">
        还没有历史版本。生成或保存一次提示词后出现 v1，再保存出现 v2。
      </p>
    );
  }

  const changed = diff.some((l) => l.type !== 'same');

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-500">版本对比</span>
        <select
          className="input w-28"
          value={a?.version ?? ''}
          onChange={(e) => setAVersion(Number(e.target.value))}
        >
          {versions.map((p) => (
            <option key={p.version} value={p.version}>
              v{p.version}
            </option>
          ))}
        </select>
        <span className="text-xs text-zinc-400">→</span>
        <select
          className="input w-28"
          value={b?.version ?? ''}
          onChange={(e) => setBVersion(Number(e.target.value))}
        >
          {versions.map((p) => (
            <option key={p.version} value={p.version}>
              v{p.version}
            </option>
          ))}
        </select>
        {a && versions.length >= 2 && (
          <button
            className="btn-outline ml-auto text-xs"
            disabled={rollingBack}
            onClick={() => onRollback(a.version)}
          >
            ↩️ 回滚到 v{a.version}
          </button>
        )}
      </div>

      <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-zinc-200 font-mono text-xs leading-relaxed dark:border-zinc-800">
        {changed ? (
          diff.map((l, i) => (
            <div
              key={i}
              className={`whitespace-pre-wrap px-2 py-0.5 ${
                l.type === 'del'
                  ? 'bg-red-500/10 text-red-500 line-through'
                  : l.type === 'add'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'text-zinc-400'
              }`}
            >
              {l.type === 'del' ? '- ' : l.type === 'add' ? '+ ' : '  '}
              {l.text || ' '}
            </div>
          ))
        ) : (
          <div className="px-3 py-3 text-zinc-400">两个版本内容相同</div>
        )}
      </div>
    </div>
  );
}
