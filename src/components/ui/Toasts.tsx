import { useToastStore } from '../../store/toastStore';

/** 全局轻提示渲染层（挂在 App 里） */
export default function Toasts() {
  const items = useToastStore((s) => s.items);
  if (items.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-12">
      {items.map((t) => (
        <div
          key={t.id}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white shadow-lg dark:bg-zinc-700"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
