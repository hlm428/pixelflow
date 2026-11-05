import { useRef, useState } from 'react';
import { useSettingsStore, type QCStrictness, type Theme, type TransitionMode } from '../store/settingsStore';
import { useToastStore } from '../store/toastStore';
import {
  clearAllData,
  projectsRepo,
  shotsRepo,
  charactersRepo,
  clipsRepo,
  qcReportsRepo,
  promptsRepo,
  templatesRepo,
  dubbingsRepo,
  musicsRepo,
} from '../lib/db';
import { downloadFile } from '../lib/utils';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import { useTemplateStore } from '../store/templateStore';
import { useProjectStore } from '../store/projectStore';
import { reseedDemoProjects } from '../lib/seed';
import { APP_VERSION } from '../lib/version';
import {
  ASPECT_RATIOS,
  PROJECT_STYLES,
  type AspectRatio,
  type ProjectStyle,
} from '../types/project';

/** AI 视频生成服务配置卡：选服务商、填密钥、测试连接 */
function AIServiceCard() {
  const s = useSettingsStore();
  const showToast = useToastStore((s2) => s2.show);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const cfg = { provider: s.aiProvider, endpoint: s.aiEndpoint, apiKey: s.aiKey, model: s.aiModel };
  const set = (patch: Partial<{ aiProvider: typeof s.aiProvider; aiEndpoint: string; aiKey: string; aiModel: string }>) =>
    s.update(patch);

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { testConnection } = await import('../lib/ai');
      const r = await testConnection(cfg);
      setTestResult(r);
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="card space-y-3 p-5">
      <h2 className="text-sm font-semibold">🤖 AI 生成服务</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span>服务商</span>
          <select
            className="input mt-1"
            value={s.aiProvider}
            onChange={(e) => set({ aiProvider: e.target.value as typeof s.aiProvider })}
          >
            <option value="none">未配置（手动上传模式）</option>
            <option value="fal">fal.ai（推荐，浏览器直连，有可灵/海螺等模型）</option>
            <option value="custom">自定义接口（自建代理 / OpenAI 兼容聚合站）</option>
          </select>
        </label>
        <label className="block text-sm">
          <span>模型 id</span>
          <input
            className="input mt-1 font-mono"
            value={s.aiModel}
            onChange={(e) => set({ aiModel: e.target.value })}
            placeholder={s.aiProvider === 'fal' ? 'fal-ai/kling-video/v1/standard/text-to-video' : '如 muse-10s'}
          />
        </label>
        {s.aiProvider === 'custom' && (
          <label className="block text-sm sm:col-span-2">
            <span>接口地址（完整 POST 地址，返回 JSON 里要能找到视频地址或任务 id）</span>
            <input
              className="input mt-1 font-mono"
              value={s.aiEndpoint}
              onChange={(e) => set({ aiEndpoint: e.target.value })}
              placeholder="https://my-proxy.example.com/video/generate"
            />
          </label>
        )}
        <label className="block text-sm sm:col-span-2">
          <span>API Key（只存在你的浏览器 localStorage，不上传）</span>
          <input
            className="input mt-1 font-mono"
            type="password"
            value={s.aiKey}
            onChange={(e) => set({ aiKey: e.target.value })}
            placeholder={s.aiProvider === 'fal' ? 'fal key：$id:$secret 格式' : 'Bearer 密钥'}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-outline" onClick={() => void runTest()} disabled={testing}>
          {testing ? '测试中…' : '🔌 测试连接'}
        </button>
        <a
          className="text-xs text-indigo-500 hover:underline"
          href={s.aiProvider === 'fal' ? 'https://fal.ai/dashboard/keys' : '#'}
          target="_blank"
          rel="noreferrer"
        >
          {s.aiProvider === 'fal' ? '去 fal.ai 拿 API Key ↗（每条约 ¥2–5，先充值）' : ''}
        </a>
      </div>
      {testResult && (
        <p className={`rounded-lg px-3 py-2 text-xs ${testResult.ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-500'}`}>
          {testResult.ok ? '✅ ' : '❌ '}
          {testResult.message}
        </p>
      )}
      <p className="text-[11px] leading-relaxed text-zinc-400">
        工作原理：分镜页/片段页点「🤖 AI 生成」→ 用该分镜的最新提示词调用服务 → 出片自动下载存进浏览器、读时长分辨率、自动打分 → 状态变「待质检」。
        注意：① 生成按服务商计费；② 部分服务商禁止网页直连（CORS），测试连接会提示，那种需要自建代理后填代理地址；③ PixelAIGC/Muse 是网页操作没有公开
        API，用它做片时走「手动上传」流程即可。
      </p>
    </div>
  );
}

/** 全量导出结构（9 张表） */
async function buildFullExport(): Promise<string> {
  const [projects, shots, characters, clips, qcReports, prompts, templates, dubbings, musics] =
    await Promise.all([
      projectsRepo.list(),
      shotsRepo.list(),
      charactersRepo.list(),
      clipsRepo.list(),
      qcReportsRepo.list(),
      promptsRepo.list(),
      templatesRepo.list(),
      dubbingsRepo.list(),
      musicsRepo.list(),
    ]);
  return JSON.stringify(
    {
      app: 'pixelflow-full',
      version: 1,
      exportedAt: Date.now(),
      data: { projects, shots, characters, clips, qcReports, prompts, templates, dubbings, musics },
    },
    null,
    2,
  );
}

/** 设置页：默认值、配额、QC 严格度、主题、数据管理 */
export default function Settings() {
  const s = useSettingsStore();
  const showToast = useToastStore((s2) => s2.show);
  const fileRef = useRef<HTMLInputElement>(null);

  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<File | null>(null);
  const [clearText, setClearText] = useState('');

  const handleExportAll = async () => {
    const json = await buildFullExport();
    downloadFile(`pixelflow-backup-${new Date().toISOString().slice(0, 10)}.json`, json);
    showToast('已导出全部数据（9 张表）');
  };

  const handleRestore = async () => {
    if (!pendingRestore) return;
    try {
      const parsed: unknown = JSON.parse(await pendingRestore.text());
      const o = parsed as { app?: string; data?: Record<string, unknown[]> };
      if (o.app !== 'pixelflow-full' || !o.data) {
        showToast('导入失败：不是 PixelFlow 全量备份文件（项目级导出请到项目页导入）');
        return;
      }
      await clearAllData();
      if (o.data.projects) await projectsRepo.saveMany(o.data.projects as never[]);
      if (o.data.shots) await shotsRepo.saveMany(o.data.shots as never[]);
      if (o.data.characters) await charactersRepo.saveMany(o.data.characters as never[]);
      if (o.data.clips) await clipsRepo.saveMany(o.data.clips as never[]);
      if (o.data.qcReports) await qcReportsRepo.saveMany(o.data.qcReports as never[]);
      if (o.data.prompts) await promptsRepo.saveMany(o.data.prompts as never[]);
      if (o.data.templates) await templatesRepo.saveMany(o.data.templates as never[]);
      if (o.data.dubbings) await dubbingsRepo.saveMany(o.data.dubbings as never[]);
      if (o.data.musics) await musicsRepo.saveMany(o.data.musics as never[]);
      showToast('恢复成功，刷新页面…');
      setTimeout(() => window.location.reload(), 800);
    } catch {
      showToast('导入失败：JSON 解析出错');
    }
    setConfirmRestore(false);
  };

  const handleClear = async () => {
    await clearAllData();
    setConfirmClear(false);
    showToast('已清空全部数据，刷新页面…');
    setTimeout(() => window.location.reload(), 800);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="card p-5">
        <h1 className="text-lg font-semibold">
          设置 <span className="ml-1 font-mono text-xs text-zinc-400">v{APP_VERSION}</span>
        </h1>
        <p className="mt-1 text-xs text-zinc-500">全部存在浏览器本地（localStorage + IndexedDB），不联网。</p>
      </div>

      {/* 创作默认值 */}
      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-semibold">创作默认值</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span>默认画幅</span>
            <select
              className="input mt-1"
              value={s.defaultAspectRatio}
              onChange={(e) => s.update({ defaultAspectRatio: e.target.value as AspectRatio })}
            >
              {ASPECT_RATIOS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span>默认风格</span>
            <select
              className="input mt-1"
              value={s.defaultStyle}
              onChange={(e) => s.update({ defaultStyle: e.target.value as ProjectStyle })}
            >
              {PROJECT_STYLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span>默认转场</span>
            <select
              className="input mt-1"
              value={s.defaultTransition}
              onChange={(e) => s.update({ defaultTransition: e.target.value as TransitionMode })}
            >
              <option value="硬切">硬切</option>
              <option value="溶解">溶解</option>
            </select>
          </label>
        </div>
      </div>

      {/* AI 生成服务 */}
      <AIServiceCard />

      {/* 生产参数 */}
      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-semibold">生产参数</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span>每日配额上限（片段数）</span>
            <input
              className="input mt-1 font-mono"
              type="number"
              min={1}
              value={s.dailyQuota}
              onChange={(e) => s.update({ dailyQuota: Math.max(1, Number(e.target.value) || 1) })}
            />
            <span className="mt-0.5 block text-[11px] text-zinc-400">用到 80% 变黄、100% 变红（看板 + 顶栏）</span>
          </label>
          <label className="block text-sm">
            <span>QC 严格程度</span>
            <select
              className="input mt-1"
              value={s.qcStrictness}
              onChange={(e) => s.update({ qcStrictness: e.target.value as QCStrictness })}
            >
              <option value="严格">严格：15 项全过（跳过也算不过）</option>
              <option value="标准">标准：无不通过即过</option>
              <option value="宽松">宽松：关键项无不通过即过</option>
            </select>
          </label>
        </div>
      </div>

      {/* 主题 */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold">主题</h2>
        <div className="mt-2.5 flex gap-2">
          {(['dark', 'light'] as Theme[]).map((t) => (
            <button
              key={t}
              className={s.theme === t ? 'btn-primary' : 'btn-outline'}
              onClick={() => s.update({ theme: t })}
            >
              {t === 'dark' ? '🌙 暗色（默认）' : '☀️ 亮色'}
            </button>
          ))}
        </div>
      </div>

      {/* 数据管理 */}
      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-semibold">数据管理</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline" onClick={() => void handleExportAll()}>
            ⬇ 导出全部数据
          </button>
          <button
            className="btn-outline"
            onClick={async () => {
              await templatesRepo.clear();
              await useTemplateStore.getState().loadAll();
              showToast('已重灌提示词模板库（260 条）');
            }}
          >
            ♻ 重灌提示词模板库
          </button>
          <button
            className="btn-outline"
            onClick={async () => {
              const n = await reseedDemoProjects();
              await useProjectStore.getState().load();
              showToast(`已恢复 ${n} 个示例项目（含分镜和提示词）`);
            }}
          >
            🎬 恢复示例项目（5 个）
          </button>
          <label className="btn-outline cursor-pointer">
            ⬆ 导入全量备份（覆盖现有数据）
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setPendingRestore(f);
                  setConfirmRestore(true);
                }
                e.target.value = '';
              }}
            />
          </label>
          <button className="btn-danger" onClick={() => setConfirmClear(true)}>
            🗑 清空全部数据
          </button>
        </div>
        <p className="text-[11px] text-zinc-400">
          全量备份包含 9 张表（项目 / 分镜 / 角色卡 / 片段 / QC / 提示词 / 模板 / 配音 / 音乐）。导入会先清空再恢复，请先导出备份。
        </p>
      </div>

      <ConfirmDialog
        open={confirmRestore}
        title="确认恢复"
        message={`用「${pendingRestore?.name ?? ''}」覆盖现有全部数据？此操作不可撤销，建议先导出备份。`}
        confirmText="覆盖恢复"
        danger
        onConfirm={() => void handleRestore()}
        onCancel={() => {
          setConfirmRestore(false);
          setPendingRestore(null);
        }}
      />

      <Modal
        open={confirmClear}
        title="确认清空"
        onClose={() => {
          setConfirmClear(false);
          setClearText('');
        }}
      >
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          将删除所有项目、分镜、角色卡、片段、QC、提示词、模板、配音、音乐数据，且不可撤销。建议先导出备份。
        </p>
        <input
          className="input mt-3"
          placeholder='输入「清空」以确认'
          value={clearText}
          onChange={(e) => setClearText(e.target.value)}
          autoFocus
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="btn-outline"
            onClick={() => {
              setConfirmClear(false);
              setClearText('');
            }}
          >
            取消
          </button>
          <button className="btn-danger" onClick={() => void handleClear()} disabled={clearText.trim() !== '清空'}>
            清空全部
          </button>
        </div>
      </Modal>
    </div>
  );
}
