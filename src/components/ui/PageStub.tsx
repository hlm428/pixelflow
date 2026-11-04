interface PageStubProps {
  icon: string;
  title: string;
  milestone: string;
  features: string[];
}

/** 未完成里程碑的页面占位（随里程碑逐个替换成真页面） */
export default function PageStub({ icon, title, milestone, features }: PageStubProps) {
  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <div className="text-4xl">{icon}</div>
      <h1 className="mt-3 text-lg font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-zinc-500">该功能在 {milestone} 中实现</p>
      <ul className="mt-4 space-y-1.5 text-left text-sm text-zinc-500">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-indigo-400">·</span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
