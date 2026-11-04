import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// 纯静态部署：base 用相对路径，build 后直接静态服务器都能跑
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
