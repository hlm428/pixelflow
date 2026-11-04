import Modal from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 二次确认弹窗（删除等危险操作用） */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确认',
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-outline" onClick={onCancel}>
          取消
        </button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
