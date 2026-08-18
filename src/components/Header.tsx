import React from "react";
import {
  Navigation,
  Video,
  Compass,
  MapPin,
  Clock,
  BookOpen,
  Settings,
  Lock,
  Unlock,
  RefreshCw,
  Search,
} from "lucide-react";

export type ActiveTabType = "lane" | "corridor" | "departure" | "theory" | "cctv";

interface HeaderProps {
  activeTab: ActiveTabType;
  onTabChange: (tab: ActiveTabType) => void;
  isLiveTdx: boolean;
  isAdminAuth?: boolean;
  onOpenAdminSettings?: () => void;
  direction?: "S" | "N";
  onDirectionChange?: (dir: "S" | "N") => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  cooldown?: number;
  onOpenSearch?: () => void;
}

export default function Header({
  activeTab,
  onTabChange,
  isLiveTdx,
  isAdminAuth = false,
  onOpenAdminSettings,
  direction,
  onDirectionChange,
  onRefresh,
  isLoading = false,
  cooldown = 0,
  onOpenSearch,
}: HeaderProps) {
  return (
    <>
      {/* 頂部 Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-4 py-2 sm:py-2.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2 sm:gap-3">
          {/* Logo 與主標題 + 手機端快捷動作列 */}
          <div className="flex items-center justify-between w-full md:w-auto gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="bg-emerald-600 text-white p-1.5 sm:p-2 rounded-xl font-bold flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                <Navigation className="h-4 w-4 sm:h-5 sm:w-5 transform rotate-45" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 truncate">
                    餅乾・國5雪隧即時路況
                  </h1>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold shrink-0">
                    即時
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 hidden sm:block truncate">
                  雙向 20 微元空間積分・全線 0K~54K・出發時間試算
                </p>
              </div>
            </div>

            {/* 手機版快速操作區 (搜尋 + 方向切換 + 重新整理 + 後台按鈕) */}
            <div className="flex items-center gap-1.5 md:hidden">
              {onOpenSearch && (
                <button
                  onClick={onOpenSearch}
                  className="p-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center border bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 cursor-pointer shadow-2xs shrink-0"
                  title="站內關鍵字搜尋"
                >
                  <Search className="h-3.5 w-3.5 text-emerald-600" />
                </button>
              )}

              {direction && onDirectionChange && (
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-bold">
                  <button
                    onClick={() => onDirectionChange("S")}
                    className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                      direction === "S"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600"
                    }`}
                  >
                    南下
                  </button>
                  <button
                    onClick={() => onDirectionChange("N")}
                    className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                      direction === "N"
                        ? "bg-cyan-600 text-white shadow-xs"
                        : "text-slate-600"
                    }`}
                  >
                    北上
                  </button>
                </div>
              )}

              {onRefresh && (
                <button
                  disabled={isLoading || cooldown > 0}
                  onClick={onRefresh}
                  className={`p-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center border shrink-0 ${
                    isLoading
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                      : cooldown > 0
                      ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed font-mono text-[10px]"
                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 cursor-pointer"
                  }`}
                  title={cooldown > 0 ? `冷卻中 (${cooldown}s)` : "立即更新"}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                </button>
              )}

              {onOpenAdminSettings && (
                <button
                  onClick={onOpenAdminSettings}
                  className={`p-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center border shrink-0 ${
                    isAdminAuth
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-slate-900 text-white border-slate-800"
                  }`}
                  title="後台管理"
                >
                  <Settings className="h-3.5 w-3.5 text-amber-400" />
                </button>
              )}
            </div>
          </div>

          {/* 電腦版 / 平板版 導覽列與搜尋列 */}
          <div className="hidden md:flex items-center gap-2 justify-end overflow-x-auto no-scrollbar">
            {/* 站內關鍵字搜尋按鈕 (支援 ⌘K / Ctrl+K 快捷鍵) */}
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                className="px-3 py-1.5 rounded-2xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 transition flex items-center gap-2 text-xs font-medium cursor-pointer shadow-2xs"
                title="全站關鍵字搜尋 (快捷鍵 Ctrl+K / ⌘K)"
              >
                <Search className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>搜尋路況、交流道、CCTV...</span>
                <kbd className="hidden lg:inline-block text-[10px] font-mono bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                  ⌘K
                </kbd>
              </button>
            )}

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              {/* Tab 1: 雪隧與車道 */}
              <button
                onClick={() => onTabChange("lane")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === "lane"
                    ? "bg-white text-emerald-700 shadow-xs border border-slate-200/80 font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Compass className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>雪隧與車道</span>
              </button>

              {/* Tab 2: 國5全線 0K~54K */}
              <button
                onClick={() => onTabChange("corridor")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === "corridor"
                    ? "bg-white text-emerald-700 shadow-xs border border-slate-200/80 font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>全線 0K~54K</span>
              </button>

              {/* Tab 3: 最佳出發時間 */}
              <button
                onClick={() => onTabChange("departure")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === "departure"
                    ? "bg-white text-emerald-700 shadow-xs border border-slate-200/80 font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>最佳出發時間</span>
              </button>

              {/* Tab 4: 數理模型與原理 */}
              <button
                onClick={() => onTabChange("theory")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === "theory"
                    ? "bg-white text-emerald-700 shadow-xs border border-slate-200/80 font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>數理模型與原理</span>
              </button>

              {/* Tab 5: CCTV 監視器 */}
              <button
                onClick={() => onTabChange("cctv")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === "cctv"
                    ? "bg-white text-emerald-700 shadow-xs border border-slate-200/80 font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Video className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>CCTV 監視器</span>
              </button>
            </div>

            {/* 後台管理系統按鈕 */}
            {onOpenAdminSettings && (
              <button
                onClick={onOpenAdminSettings}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 border shadow-xs ${
                  isAdminAuth
                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "bg-slate-900 hover:bg-slate-800 text-white border-slate-800"
                }`}
                title="進入後台管理控制台"
              >
                <Settings className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>後台管理</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold flex items-center gap-0.5 ${
                    isAdminAuth
                      ? "bg-emerald-200/80 text-emerald-950"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  }`}
                >
                  {isAdminAuth ? <Unlock className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                  <span>{isAdminAuth ? "已解鎖" : "未解鎖"}</span>
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 手機專屬底部常駐導覽列 (Mobile Sticky Bottom Navigation Bar) - 符合人體工學單手操作 */}
      <nav
        id="mobile-bottom-navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-2xl py-1.5 px-2 pb-[calc(0.4rem+env(safe-area-inset-bottom))]"
      >
        <div className="grid grid-cols-5 gap-1 max-w-lg mx-auto">
          {/* 1. 雪隧車道 */}
          <button
            onClick={() => onTabChange("lane")}
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition cursor-pointer ${
              activeTab === "lane"
                ? "bg-emerald-50 text-emerald-700 font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Compass className={`h-4 w-4 ${activeTab === "lane" ? "text-emerald-600" : "text-slate-400"}`} />
            <span className="text-[10px] mt-0.5 whitespace-nowrap">雪隧車道</span>
          </button>

          {/* 2. 全線 0-54K */}
          <button
            onClick={() => onTabChange("corridor")}
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition cursor-pointer ${
              activeTab === "corridor"
                ? "bg-emerald-50 text-emerald-700 font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <MapPin className={`h-4 w-4 ${activeTab === "corridor" ? "text-emerald-600" : "text-slate-400"}`} />
            <span className="text-[10px] mt-0.5 whitespace-nowrap">全線0-54K</span>
          </button>

          {/* 3. 出發試算 */}
          <button
            onClick={() => onTabChange("departure")}
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition cursor-pointer ${
              activeTab === "departure"
                ? "bg-emerald-50 text-emerald-700 font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Clock className={`h-4 w-4 ${activeTab === "departure" ? "text-emerald-600" : "text-slate-400"}`} />
            <span className="text-[10px] mt-0.5 whitespace-nowrap">出發試算</span>
          </button>

          {/* 4. 原理模型 */}
          <button
            onClick={() => onTabChange("theory")}
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition cursor-pointer ${
              activeTab === "theory"
                ? "bg-emerald-50 text-emerald-700 font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className={`h-4 w-4 ${activeTab === "theory" ? "text-emerald-600" : "text-slate-400"}`} />
            <span className="text-[10px] mt-0.5 whitespace-nowrap">數理原理</span>
          </button>

          {/* 5. CCTV */}
          <button
            onClick={() => onTabChange("cctv")}
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition cursor-pointer ${
              activeTab === "cctv"
                ? "bg-emerald-50 text-emerald-700 font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Video className={`h-4 w-4 ${activeTab === "cctv" ? "text-emerald-600" : "text-slate-400"}`} />
            <span className="text-[10px] mt-0.5 whitespace-nowrap">即時CCTV</span>
          </button>
        </div>
      </nav>
    </>
  );
}


