import React from "react";

interface SpeedometerGaugeProps {
  speedKmh: number;
  maxSpeed?: number;
  label?: string;
  laneName: string;
  laneColor: string;
  isRecommended?: boolean;
  laneArrowColor?: "emerald" | "amber" | "rose";
}

export default function SpeedometerGauge({
  speedKmh,
  maxSpeed = 120,
  label,
  laneName,
  laneColor,
  isRecommended = false,
  laneArrowColor = "emerald",
}: SpeedometerGaugeProps) {
  // 限制顯示角度：-135 度 (0 km/h) 到 +135 度 (120 km/h) -> 總夾角 270 度
  const clampedSpeed = Math.max(0, Math.min(speedKmh, maxSpeed));
  const angle = -135 + (clampedSpeed / maxSpeed) * 270;

  // 速度區間顏色
  const getSpeedZoneColor = (spd: number) => {
    if (spd >= 80) return "#10b981"; // 綠色暢通
    if (spd >= 60) return "#f59e0b"; // 琥珀色緩行
    return "#ef4444"; // 紅色壅塞
  };

  const needleColor = getSpeedZoneColor(clampedSpeed);

  // 刻度生成 (每 20 km/h 一大格，每 10 km/h 一小格)
  const ticks = [0, 20, 40, 60, 80, 100, 120];

  return (
    <div className="relative flex flex-col items-center justify-center p-3 bg-slate-900 rounded-3xl border border-slate-800 text-white shadow-inner select-none overflow-hidden">
      {/* 頂部：車道上方即時指示燈 (如雪隧入口綠色箭頭指示器) */}
      <div className="w-full flex items-center justify-between px-2 pb-1 border-b border-slate-800/80 mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: laneColor }}
          />
          <span className="text-xs font-bold tracking-tight text-slate-200">
            {laneName}
          </span>
        </div>

        {/* 實體車道指示燈號 (如雪隧頂棚綠色箭頭) */}
        <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
          <span className="text-[10px] text-slate-400 font-mono">車道燈號:</span>
          <span
            className={`font-black text-xs inline-flex items-center animate-pulse ${
              laneArrowColor === "emerald"
                ? "text-emerald-400"
                : laneArrowColor === "amber"
                ? "text-amber-400"
                : "text-rose-400"
            }`}
            title="隧道車道上方指示燈"
          >
            ⬇
          </span>
        </div>
      </div>

      {/* SVG 汽車時速表盤 (Speedometer Dial) */}
      <div className="relative w-40 h-32 flex items-center justify-center">
        <svg
          viewBox="0 0 200 160"
          className="w-full h-full overflow-visible"
        >
          {/* 背景圓弧軌道 */}
          <path
            d="M 30 140 A 80 80 0 1 1 170 140"
            fill="none"
            stroke="#1e293b"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* 速度分級色帶 */}
          {/* 壅塞區 0-60 km/h (紅色) */}
          <path
            d="M 30 140 A 80 80 0 0 1 65 60"
            fill="none"
            stroke="rgba(239, 68, 68, 0.4)"
            strokeWidth="4"
          />
          {/* 緩行區 60-80 km/h (黃色) */}
          <path
            d="M 65 60 A 80 80 0 0 1 135 60"
            fill="none"
            stroke="rgba(245, 158, 11, 0.4)"
            strokeWidth="4"
          />
          {/* 暢通區 80-120 km/h (綠色) */}
          <path
            d="M 135 60 A 80 80 0 0 1 170 140"
            fill="none"
            stroke="rgba(16, 185, 129, 0.5)"
            strokeWidth="4"
          />

          {/* 刻度線與數字 */}
          {ticks.map((val) => {
            const tAngle = (-135 + (val / maxSpeed) * 270) * (Math.PI / 180);
            const r1 = 80;
            const r2 = 68;
            const x1 = 100 + Math.cos(tAngle) * r1;
            const y1 = 100 + Math.sin(tAngle) * r1;
            const x2 = 100 + Math.cos(tAngle) * r2;
            const y2 = 100 + Math.sin(tAngle) * r2;

            const tx = 100 + Math.cos(tAngle) * 54;
            const ty = 100 + Math.sin(tAngle) * 54;

            return (
              <g key={val}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={val >= 80 ? "#10b981" : val >= 60 ? "#f59e0b" : "#64748b"}
                  strokeWidth={val % 40 === 0 ? "2.5" : "1.5"}
                />
                <text
                  x={tx}
                  y={ty + 3}
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* 指針 (Needle) */}
          <g transform={`rotate(${angle} 100 100)`}>
            <polygon
              points="97,100 103,100 100,28"
              fill={needleColor}
              filter="drop-shadow(0px 0px 3px rgba(16, 185, 129, 0.6))"
            />
            <circle cx="100" cy="100" r="7" fill="#0f172a" stroke={needleColor} strokeWidth="3" />
          </g>
        </svg>

        {/* 儀表中央數位數值 (Digital HUD Speed Display) */}
        <div className="absolute bottom-1 flex flex-col items-center justify-center">
          <div className="text-2xl font-black font-mono tracking-tight text-white flex items-baseline gap-0.5">
            <span>{speedKmh.toFixed(1)}</span>
            <span className="text-[10px] font-sans text-slate-400 font-bold">km/h</span>
          </div>
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5"
            style={{
              backgroundColor: `${needleColor}25`,
              color: needleColor,
            }}
          >
            {speedKmh >= 80 ? "暢通運轉" : speedKmh >= 60 ? "穩定行駛" : "路段壅塞"}
          </span>
        </div>
      </div>

      {/* 底部：雙白連續實線標記指示 (Continuous Solid Double Lines) */}
      <div className="w-full mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-1 bg-white rounded-none"></span>
          <span className="inline-block w-4 h-1 bg-white rounded-none"></span>
          <span className="text-[9px] text-slate-300">連續雙白實線</span>
        </span>
        <span className="text-amber-400/90 text-[9px]">嚴禁變換車道</span>
      </div>
    </div>
  );
}
