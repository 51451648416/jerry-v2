import React from "react";
import { Direction, FinalEstimatorOutput } from "../types";
import { Gauge, Zap, ArrowRight, ShieldCheck, Compass, CheckCircle2 } from "lucide-react";

interface TunnelCrossSectionViewProps {
  direction: Direction;
  estimatorOutput: FinalEstimatorOutput | null;
  onDirectionChange?: (dir: Direction) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export default function TunnelCrossSectionView({
  direction,
  estimatorOutput,
  onDirectionChange,
  onRefresh,
  isLoading,
}: TunnelCrossSectionViewProps) {
  // 提取內側車道 (Lane 1) 與外側車道 (Lane 2) 的流速與推薦資訊
  const lane1Speed =
    estimatorOutput?.estimated_state?.laneComparison?.lane1?.equivalentTravelSpeedKmh ?? 0;
  const lane2Speed =
    estimatorOutput?.estimated_state?.laneComparison?.lane2?.equivalentTravelSpeedKmh ?? 0;
  const fasterLaneId =
    estimatorOutput?.estimated_state?.laneComparison?.fasterLaneId ?? 1;

  const speedDiff = Math.abs(lane1Speed - lane2Speed);
  // 若速差小於 2.5 km/h，視為雙車道皆可（兩邊都可以）
  const isBothLanesEqual = speedDiff < 2.5 && lane1Speed > 0 && lane2Speed > 0;
  const isLane1Faster = !isBothLanesEqual && fasterLaneId === 1;
  const isLane2Faster = !isBothLanesEqual && fasterLaneId === 2;

  const lane1TimeSec = estimatorOutput?.estimated_state?.laneComparison?.lane1?.travelTimeSec;
  const lane2TimeSec = estimatorOutput?.estimated_state?.laneComparison?.lane2?.travelTimeSec;

  // 格式化為繁體中文「分秒」顯示 (例如 9分15秒)
  const formatTimeMinSec = (totalSec: number | undefined, fallbackStr?: string) => {
    if (totalSec != null && totalSec > 0 && !isNaN(totalSec)) {
      const mins = Math.floor(totalSec / 60);
      const secs = Math.round(totalSec % 60);
      return `${mins}分${secs < 10 ? "0" : ""}${secs}秒`;
    }
    if (fallbackStr && fallbackStr.includes(":")) {
      const parts = fallbackStr.split(":");
      if (parts.length === 2) {
        return `${parseInt(parts[0], 10)}分${parts[1]}秒`;
      }
    }
    return fallbackStr || "--分--秒";
  };

  const lane1TimeFormatted = formatTimeMinSec(
    lane1TimeSec,
    estimatorOutput?.estimated_state?.laneComparison?.lane1?.travelTimeFormatted
  );
  const lane2TimeFormatted = formatTimeMinSec(
    lane2TimeSec,
    estimatorOutput?.estimated_state?.laneComparison?.lane2?.travelTimeFormatted
  );
  const diffSec = Math.round(estimatorOutput?.estimated_state?.laneComparison?.differenceSec ?? 0);
  const diffMins = Math.floor(Math.abs(diffSec) / 60);
  const diffRemSecs = Math.abs(diffSec) % 60;
  const diffTimeFormatted =
    diffMins > 0 ? `${diffMins}分${diffRemSecs < 10 ? "0" : ""}${diffRemSecs}秒` : `${Math.abs(diffSec)}秒`;

  // 速度對應顏色函數 (80+ 綠色, 60-80 琥珀色, <60 紅色)
  const getSpeedColorInfo = (spd: number) => {
    if (spd >= 80) {
      return {
        bg: "bg-emerald-500",
        text: "text-emerald-400",
        border: "border-emerald-500",
        label: "暢通",
        hex: "#10b981",
        lightBg: "bg-emerald-950/80",
      };
    }
    if (spd >= 60) {
      return {
        bg: "bg-amber-500",
        text: "text-amber-400",
        border: "border-amber-500",
        label: "緩行",
        hex: "#f59e0b",
        lightBg: "bg-amber-950/80",
      };
    }
    return {
      bg: "bg-rose-500",
      text: "text-rose-400",
      border: "border-rose-500",
      label: "壅塞",
      hex: "#ef4444",
      lightBg: "bg-rose-950/80",
    };
  };

  const lane1Info = getSpeedColorInfo(lane1Speed);
  const lane2Info = getSpeedColorInfo(lane2Speed);

  return (
    <div className="bg-slate-950 text-white rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-2xl space-y-4">
      {/* 頂部車道選擇與速度結論核心告示看板 (Direct Speed Verdict & Lane Selection Header) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* 車道結論主標 */}
        <div className="flex items-center gap-3.5">
          <div
            className={`p-3 rounded-2xl shrink-0 flex items-center justify-center ${
              isBothLanesEqual
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                : isLane1Faster
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
            }`}
          >
            <Gauge className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1 shadow-sm ${
                  isBothLanesEqual
                    ? "bg-teal-400 text-slate-950"
                    : isLane1Faster
                    ? "bg-emerald-400 text-slate-950"
                    : "bg-amber-400 text-slate-950"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  {isBothLanesEqual
                    ? "雙車道流速均勻"
                    : isLane1Faster
                    ? "👈 內側較快"
                    : "外側較快 👉"}
                </span>
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {isBothLanesEqual
                  ? "【兩邊都可以】雙向流速相近"
                  : isLane1Faster
                  ? "建議行駛【👈 內側車道 (左)】"
                  : "建議行駛【外側車道 (右) 👉】"}
              </h2>
            </div>
            <div className="text-xs sm:text-sm text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
              <span className="flex items-center gap-1.5">
                👈 內側：<strong className="text-indigo-400 font-mono font-extrabold text-sm sm:text-base">{lane1Speed.toFixed(1)} km/h</strong>
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono text-xs border border-slate-700">
                  耗時 <strong className="text-emerald-400 font-bold">{lane1TimeFormatted}</strong>
                </span>
              </span>
              <span className="text-slate-600 hidden sm:inline">|</span>
              <span className="flex items-center gap-1.5">
                👉 外側：<strong className="text-amber-400 font-mono font-extrabold text-sm sm:text-base">{lane2Speed.toFixed(1)} km/h</strong>
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono text-xs border border-slate-700">
                  耗時 <strong className="text-amber-300 font-bold">{lane2TimeFormatted}</strong>
                </span>
              </span>
              {!isBothLanesEqual && speedDiff > 0 ? (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold text-xs flex items-center gap-1">
                  <span>速度領先 +{speedDiff.toFixed(1)} km/h</span>
                  <span className="text-emerald-200">・預估省 {diffTimeFormatted}</span>
                </span>
              ) : (
                <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-md font-bold text-xs">
                  速差僅 {speedDiff.toFixed(1)} km/h・兩邊時間相近
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 右側：方向切換控制 */}
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => onDirectionChange && onDirectionChange("S")}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                direction === "S"
                  ? "bg-amber-500 text-white shadow-md font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>▼ 南向 (往宜蘭)</span>
            </button>
            <button
              onClick={() => onDirectionChange && onDirectionChange("N")}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                direction === "N"
                  ? "bg-cyan-600 text-white shadow-md font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>▲ 北向 (往台北)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 隧道橫斷面 (Cross-Section) SVG 大尺寸視覺模型 */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[21/9] min-h-[280px] sm:min-h-[420px] md:min-h-[480px] bg-slate-900/90 rounded-3xl border border-slate-800/90 overflow-hidden flex items-center justify-center p-1 sm:p-4 shadow-inner">
        <svg
          viewBox="0 0 1000 500"
          className="w-full h-full object-contain overflow-visible"
        >
          <defs>
            {/* 隧道圓形外襯砌鋼筋混凝土漸層 */}
            <linearGradient id="concreteLining" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* 隧道內部空間漸層 */}
            <radialGradient id="tunnelInteriorGrad" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#090d16" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>

            {/* 車道速度熱區光暈 */}
            <filter id="glowLane1" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor={lane1Info.hex} floodOpacity="0.5" />
            </filter>
            <filter id="glowLane2" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor={lane2Info.hex} floodOpacity="0.5" />
            </filter>
          </defs>

          {/* 1. 地質圍岩結構剖面 (Surrounding Rock) */}
          <rect x="0" y="0" width="1000" height="500" fill="#0b1120" />
          {/* 岩層紋理 */}
          <path d="M 0,100 Q 250,140 500,90 T 1000,120 L 1000,0 L 0,0 Z" fill="#0f172a" opacity="0.6" />
          <path d="M 0,400 Q 250,380 500,420 T 1000,390 L 1000,500 L 0,500 Z" fill="#0f172a" opacity="0.6" />

          {/* 2. 隧道馬蹄形/圓形混凝土環片襯砌 (Reinforced Concrete Tunnel Lining) */}
          <path
            d="M 120,440 C 120,110 880,110 880,440 Z"
            fill="url(#concreteLining)"
            stroke="#64748b"
            strokeWidth="10"
          />
          {/* 次級環片防水層 */}
          <path
            d="M 150,440 C 150,140 850,140 850,440 Z"
            fill="url(#tunnelInteriorGrad)"
            stroke="#475569"
            strokeWidth="3"
          />

          {/* 3. 隧道頂部排風風道與通風噴流風機 (Jet Fans) & 照明燈槽 */}
          <rect x="410" y="150" width="180" height="28" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="2" />
          <text x="500" y="168" fill="#94a3b8" fontSize="11" fontWeight="bold" textAnchor="middle">
            雙向通風噴流風機組
          </text>
          {/* 頂棚照明 */}
          <line x1="260" y1="200" x2="740" y2="200" stroke="#334155" strokeWidth="2" strokeDasharray="10 20" />
          <circle cx="320" cy="200" r="5" fill="#fef08a" />
          <circle cx="420" cy="200" r="5" fill="#fef08a" />
          <circle cx="580" cy="200" r="5" fill="#fef08a" />
          <circle cx="680" cy="200" r="5" fill="#fef08a" />

          {/* 4. 兩側人行逃生維修步道 (Walkways & Escape Access) */}
          {/* 左側步道 */}
          <polygon points="150,440 240,440 240,395 165,395" fill="#334155" stroke="#475569" strokeWidth="2" />
          <text x="195" y="422" fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle">
            逃生維修道
          </text>
          {/* 右側步道 */}
          <polygon points="850,440 760,440 760,395 835,395" fill="#334155" stroke="#475569" strokeWidth="2" />
          <text x="805" y="422" fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle">
            逃生維修道
          </text>

          {/* 5. 瀝青柏油路面主體 (Pavement Surface) */}
          <rect x="240" y="400" width="520" height="40" fill="#0f172a" stroke="#334155" strokeWidth="2" />

          {/* 6. 內側車道 (Lane 1) 路面區域與流速顏色鋪面 */}
          <rect
            x="245"
            y="404"
            width="250"
            height="32"
            rx="4"
            fill={lane1Info.hex}
            fillOpacity={isLane1Faster || isBothLanesEqual ? "0.45" : "0.18"}
            stroke={isLane1Faster || isBothLanesEqual ? lane1Info.hex : "transparent"}
            strokeWidth="2.5"
            filter="url(#glowLane1)"
          />

          {/* 7. 外側車道 (Lane 2) 路面區域與流速顏色鋪面 */}
          <rect
            x="505"
            y="404"
            width="250"
            height="32"
            rx="4"
            fill={lane2Info.hex}
            fillOpacity={isLane2Faster || isBothLanesEqual ? "0.45" : "0.18"}
            stroke={isLane2Faster || isBothLanesEqual ? lane2Info.hex : "transparent"}
            strokeWidth="2.5"
            filter="url(#glowLane2)"
          />

          {/* 8. 車道標線：中央【連續雙白實線】(Continuous Double Solid White Lines) */}
          {/* 左白實線 */}
          <line x1="497" y1="400" x2="497" y2="440" stroke="#ffffff" strokeWidth="4" />
          {/* 右白實線 */}
          <line x1="503" y1="400" x2="503" y2="440" stroke="#ffffff" strokeWidth="4" />
          {/* 左側路緣黃線 */}
          <line x1="245" y1="400" x2="245" y2="440" stroke="#f59e0b" strokeWidth="4" />
          {/* 右側路緣白線 */}
          <line x1="755" y1="400" x2="755" y2="440" stroke="#ffffff" strokeWidth="4" />

          {/* 9. 車道上方頂棚即時指示燈號 (Overhead Lane Use Signals CMS) */}
          {/* 內側車道上方燈箱 */}
          <g transform="translate(370, 230)">
            <rect
              x="-50"
              y="-28"
              width="100"
              height="56"
              rx="10"
              fill="#020617"
              stroke={isLane1Faster || isBothLanesEqual ? "#10b981" : lane1Info.hex}
              strokeWidth="3"
            />
            <path
              d="M 0,-14 L 0,14 M -9,4 L 0,14 L 9,4"
              stroke={isLane1Faster || isBothLanesEqual ? "#10b981" : lane1Info.hex}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <text x="0" y="-36" fill="#f1f5f9" fontSize="13" fontWeight="bold" textAnchor="middle">
              👈 內側 (左)
            </text>
          </g>

          {/* 外側車道上方燈箱 */}
          <g transform="translate(630, 230)">
            <rect
              x="-50"
              y="-28"
              width="100"
              height="56"
              rx="10"
              fill="#020617"
              stroke={isLane2Faster || isBothLanesEqual ? "#10b981" : lane2Info.hex}
              strokeWidth="3"
            />
            <path
              d="M 0,-14 L 0,14 M -9,4 L 0,14 L 9,4"
              stroke={isLane2Faster || isBothLanesEqual ? "#10b981" : lane2Info.hex}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <text x="0" y="-36" fill="#f1f5f9" fontSize="13" fontWeight="bold" textAnchor="middle">
              外側 (右) 👉
            </text>
          </g>

          {/* 10. 車道中央懸浮【大字流速數字 HUD 卡片】 */}
          {/* Lane 1 流速 HUD */}
          <g transform="translate(370, 325)">
            <rect
              x="-95"
              y="-34"
              width="190"
              height="68"
              rx="14"
              fill="#0f172a"
              stroke={lane1Info.hex}
              strokeWidth={isLane1Faster || isBothLanesEqual ? "3.5" : "1.5"}
            />
            {(isLane1Faster || isBothLanesEqual) && (
              <rect x="-80" y="-44" width="160" height="20" rx="8" fill={isBothLanesEqual ? "#0d9488" : "#059669"} />
            )}
            {(isLane1Faster || isBothLanesEqual) && (
              <text x="0" y="-30" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle">
                {isBothLanesEqual ? "★ 兩邊皆可順行" : "★ 推薦行駛車道"}
              </text>
            )}
            <text x="0" y="2" fill="#ffffff" fontSize="26" fontFamily="monospace" fontWeight="900" textAnchor="middle">
              {lane1Speed > 0 ? lane1Speed.toFixed(1) : "0.0"} <tspan fontSize="13" fill="#94a3b8">km/h</tspan>
            </text>
            <text x="0" y="22" fill={lane1Info.hex} fontSize="11" fontWeight="bold" textAnchor="middle">
              {lane1Info.label}狀態・約 {lane1TimeFormatted}
            </text>
          </g>

          {/* Lane 2 流速 HUD */}
          <g transform="translate(630, 325)">
            <rect
              x="-95"
              y="-34"
              width="190"
              height="68"
              rx="14"
              fill="#0f172a"
              stroke={lane2Info.hex}
              strokeWidth={isLane2Faster || isBothLanesEqual ? "3.5" : "1.5"}
            />
            {(isLane2Faster || isBothLanesEqual) && (
              <rect x="-80" y="-44" width="160" height="20" rx="8" fill={isBothLanesEqual ? "#0d9488" : "#059669"} />
            )}
            {(isLane2Faster || isBothLanesEqual) && (
              <text x="0" y="-30" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle">
                {isBothLanesEqual ? "★ 兩邊皆可順行" : "★ 推薦行駛車道"}
              </text>
            )}
            <text x="0" y="2" fill="#ffffff" fontSize="26" fontFamily="monospace" fontWeight="900" textAnchor="middle">
              {lane2Speed > 0 ? lane2Speed.toFixed(1) : "0.0"} <tspan fontSize="13" fill="#94a3b8">km/h</tspan>
            </text>
            <text x="0" y="22" fill={lane2Info.hex} fontSize="11" fontWeight="bold" textAnchor="middle">
              {lane2Info.label}狀態・約 {lane2TimeFormatted}
            </text>
          </g>

          {/* 11. 雙白實線告示 */}
          <g transform="translate(500, 470)">
            <rect x="-110" y="-12" width="220" height="24" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1" />
            <text x="0" y="4" fill="#f8fafc" fontSize="10" fontWeight="bold" textAnchor="middle">
              全線連續雙白實線・嚴禁變換車道
            </text>
          </g>
        </svg>
      </div>

      {/* 底部數據與行車安全提示 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
        {/* 內側車道摘要 */}
        <div
          className={`p-3.5 rounded-2xl border ${
            isLane1Faster || isBothLanesEqual
              ? "bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/40"
              : "bg-slate-900 border-slate-800"
          } space-y-1`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span>👈 內側車道 (左側)</span>
              {(isLane1Faster || isBothLanesEqual) && (
                <span className="bg-emerald-500 text-slate-950 px-2 py-0.2 rounded-full font-black text-[10px]">
                  {isBothLanesEqual ? "兩邊皆可" : "推薦"}
                </span>
              )}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full font-mono font-bold text-[11px] ${lane1Info.lightBg} ${lane1Info.text}`}
            >
              {lane1Speed.toFixed(1)} km/h ({lane1Info.label})
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex justify-between">
            <span>預估全線通過耗時：</span>
            <span className="font-mono font-bold text-white">{lane1TimeFormatted}</span>
          </div>
        </div>

        {/* 外側車道摘要 */}
        <div
          className={`p-3.5 rounded-2xl border ${
            isLane2Faster || isBothLanesEqual
              ? "bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/40"
              : "bg-slate-900 border-slate-800"
          } space-y-1`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>外側車道 (右側) 👉</span>
              {(isLane2Faster || isBothLanesEqual) && (
                <span className="bg-emerald-500 text-slate-950 px-2 py-0.2 rounded-full font-black text-[10px]">
                  {isBothLanesEqual ? "兩邊皆可" : "推薦"}
                </span>
              )}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full font-mono font-bold text-[11px] ${lane2Info.lightBg} ${lane2Info.text}`}
            >
              {lane2Speed.toFixed(1)} km/h ({lane2Info.label})
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex justify-between">
            <span>預估全線通過耗時：</span>
            <span className="font-mono font-bold text-white">{lane2TimeFormatted}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
