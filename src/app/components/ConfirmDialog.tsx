"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
          />
          <div className="fixed inset-0 z-[91] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-[#0a1628] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl pointer-events-auto"
            >
              <h3 className="text-lg font-black text-white mb-2">{title}</h3>
              <p className="text-slate-400 text-sm mb-6">{message}</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white bg-white/[0.05] border border-white/10 transition-colors"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    danger
                      ? "bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30"
                      : "bg-[#bef264]/20 border border-[#bef264]/30 text-[#bef264] hover:bg-[#bef264]/30"
                  }`}
                >
                  {confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
