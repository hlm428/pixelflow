import { useEffect, useRef, useState } from 'react';
import { usePromptStore } from '../../store/promptStore';
import { useToastStore } from '../../store/toastStore';
import { copyText } from '../../lib/utils';
import { SHOT_STATUS_STYLE } from '../../lib/shot';
import type { Shot } from '../../types/shot';
import TemplatePicker from './TemplatePicker';
import PromptHistory from './PromptHistory';

interface PromptEditorProps {
  shot: Shot | null;
}

/** 提示词编辑器：大文本框 + 字数 + 撤销重做 + 模板插入 + 保存新版本 + 历史回滚 */
export default function PromptEditor({ shot }: PromptEditorProps) {
  const generate = usePromptStore((s) => s.generate);
  const saveManual = usePromptStore((s) => s.saveManual);
  const rollback = usePromptStore((s) => s.rollback);
  const byShot = usePromptStore((s) => s.byShot);
  const showToast = useToastStore((s) => s.show);

  const [text, setText] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [busy, setBusy] = useState(false);

  // 撤销 / 重做栈
  const [past, setPast] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);
  const lastInputTime = useRef(0);
  const shotIdRef = useRef<string | null>(null);

  const versions = shot ? byShot(shot.id) : [];
  const latest = versions.length > 0 ? versions[versions.length - 1] : null;

  // 切换分镜时重置编辑器和历史栈
  useEffect(() => {
    if (shot && shot.id !== shotIdRef.current) {
      shotIdRef.current = shot.id;
      setText(latest?.content ?? '');
      setPast([]);
      setFuture([]);
    }
    if (!shot) {
      shotIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shot?.id]);

  const pushHistory = (prev: string) => {
    setPast((p) => [...p, prev]);
    setFuture([]);
  };

  const onInput = (v: string) => {
    const now = Date.now();
    if (now - lastInputTime.current > 800) {
      pushHistory(text);
    }
    lastInputTime.current = now;
    setText(v);
  };

  const undo = () => {
    if (past.length === 0) return;
    setFuture((f) => [text, ...f]);
    setText(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
  };

  const redo = () => {
    if (future.length === 0) return;
    setPast((p) => [...p, text]);
    setText(future[0]);
    setFuture((f) => f.slice(1));
  };

  if (!shot) {
    return (
      <div className="card flex min-h-[300px] flex-col items-center justify-center p-10 text-center">
        <div className="text-4xl">✍️</div>
        <p className="mt-3 text-sm text-zinc-500">从左侧选择一个分镜，生成或编辑它的提示词。</p>
      </div>
    );
  }

  const dirty = latest ? text !== latest.content : text.trim().length > 0;

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const record = await generate(shot.id);
      if (record) {
        pushHistory(text);
        setText(record.content);
        showToast(`已生成 v${record.version}（角色卡原文 + 场景 + 风格 + 运镜 + 接力句）`);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!dirty) return;
    setBusy(true);
    try {
      const record = await saveManual(shot.id, text);
      if (record) showToast(`已保存 v${record.version}`);
    } finally {
      setBusy(false);
    }
  };

  const handleRollback = async (version: number) => {
    setRollingBack(true);
    try {
      const record = await rollback(shot.id, version);
      if (record) {
        pushHistory(text);
        setText(record.content);
        showToast(`已回滚：旧 v${version} 内容另存为新 v${record.version}`);
      }
    } finally {
      setRollingBack(false);
    }
  };

  const handleInsert = (content: string) => {
    pushHistory(text);
    setText(text.trim() ? `${text.trimEnd()}\n${content}` : content);
    showToast('已插入模板词（记得保存为新版本）');
  };

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">
          分镜 #{shot.index} 提示词
          {latest && <span className="ml-2 text-sm text-zinc-400">当前 v{latest.version}</span>}
        </h2>
        <span className={`badge ${SHOT_STATUS_STYLE[shot.status]}`}>{shot.status}</span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button className="btn-ghost px-2 text-xs" onClick={undo} disabled={past.length === 0} title="撤销">
            ↶
          </button>
          <button className="btn-ghost px-2 text-xs" onClick={redo} disabled={future.length === 0} title="重做">
            ↷
          </button>
          <button className="btn-outline text-xs" onClick={() => setPickerOpen(true)}>
            📚 插入模板
          </button>
          <button
            className="btn-ghost text-xs"
            onClick={async () => {
              const ok = await copyText(text);
              showToast(ok ? '已复制' : '复制失败');
            }}
            disabled={!text.trim()}
          >
            📋 复制
          </button>
        </div>
      </div>

      <textarea
        className="input mt-3 min-h-[220px] font-mono text-xs leading-relaxed"
        value={text}
        onChange={(e) => onInput(e.target.value)}
        placeholder="点「⚡ 按公式生成」自动拼：角色卡原文 + 场景 + 风格 + 运镜 + 接力句；或手动输入。"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-zinc-400">{text.length} 字</span>
        <button className="btn-outline text-xs" onClick={() => void handleGenerate()} disabled={busy}>
          ⚡ 按公式生成
        </button>
        <button className="btn-primary text-xs" onClick={() => void handleSave()} disabled={!dirty || busy}>
          保存为新版本
        </button>
        <span className="ml-auto text-[11px] text-zinc-400">
          每次保存生成新版本，可对比任意两版并回滚
        </span>
      </div>

      <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <h3 className="mb-2 text-sm font-semibold">历史版本（{versions.length}）</h3>
        <PromptHistory versions={versions} onRollback={handleRollback} rollingBack={rollingBack} />
      </div>

      <TemplatePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onInsert={handleInsert}
      />
    </div>
  );
}
