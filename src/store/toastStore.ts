import { create } from 'zustand';

interface ToastItem {
  id: number;
  message: string;
}

let nextId = 1;

interface ToastState {
  items: ToastItem[];
  show: (message: string) => void;
  dismiss: (id: number) => void;
}

/** 轻提示（复制成功等操作反馈），2 秒自动消失 */
export const useToastStore = create<ToastState>()((set, get) => ({
  items: [],
  show(message) {
    const id = nextId++;
    set({ items: [...get().items, { id, message }] });
    setTimeout(() => get().dismiss(id), 2000);
  },
  dismiss(id) {
    set({ items: get().items.filter((t) => t.id !== id) });
  },
}));
