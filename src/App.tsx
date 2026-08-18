import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  Compass,
  Video,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  MapPin,
  Database,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Header, { ActiveTabType } from "./components/Header";
import SimpleLaneRecommendation from "./components/SimpleLaneRecommendation";
import AdvancedAnalysisModal from "./components/AdvancedAnalysisModal";
import CctvWall from "./components/CctvWall";
import SystemStatusFooter from "./components/SystemStatusFooter";
import TunnelGisMap from "./components/TunnelGisMap";
import TunnelEntranceCover from "./components/TunnelEntranceCover";
import TunnelCrossSectionView from "./components/TunnelCrossSectionView";
import CorridorMonitor from "./components/CorridorMonitor";
import DepartureTimeRecommender from "./components/DepartureTimeRecommender";
import DatasetRepositoryView from "./components/DatasetRepositoryView";
import TheoryAndPrinciplesView from "./components/TheoryAndPrinciplesView";
import BackendAuthModal from "./components/BackendAuthModal";
import AdminAdvancedSettingsModal from "./components/AdminAdvancedSettingsModal";
import GlobalSearchModal, { SearchResultItem } from "./components/GlobalSearchModal";
import { getResolvedApiUrl, getResolvedApiHeaders } from "./services/apiConfig";
import { fetchDirectFreewayVd } from "./services/tdxDirectClient";

import { Direction, FinalEstimatorOutput } from "./types";
import { runVdTrafficEstimator } from "./estimator/trafficEngine";
import { captureDetectionToDataset } from "./services/datasetRepository";
import { isAdminAuthenticated, subscribeAdminAuth } from "./services/adminAuth";

const API_COOLDOWN_SECONDS = 130;

export default function App() {
  // Top 5 Tabs: 'lane' | 'corridor' | 'departure' | 'dataset' | 'cctv'
  const [activeTab, setActiveTab] = useState<ActiveTabType>("lane");

  // Direction: Southbound (S) or Northbound (N)
  const [direction, setDirection] = useState<Direction>("S");

  // Analysis State: Variables start at 0 on first entry, and change to 100 on begin analysis
  const [hasStartedAnalysis, setHasStartedAnalysis] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);

  // Estimator Output State
  const [estimatorOutput, setEstimatorOutput] = useState<FinalEstimatorOutput | null>(null);

  // Status & Error States (No simulation fallback when TDX is down!)
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tdxError, setTdxError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "emerald" | "rose" | "amber" } | null>(null);

  // Advanced Analysis Modal State
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Global Keyword Search Modal State
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // 全域快捷鍵 ⌘K / Ctrl+K 開啟搜尋
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectSearchResult = (result: SearchResultItem) => {
    if (result.direction && result.direction !== direction) {
      handleDirectionChange(result.direction);
    }
    if (result.tabTarget) {
      setActiveTab(result.tabTarget);
    }
    showToast(`已跳轉至「${result.title}」`, "emerald");
  };

  // Backend Admin Authentication & Advanced Settings Modals
  const [isAdminAuth, setIsAdminAuth] = useState<boolean>(isAdminAuthenticated());
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState<boolean>(false);
  const [authPromptState, setAuthPromptState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    callback: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    callback: () => {},
  });

  // Subscribe to Admin Auth status
  useEffect(() => {
    const unsub = subscribeAdminAuth((auth) => {
      setIsAdminAuth(auth);
    });
    return unsub;
  }, []);

  const handleRequireAuthPrompt = (
    title: string,
    description: string,
    callback: () => void
  ) => {
    if (isAdminAuthenticated()) {
      callback();
    } else {
      setAuthPromptState({
        isOpen: true,
        title,
        description,
        callback,
      });
    }
  };

  const handleOpenAdminSettings = () => {
    if (isAdminAuthenticated()) {
      setIsAdminSettingsOpen(true);
    } else {
      handleRequireAuthPrompt(
        "解鎖後台管理系統",
        "後台管理控制台包含資料庫維護、模型在線微調與 TDX 金鑰配置。請輸入後台管理密碼以進行解鎖。",
        () => {
          setIsAdminSettingsOpen(true);
        }
      );
    }
  };

  // Rate Limiting Cooldown: Starts at 130s per API call, decrements 1/sec
  const [cooldown, setCooldown] = useState<number>(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: "emerald" | "rose" | "amber" = "emerald") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Cooldown countdown timer loop
  useEffect(() => {
    if (cooldown <= 0) return;

    cooldownTimerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, [cooldown]);

  // Fetch Live TDX VD Data and Run Traffic State Estimation
  const fetchTdxAndEstimate = async (targetDir: Direction = direction, forceOverrideCooldown: boolean = false) => {
    if (cooldown > 0 && !forceOverrideCooldown) {
      showToast(`請等待冷卻倒數完成 (${cooldown} 秒後可再次更新)`, "amber");
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    setTdxError(null);
    setHasStartedAnalysis(true);
    setAnalysisProgress(100);

    // Set cooldown variable to 130 seconds
    setCooldown(API_COOLDOWN_SECONDS);

    try {
      const targetApiUrl = getResolvedApiUrl("freewayVd");
      let rawPayload: any;

      if (targetApiUrl.includes("transportdata.tw") || !targetApiUrl.startsWith("http")) {
        // 使用前端 TDX 官方直連模組 (自動金鑰輪轉、Token 快取與容錯重試)
        rawPayload = await fetchDirectFreewayVd(
          targetApiUrl.startsWith("http") ? targetApiUrl : undefined
        );
      } else {
        // 自訂外部 API 端點呼叫
        const targetHeaders = getResolvedApiHeaders();
        const response = await fetch(targetApiUrl, {
          method: "GET",
          headers: targetHeaders,
        });

        const contentType = response.headers.get("content-type") || "";
        const isJson = contentType.toLowerCase().includes("json");

        if (!response.ok) {
          let errDetail = "";
          if (isJson) {
            try {
              const errJson = await response.json();
              errDetail = errJson.error_description || errJson.error || errJson.message || JSON.stringify(errJson);
            } catch {
              errDetail = `HTTP ${response.status} ${response.statusText}`;
            }
          } else {
            const raw = await response.text().catch(() => "");
            errDetail = raw.includes("<!DOCTYPE") || raw.includes("<html")
              ? "端點回傳 404 HTML 頁面 (找不到 API 路由)"
              : raw.slice(0, 150);
          }
          throw new Error(`API 連線異常 (HTTP ${response.status})：${errDetail}`);
        }

        if (!isJson) {
          throw new Error(`API 端點回傳非 JSON 格式 (${contentType})`);
        }

        rawPayload = await response.json();
      }

      // Execute traffic state estimation without modifying any math
      const output = runVdTrafficEstimator(rawPayload, targetDir, 18);

      if (output.raw_api.records.length === 0) {
        throw new Error("官方 TDX 伺服器目前未回傳雪山隧道車輛偵測器數據");
      }

      // Automatically incorporate detection data into dataset on each analysis
      const { totalCount } = captureDetectionToDataset(output, targetDir);

      setEstimatorOutput(output);
      setTdxError(null);
      showToast(`已成功同步 TDX 官方數據並自動收錄至資料集 (目前累計 ${totalCount} 筆)`, "emerald");
    } catch (err: any) {
      console.error("TDX Fetch Failed:", err);
      const errMsg =
        typeof err === "string"
          ? err
          : err?.message
          ? err.message
          : typeof err === "object"
          ? (err.error_description || err.error || JSON.stringify(err))
          : "官方 TDX 伺服器連線失敗或回應超時，暫無法取得即時路況";
      setTdxError(errMsg);
      showToast(errMsg, "rose");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Direction Change
  const handleDirectionChange = (newDir: Direction) => {
    if (newDir === direction || isLoading) return;
    setDirection(newDir);

    // If we already have estimator output, re-filter for the new direction immediately
    if (estimatorOutput) {
      const payloadToUse = estimatorOutput.raw_api.rawPayload || estimatorOutput.raw_api.records;
      const recomputed = runVdTrafficEstimator(payloadToUse, newDir, 18);
      captureDetectionToDataset(recomputed, newDir);
      setEstimatorOutput(recomputed);
    } else if (hasStartedAnalysis && cooldown === 0) {
      fetchTdxAndEstimate(newDir, false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500/20">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2.5 backdrop-blur-md ${
              toast.type === "emerald"
                ? "bg-emerald-900 text-white border-emerald-700"
                : toast.type === "rose"
                ? "bg-rose-900 text-white border-rose-700"
                : "bg-amber-900 text-white border-amber-700"
            }`}
          >
            {toast.type === "emerald" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-300 shrink-0" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header & Mobile Nav */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isLiveTdx={!tdxError}
        isAdminAuth={isAdminAuth}
        onOpenAdminSettings={handleOpenAdminSettings}
        direction={direction}
        onDirectionChange={handleDirectionChange}
        onRefresh={() => fetchTdxAndEstimate(direction, false)}
        isLoading={isLoading}
        cooldown={cooldown}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Main Container (Clean White Theme Layout with Mobile Bottom Nav Padding) */}
      <main className="max-w-[1600px] w-full mx-auto px-3 sm:px-4 py-3 sm:py-5 pb-24 md:pb-8 space-y-4 sm:space-y-5 flex-1">
        {/* Error Message when TDX connection fails */}
        {tdxError && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3.5 text-rose-800">
            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-sm text-rose-900">
                交通部 TDX 官方伺服器連線異常
              </div>
              <p className="text-rose-700 leading-relaxed">{tdxError}</p>
              <p className="text-rose-600 text-[11px] pt-1">
                系統已依規範停止模擬假資料，待冷卻倒數完成後可點擊「更新路況」再次嘗試連線。
              </p>
            </div>
          </div>
        )}

        {/* TAB 1: 雪隧與車道指引 (GIS 地圖 + 車道推薦 + 剖面圖) */}
        {activeTab === "lane" && (
          <div className="space-y-5">
            {/* 頂部視覺區：尚未分析時顯示雪山隧道入口實景封面；點擊分析後無縫切換為隧道標準橫斷面（剖面圖）即時流速監控 */}
            {!hasStartedAnalysis && !estimatorOutput ? (
              <TunnelEntranceCover
                direction={direction}
                estimatorOutput={estimatorOutput}
                onStartAnalysis={() => fetchTdxAndEstimate(direction, true)}
                isLoading={isLoading}
              />
            ) : (
              <div className="space-y-3">
                {/* 頂部快速重整列 (Compact Bar) */}
                <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 px-4 py-2.5 rounded-2xl shadow-xs">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-slate-800">
                      即時連線分析中（{direction === "S" ? "南向往宜蘭" : "北向往台北"}）
                    </span>
                  </div>
                  <button
                    disabled={isLoading || cooldown > 0}
                    onClick={() => fetchTdxAndEstimate(direction, false)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      isLoading
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : cooldown > 0
                        ? "bg-slate-100 text-slate-500 cursor-not-allowed font-mono text-[11px]"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm"
                    }`}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    <span>
                      {isLoading
                        ? "分析中..."
                        : cooldown > 0
                        ? `冷卻中 (${cooldown}s)`
                        : "更新路況"}
                    </span>
                  </button>
                </div>

                {/* 隧道大尺寸標準橫斷面（剖面圖）＋ 頂部直接流速結論 */}
                <TunnelCrossSectionView
                  direction={direction}
                  estimatorOutput={estimatorOutput}
                  onDirectionChange={(newDir) => handleDirectionChange(newDir)}
                  onRefresh={() => fetchTdxAndEstimate(direction, false)}
                  isLoading={isLoading}
                />
              </div>
            )}

            {/* Initial Standby State when User First Enters */}
            {!hasStartedAnalysis && !estimatorOutput && !isLoading && (
              <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6 text-center max-w-3xl mx-auto my-2">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-mono">
                    <span>系統狀態變數：{analysisProgress}% (待啟動分析)</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    雪山隧道 13km 實時車道流速與車道指引
                  </h2>
                  <p className="text-xs text-slate-500 max-w-xl mx-auto leading-relaxed">
                    全線 13 公里劃設連續雙白實線（嚴禁變換車道）。透過 20 微元空間積分，為您在入洞前推估最佳行駛車道與預估時間。
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">狀態變數</span>
                    <span className="text-lg font-black text-slate-700">0%</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">預估旅行時間</span>
                    <span className="text-lg font-black text-slate-700">0 秒</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">等效旅行速度</span>
                    <span className="text-lg font-black text-slate-700">0.00 km/h</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">微元切片</span>
                    <span className="text-lg font-black text-slate-700">0 / 20</span>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => fetchTdxAndEstimate(direction, true)}
                    className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-600/20 text-sm transition cursor-pointer flex items-center justify-center gap-2.5 mx-auto"
                  >
                    <Activity className="h-5 w-5" />
                    <span>啟動即時 GIS 地圖與車道分析 (變數變更為 100%)</span>
                  </button>
                </div>
              </div>
            )}

            {/* GIS Map & Lane Guidance Grid */}
            {(hasStartedAnalysis || estimatorOutput) && (
              <div className="space-y-6 pt-2">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* Left: GIS Tunnel Map */}
                  <div className="lg:col-span-7 xl:col-span-8 space-y-4">
                    <TunnelGisMap
                      estimatorOutput={estimatorOutput}
                      currentDirection={direction}
                      onDirectionChange={(newDir) => handleDirectionChange(newDir)}
                    />
                  </div>

                  {/* Right: Smart Lane Recommendation */}
                  <div className="lg:col-span-5 xl:col-span-4 space-y-4">
                    {estimatorOutput && (
                      <SimpleLaneRecommendation
                        estimatorOutput={estimatorOutput}
                        direction={direction}
                        onOpenAdvanced={() => setIsAdvancedOpen(true)}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: 國5全線 0K~54K 走廊即時監控 */}
        {activeTab === "corridor" && (
          <CorridorMonitor
            estimatorOutput={estimatorOutput}
            direction={direction}
            onDirectionChange={handleDirectionChange}
            onStartAnalysis={() => fetchTdxAndEstimate(direction, true)}
            onRefresh={() => fetchTdxAndEstimate(direction, false)}
            isLoading={isLoading}
            cooldown={cooldown}
            onSelectRouteForDeparture={(originKm, destKm) => {
              setActiveTab("departure");
            }}
          />
        )}

        {/* TAB 3: 最佳出發時間推薦 (Launch Time Calculator) */}
        {activeTab === "departure" && (
          <DepartureTimeRecommender
            estimatorOutput={estimatorOutput}
            direction={direction}
            onDirectionChange={handleDirectionChange}
            onStartAnalysis={() => fetchTdxAndEstimate(direction, true)}
            onRefresh={() => fetchTdxAndEstimate(direction, false)}
            isLoading={isLoading}
            cooldown={cooldown}
          />
        )}

        {/* TAB 4: 數理模型與原理 (Mathematical Theory & Model Physics) */}
        {activeTab === "theory" && (
          <TheoryAndPrinciplesView
            estimatorOutput={estimatorOutput}
            direction={direction}
          />
        )}

        {/* 備用 / 資料庫管理 (已整併至後台管理系統) */}
        {activeTab === "dataset" && (
          <DatasetRepositoryView
            onRefresh={() => fetchTdxAndEstimate(direction, false)}
            onRequireAuthPrompt={handleRequireAuthPrompt}
          />
        )}

        {/* TAB 5: Surveillance Camera Wall (即時監視器) */}
        {activeTab === "cctv" && <CctvWall currentDirection={direction} />}
      </main>

      {/* 頁面最底部精巧的系統運作狀態指示 */}
      <SystemStatusFooter />

      {/* Advanced Engineering / Theory Modal */}
      {estimatorOutput && (
        <AdvancedAnalysisModal
          isOpen={isAdvancedOpen}
          onClose={() => setIsAdvancedOpen(false)}
          estimatorOutput={estimatorOutput}
          direction={direction}
          onRequireAuthPrompt={handleRequireAuthPrompt}
        />
      )}

      {/* 後台管理與進階設定視窗 (Admin Advanced Settings Modal) */}
      <AdminAdvancedSettingsModal
        isOpen={isAdminSettingsOpen}
        onClose={() => setIsAdminSettingsOpen(false)}
        onRequireAuthPrompt={handleRequireAuthPrompt}
      />

      {/* 後台密碼授權視窗 (Backend Auth Modal) */}
      <BackendAuthModal
        isOpen={authPromptState.isOpen}
        onClose={() => setAuthPromptState((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => {
          setAuthPromptState((prev) => ({ ...prev, isOpen: false }));
          showToast("✓ 後台授權成功！權限已解鎖。", "emerald");
          authPromptState.callback();
        }}
        actionTitle={authPromptState.title}
        actionDescription={authPromptState.description}
      />

      {/* 全站關鍵字搜尋視窗 (Global Keyword Search Modal) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSelectSearchResult}
        currentDirection={direction}
      />
    </div>
  );
}

