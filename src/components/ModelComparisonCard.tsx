import React from "react";
import { Scale, Clock, ShieldCheck, CheckCircle2, Layers } from "lucide-react";
import { FinalEstimatorOutput } from "../types";

interface ModelComparisonCardProps {
  estimatorOutput: FinalEstimatorOutput;
}

export default function ModelComparisonCard({ estimatorOutput }: ModelComparisonCardProps) {
  const estState = estimatorOutput.estimated_state;
  const segments = estState.segments;
  const lane1 = estState.laneComparison.lane1;
  const lane2 = estState.laneComparison.lane2;

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Scale className="h-4 w-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white">
              20 個空間微元連續積分與四種速度嚴格對照
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            由全線 {estState.modelSliceCount} 個空間微元 (總長度 {estState.totalDistanceKm.toFixed(3)} km) 進行積分：T_total = ∑ [Δx_i / v_i(t_i)]
          </p>
        </div>

        <div className="bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 flex items-center gap-3 shrink-0">
          <div className="text-right font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold">
              全線等效旅行速度
            </div>
            <div className="text-base font-extrabold text-emerald-400">
              {estState.equivalentTravelSpeedKmh.toFixed(2)} km/h
            </div>
          </div>
        </div>
      </div>

      {/* Speed Metrics Direct Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl border bg-slate-950 border-slate-800">
          <div className="text-xs text-slate-400 mb-1 font-semibold">1. 偵測點算術平均 (Spot Mean)</div>
          <div className="text-2xl font-extrabold text-slate-200 font-mono">
            {estState.detectorArithmeticMeanSpeedKmh.toFixed(2)} <span className="text-xs font-normal text-slate-500">km/h</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">全線 VD 站點即時點速度算術平均</p>
        </div>

        <div className="p-4 rounded-xl border bg-slate-950 border-slate-800">
          <div className="text-xs text-slate-400 mb-1 font-semibold">2. 空間調和平均 (Space Mean)</div>
          <div className="text-2xl font-extrabold text-amber-300 font-mono">
            {estState.spaceMeanSpeedKmh.toFixed(2)} <span className="text-xs font-normal text-slate-500">km/h</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">空間調和平均流速 (SMS)</p>
        </div>

        <div className="p-4 rounded-xl border bg-slate-950 border-slate-800">
          <div className="text-xs text-slate-400 mb-1 font-semibold">3. 等效旅行速度 (Equivalent)</div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {estState.equivalentTravelSpeedKmh.toFixed(2)} <span className="text-xs font-normal text-slate-500">km/h</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">公式：v_eq = L / (T / 3600)</p>
        </div>

        <div className="p-4 rounded-xl border bg-slate-950 border-slate-800">
          <div className="text-xs text-slate-400 mb-1 font-semibold">4. 動態旅行時間 (Travel Time)</div>
          <div className="text-2xl font-extrabold text-sky-400 font-mono">
            {estState.travelTimeFormatted}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">積分總秒數: {Math.round(estState.travelTimeSec)} 秒</p>
        </div>
      </div>

      {/* Segment Slices Table */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            20 個空間微元切片 (Δx_i, v_i, Δt_i) 連續積分數據表
          </h4>
          <span className="text-[11px] font-mono text-slate-400">
            微元總長度: {segments.reduce((a, b) => a + b.lengthKm, 0).toFixed(3)} km (13.097 km)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-sans">
                <th className="pb-2.5 font-semibold">微元序號</th>
                <th className="pb-2.5 font-semibold">起點里程</th>
                <th className="pb-2.5 font-semibold">終點里程</th>
                <th className="pb-2.5 font-semibold">微元長度 Δx</th>
                <th className="pb-2.5 font-semibold text-emerald-400">微元流速 v_i</th>
                <th className="pb-2.5 font-semibold text-sky-400">微元耗時 Δt_i</th>
                <th className="pb-2.5 font-semibold text-right">累計抵達時間 t_i</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300 font-mono">
              {segments.map((seg) => (
                <tr key={seg.segmentIndex} className="hover:bg-slate-800/20">
                  <td className="py-2 text-slate-400 font-sans">微元 #{seg.segmentIndex}</td>
                  <td className="py-2 text-slate-300">{seg.startMileageKm.toFixed(3)}K</td>
                  <td className="py-2 text-slate-300">{seg.endMileageKm.toFixed(3)}K</td>
                  <td className="py-2 text-slate-300">{seg.lengthKm.toFixed(4)} km</td>
                  <td className="py-2 text-emerald-400 font-bold">{seg.estimatedSegmentSpeedKmh.toFixed(2)} km/h</td>
                  <td className="py-2 text-sky-400 font-bold">{seg.segmentTravelTimeSec.toFixed(1)} 秒</td>
                  <td className="py-2 text-right text-slate-300">{Math.round(seg.cumulativeArrivalSec)} 秒</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
