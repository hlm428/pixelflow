import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useSettingsStore } from './store/settingsStore';
import './index.css';

/** 主题同步：settingsStore 变化时切换 html.dark */
function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

applyTheme(useSettingsStore.getState().theme);
useSettingsStore.subscribe((s, prev) => {
  if (s.theme !== prev.theme) applyTheme(s.theme);
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
