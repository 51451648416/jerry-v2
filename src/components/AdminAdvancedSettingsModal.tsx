import React, { useState, useEffect } from "react";
import {
  Settings,
  ShieldCheck,
  Lock,
  Unlock,
  Database,
  Cpu,
  Key,
  Trash2,
  RotateCcw,
  Play,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  Sliders,
  Sparkles,
  Server,
  Layers,
  Activity,
  Globe,
  Radio,
  Link2,
  ArrowRightLeft,
  Terminal,
  Loader2,
  ExternalLink,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  isAdminAuthenticated,
  logoutAdmin,
  ADMIN_PASSWORD,
} from "../services/adminAuth";
import {
  getStoredDataset,
  resetDataset,
  clearAllDataset,
  exportDatasetToCsv,
  deleteDatasetRecord,
} from "../services/datasetRepository";
import {
  getLearnedParameters,
  trainModelOnDataset,
  resetParametersToBaseline,
} from "../estimator/modelTrainingEngine";
import {
  LearnedModelParameters,
  CapturedDatasetRecord,
} from "../types";
import {
  getApiConfig,
  saveApiConfig,
  resetApiConfig,
  testApiEndpointConnection,
  ApiEndpointConfig,
  DEFAULT_API_CONFIG,
  getResolvedApiUrl,
} from "../services/apiConfig";
import { globalTdxKeyManager } from "../services/tdxKeyRotator";

interface AdminAdvancedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
  onRequireAuthPrompt?: (title: string, desc: string, callback: () => void) => void;
}

export default function AdminAdvancedSettingsModal({
  isOpen,
  onClose,
  onDataChanged,
  onRequireAuthPrompt,
}: AdminAdvancedSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"database" | "model" | "tdx" | "security">("database");
  const [isAuth, setIsAuth] = useState(isAdminAuthenticated());
  const [dataset, setDataset] = useState<CapturedDatasetRecord[]>([]);
  const [learnedParams, setLearnedParams] = useState<LearnedModelParameters>(getLearnedParameters());
  const [tdxClientId, setTdxClientId] = useState(
    localStorage.getItem("TDX_CLIENT_ID") || ""
  );
  const [tdxClientSecret, setTdxClientSecret] = useState(
    localStorage.getItem("TDX_CLIENT_SECRET") || ""
  );
  const [apiConfig, setApiConfig] = useState<ApiEndpointConfig>(getApiConfig());
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testApiResult, setTestApiResult] = useState<{
    success: boolean;
    status: number;
    message: string;
    dataPreview?: string;
    latencyMs: number;
  } | null>(null);

  const [statusNotice, setStatusNotice] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [isTraining, setIsTraining] = useState(false);

  const reloadData = () => {
    setIsAuth(isAdminAuthenticated());
    setDataset(getStoredDataset());
    setLearnedParams(getLearnedParameters());
    setTdxClientId(localStorage.getItem("TDX_CLIENT_ID") || "");
    setTdxClientSecret(localStorage.getItem("TDX_CLIENT_SECRET") || "");
    setApiConfig(getApiConfig());
    setTestApiResult(null);
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
      setStatusNotice(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showNotice = (msg: string, type: "success" | "error" = "success") => {
    setStatusNotice({ msg, type });
    setTimeout(() => setStatusNotice(null), 4000);
  };

  // 守護函式：確保只有後台才能執行任何變更動作
  const executeGuardedAction = (
    actionName: string,
    actionDesc: string,
    actionFn: () => void
  ) => {
    if (isAdminAuthenticated()) {
      actionFn();
    } else if (onRequireAuthPrompt) {
      onRequireAuthPrompt(actionName, actionDesc, () => {
        setIsAuth(true);
        actionFn();
      });
    } else {
      showNotice("權限不足：此變更動作只有後台才能執行 (請先登入後台)。", "error");
    }
  };

  // 1. 資料庫變更動作 (Database Actions)
  const handleResetDataset = () => {
    executeGuardedAction(
      "重設資料庫為種子預設",
      "此動作將還原資料集庫為預設的國道5號與雪隧實測歷史資料。",
      () => {
        const resetData = resetDataset();
        setDataset(resetData);
        showNotice("✓ 資料庫已成功重設為初始種子歷史基準！");
        onDataChanged?.();
      }
    );
  };

  const handleClearAllDataset = () => {
    executeGuardedAction(
      "徹底清空資料庫",
      "此動作將刪除目前本機儲存的所有偵測紀錄，清空後將無法復原。",
      () => {
        const cleared = clearAllDataset();
        setDataset(cleared);
        showNotice("✓ 已徹底清空資料庫所有紀錄！");
        onDataChanged?.();
      }
    );
  };

  const handleDeleteRecord = (id: string) => {
    executeGuardedAction(
      "刪除單筆資料紀錄",
      `確定要從資料庫中刪除紀錄 ${id} 嗎？`,
      () => {
        const updated = deleteDatasetRecord(id);
        setDataset(updated);
        showNotice(`✓ 已成功刪除紀錄 ${id}`);
        onDataChanged?.();
      }
    );
  };

  // 2. 機器學習模型訓練與變更 (Model Training Actions)
  const handleRunTraining = async () => {
    executeGuardedAction(
      "執行機器學習 10 Epochs 訓練",
      "此動作將使用資料庫樣本執行多目標梯度下降，校準車道切換門檻與時空波速。",
      async () => {
        setIsTraining(true);
        setStatusNotice(null);
        await new Promise((r) => setTimeout(r, 400));
        const { optimizedParams } = trainModelOnDataset(dataset, 10);
        setLearnedParams(optimizedParams);
        setIsTraining(false);
        showNotice(
          `✓ 模型訓練完成！車道切換門檻已動態收斂至 ${optimizedParams.laneSwitchMarginSec.toFixed(1)} 秒。`
        );
        onDataChanged?.();
      }
    );
  };

  const handleResetModelBaseline = () => {
    executeGuardedAction(
      "重設模型為物理基準",
      "此動作將清除已訓練的動態權重，還原為初始流體力學物理常數。",
      () => {
        const resetP = resetParametersToBaseline();
        setLearnedParams(resetP);
        showNotice("✓ 機器學習權重與車道切換參數已還原至物理基準！");
        onDataChanged?.();
      }
    );
  };

  // 3. API 路由與端點對齊設定 (API Alignment & Renaming)
  const handleSaveApiConfig = () => {
    executeGuardedAction(
      "儲存 API 路由與端點對齊設定",
      "此動作將更新系統呼叫的 API 端點路徑、Base URL 及鑑權 Headers，使其與外部網站完全對齊。",
      () => {
        saveApiConfig(apiConfig);
        showNotice("✓ API 路由與端點命名已成功儲存並生效！");
        onDataChanged?.();
      }
    );
  };

  const handleResetApiConfig = () => {
    executeGuardedAction(
      "還原為預設 API 端點",
      "此動作將清除自訂端點命名，還原為系統標準 TDX 端點路徑。",
      () => {
        const def = resetApiConfig();
        setApiConfig(def);
        setTestApiResult(null);
        showNotice("✓ API 端點已還原為標準預設值。");
        onDataChanged?.();
      }
    );
  };

  const handleTestApiConnection = async () => {
    setIsTestingApi(true);
    setTestApiResult(null);

    const targetUrl = getResolvedApiUrl("freewayVd");
    const headers: Record<string, string> = { Accept: "application/json" };
    if (apiConfig.customAuthHeaderName && apiConfig.customAuthHeaderValue) {
      headers[apiConfig.customAuthHeaderName] = apiConfig.customAuthHeaderValue;
    }
    if (apiConfig.customApiKeyHeaderName && apiConfig.customApiKeyHeaderValue) {
      headers[apiConfig.customApiKeyHeaderName] = apiConfig.customApiKeyHeaderValue;
    }

    try {
      const res = await testApiEndpointConnection(targetUrl, headers);
      setTestApiResult(res);
      if (res.success) {
        showNotice(`✓ API 連線測試成功 (HTTP ${res.status})！延遲 ${res.latencyMs}ms`);
      } else {
        showNotice(`API 連線測試失敗：${res.message}`, "error");
      }
    } catch (err: any) {
      setTestApiResult({
        success: false,
        status: 0,
        message: err.message || "連線測試異常",
        latencyMs: 0,
      });
      showNotice("連線測試異常", "error");
    } finally {
      setIsTestingApi(false);
    }
  };

  // 4. TDX 金鑰儲存與變更 (TDX Key Settings)
  const handleSaveTdx = () => {
    executeGuardedAction(
      "儲存 TDX 官方金鑰憑證",
      "此動作將寫入自訂的 TDX Client ID 與 Client Secret。",
      () => {
        try {
          localStorage.setItem("TDX_CLIENT_ID", tdxClientId.trim());
          localStorage.setItem("TDX_CLIENT_SECRET", tdxClientSecret.trim());
          globalTdxKeyManager.reloadKeys();
          showNotice("✓ TDX 金鑰已成功儲存並同步更新連線池！");
          onDataChanged?.();
        } catch {
          showNotice("儲存金鑰失敗", "error");
        }
      }
    );
  };

  const handleClearTdx = () => {
    executeGuardedAction(
      "清除 TDX 金鑰憑證",
      "此動作將清除自訂的 TDX 金鑰，系統將回退至伺服器全自動輪轉池。",
      () => {
        localStorage.removeItem("TDX_CLIENT_ID");
        localStorage.removeItem("TDX_CLIENT_SECRET");
        globalTdxKeyManager.reloadKeys();
        setTdxClientId("");
        setTdxClientSecret("");
        showNotice("✓ 自訂 TDX 金鑰已清除，回退至系統輪轉池。");
        onDataChanged?.();
      }
    );
  };

  // 5. 後台登出
  const handleLogout = () => {
    logoutAdmin();
    setIsAuth(false);
    showNotice("已登出後台，目前處於前台唯讀模式。");
    onDataChanged?.();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
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
          className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl z-10 text-slate-100 flex flex-col overflow-hidden"
        >
          {/* Top Bar */}
          <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-black text-white">後台管理與進階設定中心</h2>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                      isAuth
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    }`}
                  >
                    {isAuth ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    <span>{isAuth ? "後台權限已解鎖" : "前台唯讀防護中"}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  所有可以更改、重設、微調訓練與刪除動作，均嚴格限定只有後台才能執行
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="關閉"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Status Alert Banner */}
          {statusNotice && (
            <div
              className={`px-5 py-2.5 text-xs font-semibold flex items-center gap-2 border-b ${
                statusNotice.type === "success"
                  ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/80"
                  : "bg-rose-950/80 text-rose-300 border-rose-800/80"
              }`}
            >
              {statusNotice.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              )}
              <span>{statusNotice.msg}</span>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 p-3 bg-slate-950 border-b border-slate-800 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveTab("database")}
              className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === "database"
                  ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Database className="h-4 w-4" />
              <span>資料庫管理 (资料库)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-900/40 text-current font-mono">
                {dataset.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("model")}
              className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === "model"
                  ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Cpu className="h-4 w-4" />
              <span>機器學習與車道模型 (進階設定)</span>
            </button>

            <button
              onClick={() => setActiveTab("tdx")}
              className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === "tdx"
                  ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <ArrowRightLeft className="h-4 w-4" />
              <span>API 路由對齊與金鑰</span>
            </button>

            <button
              onClick={() => setActiveTab("security")}
              className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === "security"
                  ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>後台安全與權限鎖定</span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
            {/* TAB 1: 資料庫維護與管理 */}
            {activeTab === "database" && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>資料集庫維護面板 (Dataset Operations)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        累計 {dataset.length} 筆
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      提供資料清空、重設、匯出與單筆刪除管理；所有寫入與刪除動作僅限後台操作。
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportDatasetToCsv(dataset)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                      <span>匯出 CSV</span>
                    </button>

                    <button
                      onClick={handleResetDataset}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      title="還原為國5歷史種子資料"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>重設為種子庫</span>
                    </button>

                    <button
                      onClick={handleClearAllDataset}
                      className="px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      title="徹底清除全部資料集"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>徹底清空</span>
                    </button>
                  </div>
                </div>

                {/* 資料集表格預覽與單筆刪除 */}
                <div className="bg-slate-950/90 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="p-3 border-b border-slate-800 bg-slate-900/60 text-xs font-bold text-slate-300 flex justify-between items-center">
                    <span>資料庫紀錄清單 (點擊右側垃圾桶可刪除單筆紀錄)</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      格式：0K~54K 全線與雪隧實測
                    </span>
                  </div>

                  {dataset.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      目前資料庫為空。請點擊「重設為種子庫」或於前台點擊「更新路況」自動收錄。
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-900 text-slate-400 text-[11px] sticky top-0 font-sans border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">時間 / ID</th>
                            <th className="py-2.5 px-3">方向</th>
                            <th className="py-2.5 px-3">等效速度</th>
                            <th className="py-2.5 px-3">推薦車道</th>
                            <th className="py-2.5 px-3">全線耗時</th>
                            <th className="py-2.5 px-3 text-right">後台刪除</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 text-slate-300">
                          {dataset.slice(0, 50).map((r) => (
                            <tr key={r.id} className="hover:bg-slate-900/60 transition">
                              <td className="py-2 px-3">
                                <div className="font-bold text-white font-sans">{r.timeFormatted}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{r.id}</div>
                              </td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] ${r.direction === "S" ? "bg-sky-950 text-sky-300" : "bg-emerald-950 text-emerald-300"}`}>
                                  {r.direction === "S" ? "南向往宜蘭" : "北向往台北"}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-bold text-amber-300">
                                {r.tunnelEqSpeedKmh.toFixed(1)} km/h
                              </td>
                              <td className="py-2 px-3 font-sans text-xs">
                                {r.recommendedLane}
                              </td>
                              <td className="py-2 px-3">
                                {r.corridor0to54TravelTimeMin ?? r.corridor0to50TravelTimeMin} 分
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  onClick={() => handleDeleteRecord(r.id)}
                                  className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-400 hover:text-white transition cursor-pointer"
                                  title={`刪除紀錄 ${r.id}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: 機器學習與模型微調 (進階設定) */}
            {activeTab === "model" && (
              <div className="space-y-5">
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-emerald-400" />
                      <span>車道切換與流態機器學習調校</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      使用資料庫梯度下降在線優化車道切換收益門檻 (ΔT_switch) 與跨車道剪力耦合。
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRunTraining}
                      disabled={isTraining}
                      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
                        isTraining
                          ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                          : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                      }`}
                    >
                      {isTraining ? (
                        <>
                          <RotateCcw className="h-4 w-4 animate-spin" />
                          <span>訓練中...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 fill-current" />
                          <span>執行 10 Epochs 微調 (限後台)</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleResetModelBaseline}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      title="重設模型為物理基準"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>重設基準</span>
                    </button>
                  </div>
                </div>

                {/* 參數詳細卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-2">
                    <span className="text-slate-400 block font-sans font-bold text-[11px] text-emerald-400">
                      1. 動態車道切換收益門檻 (ΔT_switch)
                    </span>
                    <div className="text-2xl font-black text-white">
                      {learnedParams.laneSwitchMarginSec.toFixed(1)}{" "}
                      <span className="text-xs font-normal text-slate-400">秒</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-sans">
                      當雙車道時間差達到此門檻時，才觸發較快車道導引，防止隨機震盪。
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-2">
                    <span className="text-slate-400 block font-sans font-bold text-[11px] text-emerald-400">
                      2. 內側車道偏置因子 (β_L1)
                    </span>
                    <div className="text-2xl font-black text-white">
                      {learnedParams.lane1SpeedBiasFactor.toFixed(3)}
                    </div>
                    <p className="text-[10px] text-slate-400 font-sans">
                      量化內側車道無大車干擾下的常態速度優勢加權。
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-2">
                    <span className="text-slate-400 block font-sans font-bold text-[11px] text-sky-400">
                      3. 雙車道紊流剪力耦合 (c_friction)
                    </span>
                    <div className="text-2xl font-black text-white">
                      {learnedParams.laneCouplingFriction.toFixed(3)}
                    </div>
                    <p className="text-[10px] text-slate-400 font-sans">
                      相鄰車道流速差對本車道造成的拖曳降速阻力係數。
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-2">
                    <span className="text-slate-400 block font-sans font-bold text-[11px] text-sky-400">
                      4. 車道選擇靈敏度指數 (β_choice)
                    </span>
                    <div className="text-2xl font-black text-white">
                      {learnedParams.laneChoiceSensitivity.toFixed(3)}
                    </div>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Softmax 分流決策邊際分配強度。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: API 路由對齊、重新命名與 TDX 金鑰 */}
            {activeTab === "tdx" && (
              <div className="space-y-6 max-w-2xl">
                {/* 區塊 1: API 路由名稱與端點對齊 (對齊另一個網站) */}
                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4 text-amber-400" />
                        <span>API 路由名稱與端點對齊 (對齊另一個網站)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        若您在另一側網站有特定的 API 路由名稱、Base URL 或鑑權金鑰，可在下方自訂以達到 100% 結構對齊。
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleResetApiConfig}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                        title="還原預設 API 端點"
                      >
                        還原預設
                      </button>
                    </div>
                  </div>

                  {/* 快速範本選擇 */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400">快速對齊範本：</label>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button
                        onClick={() =>
                          setApiConfig((prev) => ({
                            ...prev,
                            apiAliasName: "標準 TDX 本地代理 (預設)",
                            baseUrl: "",
                            freewayVdPath: "/api/tdx/freeway-vd",
                            freewayLiveEventsPath: "/api/tdx/freeway-live-events",
                          }))
                        }
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-mono cursor-pointer"
                      >
                        預設 /api/tdx/...
                      </button>
                      <button
                        onClick={() =>
                          setApiConfig((prev) => ({
                            ...prev,
                            apiAliasName: "V1 標準架構 (/api/v1/...)",
                            baseUrl: "",
                            freewayVdPath: "/api/v1/freeway-vd",
                            freewayLiveEventsPath: "/api/v1/freeway-live-events",
                          }))
                        }
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-mono cursor-pointer"
                      >
                        /api/v1/freeway-vd
                      </button>
                      <button
                        onClick={() =>
                          setApiConfig((prev) => ({
                            ...prev,
                            apiAliasName: "Traffic 精簡架構 (/api/traffic/...)",
                            baseUrl: "",
                            freewayVdPath: "/api/traffic/vd",
                            freewayLiveEventsPath: "/api/traffic/live-events",
                          }))
                        }
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-mono cursor-pointer"
                      >
                        /api/traffic/vd
                      </button>
                    </div>
                  </div>

                  {/* 表單欄位 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 font-mono text-xs">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-300 font-bold mb-1 font-sans">
                        API 識別名稱 / 專案標籤 (Alias Name)
                      </label>
                      <input
                        type="text"
                        value={apiConfig.apiAliasName}
                        onChange={(e) =>
                          setApiConfig((prev) => ({ ...prev, apiAliasName: e.target.value }))
                        }
                        placeholder="例如：國5即時路況主服務、另一網站中繼站"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-400 text-white font-sans"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-300 font-bold mb-1 font-sans flex items-center justify-between">
                        <span>API Base URL / 外部主機伺服器網址</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          留空代表本站同源代理 (預設)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={apiConfig.baseUrl}
                        onChange={(e) =>
                          setApiConfig((prev) => ({ ...prev, baseUrl: e.target.value }))
                        }
                        placeholder="例如：https://my-traffic-backend.com 或留空"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-400 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1 font-sans">
                        車流 VD 即時數據 API 端點路徑
                      </label>
                      <input
                        type="text"
                        value={apiConfig.freewayVdPath}
                        onChange={(e) =>
                          setApiConfig((prev) => ({ ...prev, freewayVdPath: e.target.value }))
                        }
                        placeholder="/api/tdx/freeway-vd"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-400 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1 font-sans">
                        即時事件通報 API 端點路徑
                      </label>
                      <input
                        type="text"
                        value={apiConfig.freewayLiveEventsPath}
                        onChange={(e) =>
                          setApiConfig((prev) => ({ ...prev, freewayLiveEventsPath: e.target.value }))
                        }
                        placeholder="/api/tdx/freeway-live-events"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-400 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1 font-sans">
                        鑑權 Header 名稱 (如 Authorization)
                      </label>
                      <input
                        type="text"
                        value={apiConfig.customAuthHeaderName}
                        onChange={(e) =>
                          setApiConfig((prev) => ({ ...prev, customAuthHeaderName: e.target.value }))
                        }
                        placeholder="Authorization"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-400 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1 font-sans">
                        鑑權 Header 內容 (如 Bearer token)
                      </label>
                      <input
                        type="password"
                        value={apiConfig.customAuthHeaderValue}
                        onChange={(e) =>
                          setApiConfig((prev) => ({ ...prev, customAuthHeaderValue: e.target.value }))
                        }
                        placeholder="Bearer your-token-here (選填)"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-400 text-white"
                      />
                    </div>
                  </div>

                  {/* 組合後的呼叫預覽 */}
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300">
                    <span className="text-slate-500 font-sans font-bold block mb-1">
                      解析後的完整 API 呼叫路徑：
                    </span>
                    <div className="text-amber-400 font-bold break-all">
                      GET {getResolvedApiUrl("freewayVd")}
                    </div>
                  </div>

                  {/* 測試連線與儲存按鈕 */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      onClick={handleSaveApiConfig}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>儲存 API 路由與命名對齊</span>
                    </button>

                    <button
                      onClick={handleTestApiConnection}
                      disabled={isTestingApi}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isTestingApi ? (
                        <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                      ) : (
                        <Terminal className="h-4 w-4 text-sky-400" />
                      )}
                      <span>{isTestingApi ? "測試連線中..." : "即時連線測試 (Ping / Test)"}</span>
                    </button>
                  </div>

                  {/* 測試連線結果即時展示 */}
                  {testApiResult && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs font-mono transition ${
                        testApiResult.success
                          ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-300"
                          : "bg-rose-950/40 border-rose-800/80 text-rose-300"
                      }`}
                    >
                      <div className="flex items-center justify-between font-sans font-bold mb-1">
                        <span className="flex items-center gap-1.5">
                          {testApiResult.success ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-rose-400" />
                          )}
                          <span>連線測試結果 (HTTP {testApiResult.status})</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          延遲: {testApiResult.latencyMs}ms
                        </span>
                      </div>
                      <p className="font-sans text-[11px] mt-0.5">{testApiResult.message}</p>
                      {testApiResult.dataPreview && (
                        <div className="mt-2 p-2 bg-slate-950/80 rounded-lg text-[10px] text-slate-400 overflow-x-auto">
                          {testApiResult.dataPreview}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 區塊 2: 交通部 TDX 官方金鑰設定 */}
                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="space-y-1 pb-3 border-b border-slate-800/80">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Key className="h-4 w-4 text-amber-400" />
                      <span>交通部 TDX 官方金鑰輪轉池設定 (限後台修改)</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      可輸入您直接向交通部 TDX 申請的 Client ID 與 Secret；若未輸入，系統將全自動採用伺服器後端多通道金鑰輪轉池。
                    </p>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1 font-sans">
                        TDX Client ID
                      </label>
                      <input
                        type="text"
                        value={tdxClientId}
                        onChange={(e) => setTdxClientId(e.target.value)}
                        placeholder="例如：your_client_id-xxxxxxxx-xxxx"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-400 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1 font-sans">
                        TDX Client Secret
                      </label>
                      <input
                        type="password"
                        value={tdxClientSecret}
                        onChange={(e) => setTdxClientSecret(e.target.value)}
                        placeholder="例如：xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-400 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handleSaveTdx}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>儲存 TDX 憑證 (限後台)</span>
                    </button>

                    <button
                      onClick={handleClearTdx}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                    >
                      清除金鑰 (使用系統池)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: 後台安全與權限控制 */}
            {activeTab === "security" && (
              <div className="space-y-4 max-w-xl">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <span>後台授權狀態</span>
                    </span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                      {isAuth ? "已授權管理員" : "前台唯讀"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    本系統設定了嚴格的後台權限防護：所有修改資料庫、重設模型與金鑰設定均需透過後台密碼驗證解鎖。未經驗證之前，前台僅提供唯讀監控功能。
                  </p>

                  <div className="pt-2">
                    {isAuth ? (
                      <button
                        onClick={handleLogout}
                        className="px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        <span>立即鎖定並登出後台</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onRequireAuthPrompt?.(
                            "解鎖後台管理員權限",
                            "請輸入後台密碼以解鎖進階設定與資料庫管理權限。",
                            () => {
                              setIsAuth(true);
                              showNotice("✓ 後台已成功解鎖！");
                            }
                          );
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        <span>輸入密碼解鎖後台</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>國道5號雪山隧道後台管理防護系統</span>
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
            >
              關閉面板
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
