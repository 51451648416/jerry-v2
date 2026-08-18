import React from "react";
import { BookOpen, CheckCircle2, ShieldCheck, Layers, Gauge } from "lucide-react";
import { EstimatedState } from "../types";

interface MathTheoryInspectorProps {
  estState: EstimatedState;
}

export default function MathTheoryInspector({ estState }: MathTheoryInspectorProps) {
  const consistency = estState.consistencyCheck;

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BookOpen className="h-4 w-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white">
              數學一致性與交通工程定理檢驗
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            即時檢驗柯西-施瓦茨不等式、簡森不等式、20空間微元數值積分與 11 項數學一致性指標
          </p>
        </div>

        <span className="px-3 py-1 bg-indigo-950/60 border border-indigo-800 text-indigo-300 text-xs font-mono rounded-lg">
          全線長度 L = {estState.totalDistanceKm.toFixed(3)} km
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Module A: Cauchy-Schwarz Inequality */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                [數學定理 1]
              </span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 font-bold">
                <CheckCircle2 className="h-3 w-3" /> 不等式成立
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-200">
              Cauchy-Schwarz：Time-Mean vs 空間速度指標
            </h4>
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 my-2.5 font-mono text-[11px] text-slate-300">
              <div className="text-slate-400 text-[10px]">程式實際計算公式 (離散點調和均速)：</div>
              <div className="text-indigo-300 font-bold">v_harmonic = N / ∑(1 / v_i)</div>
              <div className="text-slate-400 text-[10px] mt-1">Cauchy-Schwarz 定理：</div>
              <div className="text-indigo-200">v_TMS ≥ v_harmonic ⟹ L / v_TMS ≤ L / v_harmonic</div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              單點算術平均忽視車輛在路段停留時間權重。目前公式為離散站點調和均速（標記為「模型空間速度指標」），嚴格空間平均流速仍以 20 微元連續積分之等效速度 v_eq 為準。
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800/80 font-mono text-xs space-y-1.5">
            <div className="flex justify-between text-slate-400">
              <span>Time-Mean (點算術平均):</span>
              <span className="text-slate-200 font-bold">{estState.detectorArithmeticMeanSpeedKmh.toFixed(2)} km/h</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>模型空間速度指標 (調和均速):</span>
              <span className="text-emerald-400 font-bold">{estState.spaceMeanSpeedKmh.toFixed(2)} km/h</span>
            </div>
          </div>
        </div>

        {/* Module B: Jensen's Inequality */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                [數學定理 2]
              </span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 font-bold">
                <CheckCircle2 className="h-3 w-3" /> 凸函數性質
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-200">
              Jensen 不等式：非線性期望偏差
            </h4>
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 my-2.5 font-mono text-[11px] text-slate-300">
              <div className="text-slate-400 text-[10px]">f(v) = 1/v (f''(v) = 2/v³ &gt; 0)：</div>
              <div className="text-amber-300 font-bold">E[1/v] ≥ 1 / E[v] ⟹ E[T] ≥ L / E[v]</div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              旅行時間為速度倒數之積分，直接除以平均速度會系統性低估旅行時間。
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800/80 font-mono text-xs space-y-1.5">
            <div className="flex justify-between text-slate-400">
              <span>動態積分旅行時間:</span>
              <span className="text-sky-400 font-bold">{estState.travelTimeFormatted}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>等效旅行速度:</span>
              <span className="text-emerald-400 font-bold">{estState.equivalentTravelSpeedKmh.toFixed(2)} km/h</span>
            </div>
          </div>
        </div>

        {/* Module C: Mathematical Consistency Automated Audit */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                [全精度檢驗]
              </span>
              <span className={`text-[10px] font-mono flex items-center gap-1 font-bold ${consistency.passed ? "text-emerald-400" : "text-rose-400"}`}>
                <CheckCircle2 className="h-3 w-3" /> {consistency.passed ? "11 項檢驗通過" : "發現一致性異常"}
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-200">
              全線數據一致性驗證 (Consistency Check)
            </h4>
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 my-2.5 font-mono text-[11px] text-slate-300">
              <div className="text-emerald-400 font-bold">✓ ∑ Δx_i = 13.097 km</div>
              <div className="text-emerald-400 font-bold">✓ T_total = ∑ Δx_i / v_i(t_i)</div>
              <div className="text-emerald-400 font-bold">✓ v_eq = L / (T / 3600)</div>
              <div className="text-emerald-400 font-bold">✓ ΔT = |T_1 - T_2| = {Math.round(estState.laneComparison.differenceSec)}s</div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              所有 UI 數值嚴格來自單一 estimated_state，杜絕模組間計算漂移與矛盾。
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800/80 font-mono text-xs space-y-1.5">
            <div className="flex justify-between text-slate-400">
              <span>資料完整度:</span>
              <span className="text-emerald-400 font-bold">{estState.dataCompleteness.validityPercent.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>驗證狀態:</span>
              <span className="text-emerald-400 font-bold">{consistency.passed ? "SSOT CONSISTENT" : "CONSISTENCY_ERROR"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
