export interface NavItem {
  to: string;
  label: string;
  icon: string;
}

/** 左侧导航 / 手机底部 tab 共用的 12 个入口 */
export const NAV_ITEMS: NavItem[] = [
  { to: '/projects', label: '项目', icon: '📁' },
  { to: '/shots', label: '故事分镜', icon: '🎬' },
  { to: '/characters', label: '角色卡', icon: '👥' },
  { to: '/prompts', label: '提示词', icon: '✍️' },
  { to: '/clips', label: '片段', icon: '🎞️' },
  { to: '/qc', label: 'QC', icon: '✅' },
  { to: '/dubbing', label: '配音', icon: '🎙️' },
  { to: '/export', label: '拼接', icon: '🧩' },
  { to: '/library', label: '素材库', icon: '📚' },
  { to: '/dashboard', label: '看板', icon: '📊' },
  { to: '/settings', label: '设置', icon: '⚙️' },
  { to: '/help', label: '帮助', icon: '❓' },
];
