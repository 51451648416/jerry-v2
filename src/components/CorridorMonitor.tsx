import React from "react";
import {
  MapPin,
  Clock,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  TrendingDown,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Activity,
  Zap,
} from "lucide-react";
import { Direction, FinalEstimatorOutput, CorridorSegment } from "../types";
import { CORRIDOR_INTERCHANGES } from "../data/corridorConfig";

interface CorridorMonitorProps {
  estimatorOutput: FinalEstimatorOutput | null;
  direction: Direction;
  onDirectionChange: (newDir: Direction) => void;
  onStartAnalysis?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  cooldown?: number;
  onSelectRouteForDeparture?: (originKm: number, destKm: number) => void;
}

export default function CorridorMonitor({
  estimatorOutput,
  direction,
  onDirectionChange,
  onStartAnalysis,
  onRefresh,
  isLoading = false,
  cooldown = 0,
  onSelectRouteForDeparture,
}: CorridorMonitorProps) {
  const corridorState = estimatorOutput?.estimated_state?.corridorState;

  const totalKm = corridorState?.totalDistanceKm || 54.0;
  const totalTravelTimeFormatted = corridorState?.totalTravelTimeFormatted || (estimatorOutput ? "--" : "待啟動分析");
  const avgSpeed = corridorState?.averageSpeedKmh ?? 0;
  const bottleneck = corridorState?.bottleneckSegment || (estimatorOutput ? "全線順暢" : "待連線偵測");
  const segments = corridorState?.segments || [];
  const detectorsFound = corridorState?.totalDetectorsFound || (estimatorOutput ? 19 : 0);

  const handleStartOrRefresh = () => {
    if (isLoading) return;
    if (onStartAnalysis && !estimatorOutput) {
      onStartAnalysis();
    } else if (onRefresh) {
      onRefresh();
    } else if (onStartAnalysis) {
      onStartAnalysis();
    }
  };

  return (
    <div className="space-y-6">
      {/* 尚未啟動分析時的獨立引導啟動卡片 (Prompt Start Card when not yet loaded) */}
      {!estimatorOutput && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500 text-slate-950 rounded-2xl font-black shadow-lg shadow-emerald-500/20">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  0K ~ 54K CORRIDOR MONITOR
                </span>
                <h2 className="text-xl sm:text-2xl font-black mt-1 text-white tracking-tight">
                  國道5號全線 0K ～ 54K 走廊即時路況監控
                </h2>
              </div>
            </div>

            {/* 方向切換 */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-700 self-stretch sm:self-auto">
              <button
                onClick={() => onDirectionChange("S")}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  direction === "S"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                南向 (往宜蘭)
              </button>
              <button
                onClick={() => onDirectionChange("N")}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  direction === "N"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                北向 (往台北)
              </button>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            系統將連線交通部 TDX 官方端點，即時彙整南港 (0K)、石碇 (4K)、坪林 (15K)、雪山隧道 (15.2K~28.1K)、頭城 (30K)、宜蘭 (38K)、羅東 (46K) 及蘇澳 (54K) 全線 19 座 VD 偵測站數據，精算各分段流速與總行車耗時。
          </p>

          <div className="pt-2">
            <button
              onClick={handleStartOrRefresh}
              disabled={isLoading || cooldown > 0}
              className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-3 transition shadow-xl cursor-pointer ${
                isLoading
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : cooldown > 0
                  ? "bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700"
                  : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30 hover:scale-[1.01] active:scale-[0.99]"
              }`}
            >
              <Zap className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
              <span>
                {isLoading
                  ? "正在連線 TDX 官方端點分析中..."
                  : cooldown > 0
                  ? `冷卻倒數中 (${cooldown} 秒後可再次更新)`
                  : "🚀 啟動 0K~54K 全線即時路況監控與數據獲取"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 頂部全線總覽概況卡片 */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-emerald-600 text-white font-bold">
                <MapPin className="h-4 w-4" />
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                國道5號全線 0K ～ 54K 走廊即時路況監控
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              涵蓋南港系統 (0K)、石碇 (4K)、坪林 (15K)、雪山隧道 (15.2K~28.1K)、礁溪/頭城 (30K)、宜蘭 (38K)、羅東 (46K)、蘇澳 (54K)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
            {/* 獨立啟動 / 更新按鈕 (Independent Action Button) */}
            <button
              onClick={handleStartOrRefresh}
              disabled={isLoading || cooldown > 0}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs ${
                isLoading
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : cooldown > 0
                  ? "bg-slate-100 text-slate-500 cursor-not-allowed font-mono"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
              }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>
                {isLoading
                  ? "取得最新數據中..."
                  : cooldown > 0
                  ? `冷卻中 (${cooldown}s)`
                  : estimatorOutput
                  ? "更新全線即時數據"
                  : "啟動全線分析"}
              </span>
            </button>

            {/* 方向切換器 */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => onDirectionChange("S")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                  direction === "S"
                    ? "bg-white text-emerald-700 shadow-xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>👇 南向 (往宜蘭)</span>
              </button>
              <button
                onClick={() => onDirectionChange("N")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                  direction === "N"
                    ? "bg-white text-emerald-700 shadow-xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>👆 北向 (往台北)</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 大即時走廊指標 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-5 font-mono">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-sans">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
              <span>全線 (0K~54K) 預估耗時</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-800 mt-1">
              {totalTravelTimeFormatted}
            </div>
            <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
              總長 {totalKm} 公里
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-sans">
              <Gauge className="h-3.5 w-3.5 text-sky-600" />
              <span>全線走廊平均時速</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-800 mt-1">
              {avgSpeed > 0 ? avgSpeed.toFixed(1) : "--"}{" "}
              <span className="text-xs font-normal text-slate-500">km/h</span>
            </div>
            <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
              空間調和流速平均
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-sans">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span>走廊最慢瓶頸路段</span>
            </div>
            <div className="text-sm font-bold text-slate-800 mt-1 truncate">
              {bottleneck}
            </div>
            <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
              動態偵測波傳播回堵
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-sans">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>在線車輛偵測站</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
              {detectorsFound}{" "}
              <span className="text-xs font-normal text-slate-500">座 VD</span>
            </div>
            <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
              全線 0K~54K 涵蓋率 100%
            </span>
          </div>
        </div>
      </div>

      {/* 國5全線 6 大路段分段詳細監控清單 */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>國道5號分段路況與通過耗時</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                共 {segments.length > 0 ? segments.length : 6} 路段
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              雪山隧道段 (15K~30K) 採用 20 空間微元連續積分；其餘高架路段採用即時調和空間流速推估
            </p>
          </div>

          {!estimatorOutput && (
            <button
              onClick={handleStartOrRefresh}
              disabled={isLoading || cooldown > 0}
              className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>點此取得各路段即時數據</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(segments.length > 0 ? segments : [
            { id: "seg-1", name: "南港系統 ～ 石碇", fromKm: 0, toKm: 4, isTunnelSection: false, status: "FREE_FLOW", statusLabel: "待連線", avgSpeedKmh: 80, travelTimeFormatted: "-- 分鐘" },
            { id: "seg-2", name: "石碇 ～ 坪林", fromKm: 4, toKm: 15, isTunnelSection: false, status: "FREE_FLOW", statusLabel: "待連線", avgSpeedKmh: 80, travelTimeFormatted: "-- 分鐘" },
            { id: "seg-3", name: "雪山隧道 (坪林~頭城)", fromKm: 15, toKm: 30, isTunnelSection: true, status: "FREE_FLOW", statusLabel: "待連線", avgSpeedKmh: 75, travelTimeFormatted: "-- 分鐘" },
            { id: "seg-4", name: "頭城 ～ 宜蘭", fromKm: 30, toKm: 38, isTunnelSection: false, status: "FREE_FLOW", statusLabel: "待連線", avgSpeedKmh: 90, travelTimeFormatted: "-- 分鐘" },
            { id: "seg-5", name: "宜蘭 ～ 羅東", fromKm: 38, toKm: 46, isTunnelSection: false, status: "FREE_FLOW", statusLabel: "待連線", avgSpeedKmh: 90, travelTimeFormatted: "-- 分鐘" },
            { id: "seg-6", name: "羅東 ～ 蘇澳", fromKm: 46, toKm: 54, isTunnelSection: false, status: "FREE_FLOW", statusLabel: "待連線", avgSpeedKmh: 90, travelTimeFormatted: "-- 分鐘" },
          ]).map((seg, idx) => (
            <div
              key={seg.id || idx}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                seg.isTunnelSection && seg.name.includes("雪山隧道")
                  ? "bg-slate-900 border-slate-800 text-white shadow-md ring-1 ring-emerald-500/30"
                  : "bg-slate-50 border-slate-200 text-slate-800"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold ${
                        seg.isTunnelSection && seg.name.includes("雪山隧道")
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {seg.isTunnelSection ? "🚇 隧道核心" : "🛣️ 高架路段"}
                    </span>
                    <span className="text-xs font-mono opacity-60">
                      {Math.min(seg.fromKm, seg.toKm)}K ~ {Math.max(seg.fromKm, seg.toKm)}K
                    </span>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      seg.status === "FREE_FLOW"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : seg.status === "TRANSITION"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    } ${seg.isTunnelSection && seg.name.includes("雪山隧道") ? "!bg-slate-800 !text-emerald-400 !border-emerald-500/40" : ""}`}
                  >
                    {seg.statusLabel.split(" ")[0]}
                  </span>
                </div>

                <h4 className="text-sm font-extrabold mt-2 tracking-tight">
                  {seg.name}
                </h4>
              </div>

              <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-between font-mono">
                <div>
                  <span className="text-[10px] opacity-70 block font-sans">平均時速</span>
                  <span className="text-lg font-black">{seg.avgSpeedKmh ? `${seg.avgSpeedKmh} km/h` : "--"}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] opacity-70 block font-sans">預估通過時間</span>
                  <span
                    className={`text-lg font-black ${
                      seg.isTunnelSection && seg.name.includes("雪山隧道")
                        ? "text-emerald-400"
                        : "text-slate-900"
                    }`}
                  >
                    {seg.travelTimeFormatted}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 國5全線交流道里程節點導引 */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <span>國道5號全線重要交流道節點與出入口</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 text-xs font-mono">
          {CORRIDOR_INTERCHANGES.map((ic, i) => (
            <div
              key={i}
              className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center space-y-1"
            >
              <span className="text-emerald-600 font-extrabold text-sm block">
                {ic.mileageKm.toFixed(1)}K
              </span>
              <span className="font-bold text-slate-800 block text-[11px] truncate">
                {ic.name}
              </span>
              <span className="text-[10px] text-slate-400 block font-sans truncate">
                {ic.shortName}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

