import { useState } from 'react';
import Modal from '../ui/Modal';
import { useProviderStore } from '../../store/providerStore';
import { useToastStore } from '../../store/toastStore';
import { daysUntil } from '../../lib/utils';
import { speakSample, stopSample } from '../../lib/audio';
import type { TTSProvider } from '../../types/dubbing';

/** 供应商卡片到期配色：已过期红、7 天内黄 */
export function deadlineBadge(p: TTSProvider): { text: string; cls: string } | null {
  const days = daysUntil(p.deadline);
  if (days === null) return null;
  if (days <= 0) return { text: '已到期', cls: 'bg-red-500/15 text-red-500' };
  if (days <= 7) return { text: `${days} 天后到期`, cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' };
  return { text: `剩 ${days} 天`, cls: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400' };
}

/** TTS 供应商管理表：额度 / 截止日期可编辑，快到期高亮提醒 */
export default function TTSProviderList() {
  const providers = useProviderStore((s) => s.providers);
  const updateProvider = useProviderStore((s) => s.updateProvider);
  const resetProviders = useProviderStore((s) => s.resetProviders);
  const showToast = useToastStore((s) => s.show);

  const [editing, setEditing] = useState<TTSProvider | null>(null);
  const [freeQuota, setFreeQuota] = useState('');
  const [price, setPrice] = useState('');
  const [deadline, setDeadline] = useState('');

  const openEdit = (p: TTSProvider) => {
    stopSample();
    setEditing(p);
    setFreeQuota(p.freeQuota);
    setPrice(p.price);
    setDeadline(p.deadline);
  };

  const saveEdit = () => {
    if (!editing) return;
    updateProvider(editing.id, { freeQuota: freeQuota.trim(), price: price.trim(), deadline });
    setEditing(null);
    showToast(`已更新「${editing.name}」的额度信息`);
  };

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800">
            <th className="px-3 py-2.5 font-medium">供应商</th>
            <th className="px-3 py-2.5 font-medium">免费额度</th>
            <th className="px-3 py-2.5 font-medium">价格</th>
            <th className="px-3 py-2.5 font-medium">截止</th>
            <th className="px-3 py-2.5 font-medium">适合</th>
            <th className="px-3 py-2.5 font-medium">接入</th>
            <th className="px-3 py-2.5 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {providers.map((p) => {
            const badge = deadlineBadge(p);
            return (
              <tr key={p.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                <td className="px-3 py-2.5">
                  <a href={p.website} target="_blank" rel="noreferrer" className="font-medium text-indigo-500 hover:underline">
                    {p.name}
                  </a>
                  <div className="mt-0.5 text-[11px] text-zinc-400">{p.bestFor}</div>
                </td>
                <td className="px-3 py-2.5 text-xs">{p.freeQuota}</td>
                <td className="px-3 py-2.5 text-xs text-zinc-500">{p.price}</td>
                <td className="px-3 py-2.5">
                  {badge ? (
                    <span className={`badge ${badge.cls}`}>
                      {p.deadline ? `${p.deadline} · ${badge.text}` : badge.text}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">无</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-zinc-500">
                  {p.pros}
                  <div className="text-[11px] text-red-400/80">{p.cons}</div>
                </td>
                <td className="max-w-[220px] px-3 py-2.5">
                  <code className="block truncate text-[10px] text-zinc-400" title={p.endpoint}>
                    {p.endpoint}
                  </code>
                  <span className="text-[10px] text-zinc-400">{p.needsV1 ? '带 /v1' : '无 /v1'}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex gap-1">
                    <button
                      className="btn-ghost px-2 py-1 text-xs"
                      title="浏览器本机合成试听（近似音色），准确音色点供应商名去官网 Demo"
                      onClick={() => {
                        const isEn = /英文|英语|english/i.test(`${p.bestFor}${p.notes}`);
                        const ok = speakSample(isEn ? 'en' : 'zh');
                        showToast(
                          ok
                            ? `🔊 正在试听「${p.name}」的本机近似音色${isEn ? '（英文）' : '（中文）'}——准确音色请点供应商名去官网`
                            : '这个浏览器不支持语音合成，请点供应商名去官网试听',
                        );
                      }}
                    >
                      🔊 试听
                    </button>
                    <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(p)}>
                      编辑
                    </button>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex items-center gap-3 border-t border-zinc-100 px-3 py-2 dark:border-zinc-800/60">
        <span className="text-[11px] text-zinc-400">
          额度 / 价格 / 截止日期以官方页面为准；改动存本地。「🔊 试听」用浏览器本机语音合成近似该家的语种与语气，准确音色以官网 Demo 为准；再点一次或切页会自动停止。
        </span>
        <button
          className="btn-ghost ml-auto text-xs"
          onClick={() => {
            resetProviders();
            showToast('已恢复默认供应商数据');
          }}
        >
          恢复默认
        </button>
      </div>

      <Modal open={editing !== null} title={`编辑「${editing?.name ?? ''}」`} onClose={() => setEditing(null)}>
        <div className="space-y-3">
          <label className="block text-sm">
            <span>免费额度</span>
            <input className="input mt-1" value={freeQuota} onChange={(e) => setFreeQuota(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span>价格</span>
            <input className="input mt-1" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span>截止日期（留空 = 无截止）</span>
            <input
              className="input mt-1"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setEditing(null)}>
              取消
            </button>
            <button className="btn-primary" onClick={saveEdit}>
              保存
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
