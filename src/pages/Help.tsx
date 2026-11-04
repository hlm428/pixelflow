import { useMemo, useState } from 'react';
import { HELP_SECTIONS, FAQ } from '../data/helpContent';
import { QC_CHECKLIST } from '../lib/qc';

const NAV = [
  ...HELP_SECTIONS.map((s) => ({ id: s.id, title: s.title, icon: s.icon })),
  { id: 'faq', title: '常见问题 30 条', icon: '💬' },
];

/** 帮助文档页：工作流 / 角色卡 / 接力 / QC / 配音 / FAQ 30 条 */
export default function Help() {
  const [active, setActive] = useState('workflow');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [faqKw, setFaqKw] = useState('');

  const faqList = useMemo(() => {
    const kw = faqKw.trim().toLowerCase();
    if (!kw) return FAQ;
    return FAQ.filter((f) => f.q.toLowerCase().includes(kw) || f.a.toLowerCase().includes(kw));
  }, [faqKw]);

  const section = HELP_SECTIONS.find((s) => s.id === active);

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-1.5 p-4">
        <h1 className="text-lg font-semibold">帮助</h1>
        <span className="text-xs text-zinc-400">全流程说明书 · 每个功能页右上角也有「?」按钮</span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                active === n.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
              onClick={() => setActive(n.id)}
            >
              {n.icon} {n.title}
            </button>
          ))}
        </div>
      </div>

      {section && (
        <div className="card p-5">
          <h2 className="text-base font-bold">
            {section.icon} {section.title}
          </h2>
          <div className="mt-3 space-y-4">
            {section.blocks.map((b, i) => (
              <div key={i}>
                {b.h && <h3 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{b.h}</h3>}
                {b.p && <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{b.p}</p>}
                {b.list && (
                  <ul className="mt-1.5 space-y-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {b.list.map((li) => (
                      <li key={li} className="flex gap-2">
                        <span className="text-indigo-400">·</span>
                        {li}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          {/* QC 专项：15 项表格 */}
          {section.id === 'qc' && (
            <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60">
                  <tr className="text-zinc-500">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">检查项</th>
                    <th className="px-3 py-2 font-medium">说明</th>
                    <th className="px-3 py-2 font-medium">例子</th>
                    <th className="px-3 py-2 font-medium">关键项</th>
                  </tr>
                </thead>
                <tbody>
                  {QC_CHECKLIST.map((c) => (
                    <tr key={c.id} className="border-t border-zinc-100 dark:border-zinc-800/60">
                      <td className="px-3 py-1.5 font-mono">{c.id}</td>
                      <td className="px-3 py-1.5 font-medium">{c.name}</td>
                      <td className="px-3 py-1.5 text-zinc-500">{c.detail}</td>
                      <td className="px-3 py-1.5 text-zinc-500">{c.example}</td>
                      <td className="px-3 py-1.5">{c.required ? '⭐' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {active === 'faq' && (
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold">💬 常见问题（{faqList.length}）</h2>
            <input
              className="input ml-auto max-w-xs"
              placeholder="搜问题…"
              value={faqKw}
              onChange={(e) => setFaqKw(e.target.value)}
            />
          </div>
          <div className="mt-3 space-y-1.5">
            {faqList.map((f, i) => (
              <div key={f.q} className="rounded-lg border border-zinc-200 dark:border-zinc-800">
                <button
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-indigo-500">Q</span>
                  {f.q}
                  <span className="ml-auto text-xs text-zinc-400">{openFaq === i ? '▲' : '▼'}</span>
                </button>
                {openFaq === i && (
                  <p className="border-t border-zinc-100 px-3.5 py-2.5 text-sm leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
                    {f.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
