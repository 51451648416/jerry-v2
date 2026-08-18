import React, { useState, useEffect } from "react";
import { X, Network, RotateCw, AlertTriangle, CheckCircle, Info, Server } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientSecret: string;
}

export default function DiagnosticModal({
  isOpen,
  onClose,
  clientId,
  clientSecret,
}: DiagnosticModalProps) {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState({
    environment: "Checking...",
    backendState: "Checking...",
    credentialsState: "Checking...",
    connectionState: "Not Checked",
    details: "",
  });

  const runDiagnostic = async () => {
    setRunning(true);
    setReport((prev) => ({
      ...prev,
      connectionState: "Testing",
      details: "正在測試與後台及 TDX 伺服器的連線能力...",
    }));

    // 1. Check protocol/env
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const envStr = `${window.location.protocol}//${window.location.host} (${isLocal ? "本地開發環境" : "雲端託管環境"})`;

    // 2. Check credentials state
    const hasCreds = !!clientId && !!clientSecret;
    const credState = hasCreds ? "已設定 (Configured)" : "尚未設定 (Not Configured)";

    // 3. Check backend health
    let backendActive = false;
    try {
      const hRes = await fetch("/api/health");
      if (hRes.ok) {
        backendActive = true;
      }
    } catch (e) {
      console.error("Backend health check failed:", e);
    }

    if (!hasCreds) {
      setReport({
        environment: envStr,
        backendState: backendActive ? "正常運作中 (Active)" : "連線失敗 (Inactive)",
        credentialsState: credState,
        connectionState: "Not Checked",
        details: "尚未提供 TDX Client ID 與 Client Secret，無法進行金鑰連線測試。請點擊「TDX 金鑰設定」填入憑證。",
      });
      setRunning(false);
      return;
    }

    // 4. Test actual token fetch using our server-side proxy
    try {
      const tRes = await fetch("/api/tdx/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret }),
      });

      if (tRes.ok) {
        const data = await tRes.json();
        setReport({
          environment: envStr,
          backendState: backendActive ? "正常運作中 (Active)" : "正常運作中 (Active)",
          credentialsState: credState,
          connectionState: "Success",
          details: `已成功通過代理獲取 Bearer Token（過期時間：${data.expires_in} 秒）。這代表您的 Client ID 與 Client Secret 完全正確，且系統完全不受任何跨網域 (CORS) 協定限制限制！`,
        });
      } else {
        const errData = await tRes.json().catch(() => ({}));
        setReport({
          environment: envStr,
          backendState: backendActive ? "正常運作中 (Active)" : "連線失敗 (Inactive)",
          credentialsState: credState,
          connectionState: "Failed",
          details: `後台代理向 TDX 伺服器請求 Token 失敗。請檢查您的金鑰是否輸入正確。錯誤詳情: ${
            errData.error || "HTTP " + tRes.status
          }`,
        });
      }
    } catch (err: any) {
      setReport({
        environment: envStr,
        backendState: backendActive ? "正常運作中 (Active)" : "連線失敗 (Inactive)",
        credentialsState: credState,
        connectionState: "Failed",
        details: `請求發送失敗，可能遭遇網路中斷或後台服務尚未啟動。錯誤: ${err.message}`,
      });
    }

    setRunning(false);
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostic();
    }
  }, [isOpen, clientId, clientSecret]);

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
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto"
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
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Network className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-sans">TDX 連線智慧診斷報告</h3>
                <p className="text-xs text-slate-400">一指排除所有跨網域與後端代理限制，成功對接真實路況</p>
              </div>
            </div>

            {/* Diagnostics Stats */}
            <div className="space-y-4 text-xs leading-relaxed">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">網頁執行環境:</span>
                  <span className="font-bold text-sky-400">{report.environment}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-800/60 pt-2.5">
                  <span className="text-slate-400">後台代理伺服器:</span>
                  <span
                    className={`font-semibold ${
                      report.backendState.includes("正常") ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {report.backendState}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-800/60 pt-2.5">
                  <span className="text-slate-400">TDX 憑證狀態:</span>
                  <span
                    className={`font-semibold ${
                      report.credentialsState.includes("已設定") ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {report.credentialsState}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-800/60 pt-2.5">
                  <span className="text-slate-400">代理連線能力:</span>
                  <span
                    className={`font-bold ${
                      report.connectionState === "Success"
                        ? "text-emerald-400"
                        : report.connectionState === "Failed"
                        ? "text-rose-400"
                        : report.connectionState === "Testing"
                        ? "text-sky-400 animate-pulse"
                        : "text-slate-500"
                    }`}
                  >
                    {report.connectionState === "Success" && "✓ 成功 (SUCCESS)"}
                    {report.connectionState === "Failed" && "✗ 失敗 (FAILED)"}
                    {report.connectionState === "Testing" && "• 測試中 (TESTING...)"}
                    {report.connectionState === "Not Checked" && "未測試 (IDLE)"}
                  </span>
                </div>
              </div>

              {/* Status Details Message */}
              <div
                className={`p-4 rounded-xl border ${
                  report.connectionState === "Success"
                    ? "bg-emerald-950/20 border-emerald-800/50 text-slate-200"
                    : report.connectionState === "Failed"
                    ? "bg-rose-950/25 border-rose-900/50 text-slate-200"
                    : "bg-slate-950 border-slate-800 text-slate-300"
                }`}
              >
                <div className="flex gap-2.5 items-start">
                  {report.connectionState === "Success" ? (
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : report.connectionState === "Failed" ? (
                    <AlertTriangle className="h-4.5 w-4.5 text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="h-4.5 w-4.5 text-sky-400 shrink-0 mt-0.5" />
                  )}
                  <p className="text-xs">{report.details}</p>
                </div>
              </div>

              {/* Full-Stack Solution Guide */}
              <div className="bg-indigo-950/25 p-4 rounded-xl border border-indigo-900/40 text-slate-300 space-y-2">
                <p className="font-semibold text-indigo-400 flex items-center gap-1.5 text-xs">
                  <Server className="h-3.5 w-3.5" />
                  極致流暢：內置 Full-Stack 後台代理由來
                </p>
                <p className="text-slate-400 leading-relaxed">
                  本系統已內置 <strong>TypeScript/Express 代理伺服器</strong>，前端所有的 TDX API 請求皆由容器後台代為發送。這意味著您不再需要下載任何瀏覽器 CORS 插件，也不用擔心與公部門伺服器的直連安全協定衝突，更能阻隔 Client Secret 在瀏覽器中泄露。
                </p>
              </div>

              {/* Fallback Option */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5 text-slate-400">
                <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-amber-400" />
                  DEMO 模擬模式備援
                </p>
                <p className="leading-relaxed">
                  如果未設定 TDX 憑證，系統會自動在前端啟動<strong>「高度擬真路況模擬器」</strong>。它能完美模擬雪隧 11 個偵測節點與國道前方 10 公里的高動態車速、車流密度、擁擠指數，讓您能直接體驗智慧分流預測系統的所有功能與視覺動態效果。
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 mt-6">
              <button
                disabled={running}
                onClick={runDiagnostic}
                className="flex-1 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-800 text-slate-950 font-bold py-2.5 px-4 rounded-xl transition duration-150 text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
                重新執行連線診斷
              </button>
              <button
                onClick={onClose}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-4 rounded-xl transition duration-150 text-sm border border-slate-700 cursor-pointer"
              >
                關閉
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
