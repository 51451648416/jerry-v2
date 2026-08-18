import React, { useState, useEffect, useRef } from "react";
import { Lock, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle, X, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { loginAdmin, ADMIN_PASSWORD } from "../services/adminAuth";

interface BackendAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionTitle?: string;
  actionDescription?: string;
}

export default function BackendAuthModal({
  isOpen,
  onClose,
  onSuccess,
  actionTitle = "後台管理員權限驗證",
  actionDescription = "此動作涉及資料庫變更、模型權重調校或系統進階設定，請輸入後台管理密碼以取得授權。",
}: BackendAuthModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setErrorMsg(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg("請輸入後台密碼");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const isSuccess = loginAdmin(password);
    if (isSuccess) {
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } else {
      setIsSubmitting(false);
      setErrorMsg("密碼不正確，後台存取遭拒。請確認後再試！");
      inputRef.current?.select();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.35 }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-7 shadow-2xl z-10 text-slate-100"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="關閉"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3.5 mb-5">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">{actionTitle}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                  後台防護
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                {actionDescription}
              </p>
            </div>
          </div>

          {/* Prompt Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                  <span>請輸入後台授權密碼</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  (需管理員授權)
                </span>
              </label>

              <div className="relative">
                <input
                  ref={inputRef}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="請輸入後台管理密碼"
                  className={`w-full px-4 py-3 bg-slate-950 border rounded-2xl focus:outline-none text-white placeholder-slate-600 font-mono text-sm tracking-wider transition ${
                    errorMsg
                      ? "border-rose-500 focus:border-rose-500 ring-2 ring-rose-500/20"
                      : "border-slate-700 focus:border-amber-400 ring-2 ring-amber-400/10"
                  }`}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {errorMsg && (
                <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5 bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/60">
                  <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Quick Helper Pill */}
            <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl text-[11px] text-slate-400 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                驗證成功後將解鎖此工作階段的後台管理權限，您可以執行資料庫清除/刪除、機器學習調校與 TDX 密鑰修改。
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                取消返回
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>驗證並執行</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
