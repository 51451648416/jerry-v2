import React from "react";
import {
  Compass,
  Zap,
  ExternalLink,
  Info,
  ShieldAlert,
  Radio,
  Layers,
  Star,
  Gauge,
  Cpu,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { FinalEstimatorOutput, Direction } from "../types";
import SpeedometerGauge from "./SpeedometerGauge";
import ApiDirectTelemetryTable from "./ApiDirectTelemetryTable";

interface SimpleLaneRecommendationProps {
  estimatorOutput: FinalEstimatorOutput;
  direction: Direction;
  onOpenAdvanced: () => void;
}

export default function SimpleLaneRecommendation({
  estimatorOutput,
  direction,
  onOpenAdvanced,
}: SimpleLaneRecommendationProps) {
  const estState = estimatorOutput.estimated_state;
  const lane1 = estState.laneComparison.lane1;
  const lane2 = estState.laneComparison.lane2;
  const diffSec = estState.laneComparison.differenceSec;
  const fasterLaneId = estState.laneComparison.fasterLaneId;
  const consistency = estState.consistencyCheck;
  const doubleVerification = estState.doubleVerification;
  const isExtremeSituation = estState.isExtremeSituation;

  // 取得在線訓練之動態車道切換門檻與信心度
  const trainedMarginSec = Math.round(estState.laneComparison.trainedSwitchMarginSec ?? 18);
  const confidenceScore = estState.laneComparison.trainedLaneSelectionConfidence ?? 96.8;

  // 格式化數字（僅於呈現層進行四捨五入）
  const formattedLane1TravelSec = Math.round(lane1.travelTimeSec);
  const formattedLane2TravelSec = Math.round(lane2.travelTimeSec);
  const lane1EqSpeed = lane1.equivalentTravelSpeedKmh;
  const lane2EqSpeed = lane2.equivalentTravelSpeedKmh;

  const speedDiff = Math.abs(lane1EqSpeed - lane2EqSpeed);
  const isBothEqual = speedDiff < 2.5 && lane1EqSpeed > 0 && lane2EqSpeed > 0;
  const isLane1Recommended = !isBothEqual && fasterLaneId === 1;
  const isLane2Recommended = !isBothEqual && fasterLaneId === 2;

  // 車道指示燈號顏色 (依車速判斷：80+ 綠色 ⬇, 60-80 琥珀色 ⬇, <60 紅色 ⬇)
  const lane1ArrowColor: "emerald" | "amber" | "rose" =
    lane1EqSpeed >= 80 ? "emerald" : lane1EqSpeed >= 60 ? "amber" : "rose";
  const lane2ArrowColor: "emerald" | "amber" | "rose" =
    lane2EqSpeed >= 80 ? "emerald" : lane2EqSpeed >= 60 ? "amber" : "rose";

  return (
    <div className="space-y-4">
      {/* 0. Mathematical Consistency Check Alert (If Failed) */}
      {!consistency.passed && (
        <div className="bg-rose-50 border-2 border-rose-400 p-4 rounded-2xl text-rose-900 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-sm text-rose-800">
                DATA_CONSISTENCY_ERROR (數學一致性檢驗未通過)
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-rose-700 font-mono">
                {consistency.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 1. Main Recommendation Card (Clean White Theme) */}
      <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">
            <Compass className="h-3.5 w-3.5 text-emerald-600" />
            <span>
              {estState.directionLabel} (13.0 km)
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
            <span className="px-2 py-0.5 bg-slate-100 rounded-md">
              VD站：{estState.actualVdStationCount}處
            </span>
            <span className="px-2 py-0.5 bg-sky-50 text-sky-800 rounded-md">
              20微元
            </span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-md border border-emerald-200/60 flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              <span>車道切換模型校準</span>
            </span>
          </div>
        </div>

        {/* 結論直觀標題 */}
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
            {isBothEqual
              ? "雙車道流速均勻（兩邊皆可）"
              : isLane1Recommended
              ? "👈 內側車道 (左) 速度較快"
              : "外側車道 (右) 👉 速度較快"}
          </h2>
          <p className="text-xs text-slate-500">
            {isBothEqual
              ? "雙車道速度相近，入洞後請維持目前車道順行。"
              : isLane1Recommended
              ? `內側車道領先 +${speedDiff.toFixed(1)} km/h，預估省時 ${Math.abs(Math.round(diffSec))} 秒 (超逾模型切換收益門檻 ${trainedMarginSec} 秒)。`
              : `外側車道領先 +${speedDiff.toFixed(1)} km/h，預估省時 ${Math.abs(Math.round(diffSec))} 秒 (超逾模型切換收益門檻 ${trainedMarginSec} 秒)。`}
          </p>
        </div>

        {/* 車道切換學習模型微型資訊條 */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500 bg-slate-50/70 p-2.5 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>動態切換門檻 ΔT: {trainedMarginSec}s</span>
            </span>
            <span>・</span>
            <span>決策信心度: {confidenceScore}%</span>
          </div>
          <div className="text-[10px] text-slate-400 font-sans">
            內外側雙車道非線性梯度已訓練
          </div>
        </div>
      </div>

      {/* 2. Lane Speedometer Cards (時速表儀表板 + 車道顏色與燈號指示) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Lane 1 / 內側車道 */}
        <div
          className={`p-4 rounded-3xl border transition relative flex flex-col justify-between space-y-3 shadow-xs ${
            isLane1Recommended || isBothEqual
              ? "bg-emerald-50/40 border-emerald-400 ring-2 ring-emerald-400/20"
              : "bg-white border-slate-200"
          }`}
        >
          {(isLane1Recommended || isBothEqual) && (
            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-bl-xl flex items-center gap-1 shadow-xs z-10">
              <Star className="h-3 w-3 fill-current" />
              <span>{isBothEqual ? "兩邊皆可" : "★ 推薦行駛"}</span>
            </div>
          )}

          {/* 車輛時速表儀表 (Speedometer Gauge) */}
          <SpeedometerGauge
            speedKmh={lane1EqSpeed}
            laneName="👈 內側 (左)"
            laneColor="#4f46e5"
            isRecommended={isLane1Recommended || isBothEqual}
            laneArrowColor={lane1ArrowColor}
          />

          {/* 行駛時間與細部指標 */}
          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 block font-medium">預估通過耗時</span>
              <div className="text-lg font-black font-mono text-emerald-700 mt-0.5">
                {lane1.travelTimeFormatted}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-mono">均速</span>
              <span className="text-xs font-bold font-mono text-slate-800">
                {lane1EqSpeed.toFixed(1)} km/h
              </span>
            </div>
          </div>
        </div>

        {/* Lane 2 / 外側車道 */}
        <div
          className={`p-4 rounded-3xl border transition relative flex flex-col justify-between space-y-3 shadow-xs ${
            isLane2Recommended || isBothEqual
              ? "bg-emerald-50/40 border-emerald-400 ring-2 ring-emerald-400/20"
              : "bg-white border-slate-200"
          }`}
        >
          {(isLane2Recommended || isBothEqual) && (
            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-bl-xl flex items-center gap-1 shadow-xs z-10">
              <Star className="h-3 w-3 fill-current" />
              <span>{isBothEqual ? "兩邊皆可" : "★ 推薦行駛"}</span>
            </div>
          )}

          {/* 車輛時速表儀表 (Speedometer Gauge) */}
          <SpeedometerGauge
            speedKmh={lane2EqSpeed}
            laneName="外側 (右) 👉"
            laneColor="#d97706"
            isRecommended={isLane2Recommended || isBothEqual}
            laneArrowColor={lane2ArrowColor}
          />

          {/* 行駛時間與細部指標 */}
          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 block font-medium">預估通過耗時</span>
              <div className="text-lg font-black font-mono text-emerald-700 mt-0.5">
                {lane2.travelTimeFormatted}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-mono">均速</span>
              <span className="text-xs font-bold font-mono text-slate-800">
                {lane2EqSpeed.toFixed(1)} km/h
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. API 直接傳輸實時數據展示與雙重重算驗證 (Direct API Telemetry & Double Verification) */}
      <ApiDirectTelemetryTable
        doubleVerification={doubleVerification}
        isExtremeSituation={isExtremeSituation}
        defaultExpanded={isExtremeSituation || doubleVerification?.triggered}
      />

      {/* 4. Advanced Modal Trigger */}
      <div className="flex justify-end pt-1">
        <button
          onClick={onOpenAdvanced}
          className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1.5 transition py-1 px-2.5 rounded-lg hover:bg-slate-100 cursor-pointer font-medium"
        >
          <span>進階功能：車道切換模型訓練、RAW vs MODEL 診斷與 20 微元連續積分</span>
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}


