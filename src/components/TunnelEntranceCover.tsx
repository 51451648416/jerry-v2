import React from "react";
import {
  Compass,
  Gauge,
  Activity,
  ArrowDown,
  ShieldCheck,
  Zap,
  ChevronRight,
  Info,
} from "lucide-react";
import { Direction, FinalEstimatorOutput } from "../types";

interface TunnelEntranceCoverProps {
  direction: Direction;
  estimatorOutput: FinalEstimatorOutput | null;
  onStartAnalysis: () => void;
  isLoading?: boolean;
}

export default function TunnelEntranceCover({
  direction,
  estimatorOutput,
  onStartAnalysis,
  isLoading = false,
}: TunnelEntranceCoverProps) {
  const lane1Speed =
    estimatorOutput?.estimated_state?.laneComparison?.lane1?.equivalentTravelSpeedKmh ?? 0;
  const lane2Speed =
    estimatorOutput?.estimated_state?.laneComparison?.lane2?.equivalentTravelSpeedKmh ?? 0;
  const fasterLaneId =
    estimatorOutput?.estimated_state?.laneComparison?.fasterLaneId ?? 1;

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-slate-950 text-white my-2">
      {/* 1. 雪山隧道真實入口實景封面 (Hsuehshan Tunnel Portal Entrance Banner) */}
      <div className="relative w-full h-[320px] sm:h-[380px] md:h-[420px] overflow-hidden">
        {/* 高擬真雪隧入口視覺 (拱形隧道、雙車道上方綠色箭頭指示器、中央雙白連續實線、山林綠意) */}
        <div className="absolute inset-0 bg-linear-to-b from-slate-950/20 via-transparent to-slate-950/90 z-10" />

        {/* 隧道背景視覺架構 */}
        <svg
          viewBox="0 0 1200 600"
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full object-cover"
        >
          <defs>
            {/* 山林植被漸層 */}
            <linearGradient id="hillsideGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e3a1e" />
              <stop offset="50%" stopColor="#2d4a22" />
              <stop offset="100%" stopColor="#162e15" />
            </linearGradient>

            {/* 混凝土隧道外拱漸層 */}
            <linearGradient id="portalArchGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* 隧道深處透視陰影 */}
            <radialGradient id="tunnelDepth" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#020617" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </radialGradient>

            {/* 車道照明頂燈光芒 */}
            <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
            </radialGradient>

            {/* 綠色車道箭頭光暈 */}
            <filter id="greenGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. 兩側與頂部茂密山林 (Lush Greenery) */}
          <rect width="1200" height="600" fill="url(#hillsideGrad)" />
          {/* 植物紋理細節 */}
          <circle cx="150" cy="120" r="140" fill="#1b431c" opacity="0.8" />
          <circle cx="300" cy="80" r="120" fill="#2d5a27" opacity="0.8" />
          <circle cx="900" cy="90" r="130" fill="#1c451e" opacity="0.8" />
          <circle cx="1080" cy="140" r="150" fill="#284e23" opacity="0.8" />

          {/* 2. 宏偉混凝土拱形隧道外結構 (Arch Portal) */}
          <path
            d="M 220,600 C 220,200 400,60 600,60 C 800,60 980,200 980,600 Z"
            fill="url(#portalArchGrad)"
          />
          {/* 拱門層次圈 */}
          <path
            d="M 260,600 C 260,240 420,100 600,100 C 780,100 940,240 940,600 Z"
            fill="#334155"
          />

          {/* 3. 隧道內部深邃空間 (Tunnel Interior) */}
          <path
            d="M 290,600 C 290,270 435,130 600,130 C 765,130 910,270 910,600 Z"
            fill="url(#tunnelDepth)"
          />

          {/* 4. 隧道頂部弧形壁面與照明燈列 (Tunnel Ceiling Lamps) */}
          {/* 左側燈列 */}
          <g opacity="0.85">
            <ellipse cx="490" cy="270" rx="9" ry="4" fill="#fef08a" />
            <ellipse cx="505" cy="285" rx="10" ry="4" fill="#fef08a" />
            <ellipse cx="522" cy="300" rx="11" ry="5" fill="#fef08a" />
            <ellipse cx="540" cy="318" rx="12" ry="5" fill="#fef08a" />
          </g>
          {/* 右側燈列 */}
          <g opacity="0.85">
            <ellipse cx="710" cy="270" rx="9" ry="4" fill="#fef08a" />
            <ellipse cx="695" cy="285" rx="10" ry="4" fill="#fef08a" />
            <ellipse cx="678" cy="300" rx="11" ry="5" fill="#fef08a" />
            <ellipse cx="660" cy="318" rx="12" ry="5" fill="#fef08a" />
          </g>

          {/* 5. 柏油路面 (Asphalt Road Surface) */}
          <polygon
            points="310,600 520,380 680,380 890,600"
            fill="#0f172a"
          />

          {/* 6. 中央車道線：【雙白連續實線】(Continuous Solid Double Lines - 嚴禁變換車道) */}
          {/* 左實線 */}
          <line
            x1="597"
            y1="380"
            x2="585"
            y2="600"
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="square"
          />
          {/* 右實線 */}
          <line
            x1="603"
            y1="380"
            x2="615"
            y2="600"
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="square"
          />

          {/* 7. 兩側路緣連續實線 (Solid Road Edge Lines) */}
          <line x1="520" y1="380" x2="330" y2="600" stroke="#f8fafc" strokeWidth="4" />
          <line x1="680" y1="380" x2="870" y2="600" stroke="#f8fafc" strokeWidth="4" />

          {/* 8. 隧道頂部車道指示燈號：【亮綠色向下箭頭 ⬇ ⬇】(Illuminated Green Arrows) */}
          {/* 內側車道上方燈號 */}
          <g transform="translate(520, 260)" filter="url(#greenGlow)">
            <rect x="-18" y="-18" width="36" height="36" rx="6" fill="#022c22" stroke="#10b981" strokeWidth="2" />
            <path
              d="M 0,-10 L 0,8 M -7,1 L 0,8 L 7,1"
              stroke="#34d399"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>

          {/* 外側車道上方燈號 */}
          <g transform="translate(680, 260)" filter="url(#greenGlow)">
            <rect x="-18" y="-18" width="36" height="36" rx="6" fill="#022c22" stroke="#10b981" strokeWidth="2" />
            <path
              d="M 0,-10 L 0,8 M -7,1 L 0,8 L 7,1"
              stroke="#34d399"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>

          {/* 9. 正在進入隧道的白色休旅車 (White SUV Car Entering Tunnel) */}
          <g transform="translate(500, 470) scale(0.9)">
            {/* 影子 */}
            <ellipse cx="0" cy="55" rx="55" ry="12" fill="rgba(0,0,0,0.6)" />
            {/* 車身下半部 */}
            <path
              d="M -45,15 C -45,5 -35,-5 -25,-8 L 25,-8 C 35,-5 45,5 45,15 L 48,45 C 48,50 42,54 36,54 L -36,54 C -42,54 -48,50 -48,45 Z"
              fill="#f8fafc"
            />
            {/* 後車窗 */}
            <path
              d="M -30,-4 L 30,-4 L 24,18 L -24,18 Z"
              fill="#0f172a"
            />
            {/* 尾燈 */}
            <rect x="-44" y="24" width="16" height="7" rx="2" fill="#ef4444" />
            <rect x="28" y="24" width="16" height="7" rx="2" fill="#ef4444" />
            {/* 白色車牌 */}
            <rect x="-14" y="32" width="28" height="12" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
          </g>
        </svg>

        {/* 2. 封面浮層資訊 (Overlay Title & Direction Indicator) */}
        <div className="absolute top-4 sm:top-6 left-4 sm:left-8 z-20 space-y-2 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/85 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>
              {direction === "S" ? "南向入口：坪林北口 (15.2K)" : "北向入口：頭城南口 (28.1K)"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-md">
            國道5號雪山隧道
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 drop-shadow-sm font-medium">
            雙向雙管 13km 隧道精密流速預測・全線連續雙白實線車道智慧指引
          </p>
        </div>

        {/* 3. 封面右下角：車道指示器與實體燈號預覽 */}
        <div className="absolute bottom-4 right-4 sm:right-8 z-20 flex items-center gap-3">
          {/* 內側車道狀態 */}
          <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-700 shadow-xl flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-500/50 text-emerald-400 text-xs font-black">
              ⬇
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">內側車道 (Lane 1)</span>
              <span className="text-xs font-bold text-white font-mono">
                {lane1Speed > 0 ? `${lane1Speed.toFixed(1)} km/h` : "全線通暢 ⬇"}
              </span>
            </div>
          </div>

          {/* 外側車道狀態 */}
          <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-700 shadow-xl flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-500/50 text-emerald-400 text-xs font-black">
              ⬇
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">外側車道 (Lane 2)</span>
              <span className="text-xs font-bold text-white font-mono">
                {lane2Speed > 0 ? `${lane2Speed.toFixed(1)} km/h` : "全線通暢 ⬇"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
