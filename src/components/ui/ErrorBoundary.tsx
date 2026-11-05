import { Component, type ReactNode } from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

/** 全局渲染错误兜底：崩溃时显示错误信息而不是白屏/假死 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('PixelFlow 渲染错误', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-6 dark:bg-zinc-950">
          <div className="card max-w-lg p-6 text-center">
            <div className="text-4xl">💥</div>
            <h1 className="mt-3 text-lg font-bold">界面出错了</h1>
            <p className="mt-2 break-all rounded-lg bg-zinc-100 p-3 text-left font-mono text-xs text-red-500 dark:bg-zinc-800">
              {this.state.error.message}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              你的数据还在浏览器里，不会丢。点下面的按钮重载界面；如果反复出现，到「设置」导出数据后「恢复示例项目」。
            </p>
            <button className="btn-primary mt-4" onClick={() => window.location.reload()}>
              重载界面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
