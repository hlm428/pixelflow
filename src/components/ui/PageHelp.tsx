import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PAGE_HELP } from '../../data/helpContent';
import Modal from './Modal';

/** 每个功能页右下角的「?」按钮：点击弹出当前页的速查说明 */
export default function PageHelp() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // 项目详情页复用项目页说明
  const path = location.pathname.startsWith('/projects/') ? '/projects' : location.pathname;
  const help = PAGE_HELP[path];
  if (!help) return null;

  return (
    <>
      <button
        className="fixed bottom-20 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white shadow-lg transition-transform hover:scale-105 md:bottom-6"
        onClick={() => setOpen(true)}
        title={`${help.title} · 帮助`}
      >
        ?
      </button>
      <Modal open={open} title={`❓ ${help.title}`} onClose={() => setOpen(false)}>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{help.text}</p>
        <p className="mt-3 text-[11px] text-zinc-400">更完整的说明在「帮助」页。</p>
      </Modal>
    </>
  );
}
