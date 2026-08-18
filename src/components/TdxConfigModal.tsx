import React, { useState, useEffect } from "react";
import { ShieldCheck, Key, X, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TdxConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientSecret: string;
  onSave: (clientId: string, secret: string) => void;
  onClear: () => void;
}

export default function TdxConfigModal({
  isOpen,
  onClose,
  clientId: initialClientId,
  clientSecret: initialClientSecret,
  onSave,
  onClear,
}: TdxConfigModalProps) {
  const [clientId, setClientId] = useState(initialClientId);
  const [clientSecret, setClientSecret] = useState(initialClientSecret);

  // Sync state with props
  useEffect(() => {
    setClientId(initialClientId);
    setClientSecret(initialClientSecret);
  }, [initialClientId, initialClientSecret]);

  const handleSave = () => {
    onSave(clientId.trim(), clientSecret.trim());
  };

  const handleClear = () => {
    setClientId("");
    setClientSecret("");
    onClear();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl z-10"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors duration-150 p-1 rounded-lg hover:bg-slate-800"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-sans">交通部 TDX 金鑰設定</h3>
                <p className="text-xs text-slate-400">輸入憑證以獲取公部門真實即時路況數據</p>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-slate-400" />
                  TDX Client ID
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="例如：your_client_id-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-lg focus:outline-none text-white placeholder-slate-600 transition-colors duration-150 font-mono text-xs ${
                    clientId.trim() && clientId.trim().split("-").slice(1).join("-").length < 36
                      ? "border-rose-500 focus:border-rose-500"
                      : "border-slate-800 focus:border-emerald-500"
                  }`}
                />
                {clientId.trim() && clientId.trim().split("-").slice(1).join("-").length < 36 && (
                  <p className="text-[11px] text-rose-400 mt-1.5 leading-relaxed font-sans">
                    ⚠️ 偵測到您的 Client ID 疑似被截斷！完整的 ID 格式應包含您的使用者名稱與一個完整 36 字元的 UUID（格式如：jerry09032-f563b9b2-6af4-4437-xxxx-xxxxxxxxxxxx）。目前偵測到的 UUID 部分長度不足。
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-slate-400" />
                  TDX Client Secret
                </label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="例如：xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-lg focus:outline-none text-white placeholder-slate-600 transition-colors duration-150 font-mono text-xs ${
                    clientSecret.trim() && clientSecret.trim().length < 36
                      ? "border-rose-500 focus:border-rose-500"
                      : "border-slate-800 focus:border-emerald-500"
                  }`}
                />
                {clientSecret.trim() && clientSecret.trim().length < 36 && (
                  <p className="text-[11px] text-rose-400 mt-1.5 leading-relaxed font-sans">
                    ⚠️ 偵測到您的 Client Secret 長度不足（目前只有 {clientSecret.trim().length} 字元，標準 UUID 應為 36 字元）。請重新從 TDX 官網複製完整的密鑰！
                  </p>
                )}
              </div>

              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
                <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-emerald-400" />
                  如何取得金鑰？
                </p>
                <p className="leading-relaxed">
                  請至{" "}
                  <a
                    href="https://tdx.transportdata.tw/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline font-semibold"
                  >
                    TDX 運輸資料流通服務官網
                  </a>{" "}
                  免費註冊會員，並在「會員專區 ＞ 我的 API 金鑰」中申請即可取得。
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 mt-6">
              <button
                onClick={handleSave}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 px-4 rounded-xl transition duration-150 text-sm shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                儲存並測試連線
              </button>
              <button
                onClick={handleClear}
                className="bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 font-semibold py-2.5 px-4 rounded-xl transition duration-150 text-sm border border-slate-700 cursor-pointer"
              >
                清除
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
