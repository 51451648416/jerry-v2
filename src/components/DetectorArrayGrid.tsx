import React from "react";
import { Gauge, Activity, AlertCircle, CheckCircle2, ShieldCheck, HelpCircle } from "lucide-react";
import { DataQualityReport, RawApiDetectorRecord } from "../types";
import { getSpeedLevel } from "../utils/speedRules";

interface DetectorArrayGridProps {
  records: RawApiDetectorRecord[];
  qualityReports: DataQualityReport[];
  direction: "S" | "N";
}

export default function DetectorArrayGrid({
  records,
  qualityReports,
  direction,
}: DetectorArrayGridProps) {
  if (!records || records.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-400">
        無可用之車輛偵測器 (VD) 節點資料
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Activity className="h-4 w-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white">
              全線 {records.length} 處實時車輛偵測器 (VD) 空間觀測矩陣
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            國道5號雪山隧道 {direction === "S" ? "南向 (15.2K → 28.1K 往宜蘭)" : "北向 (28.1K → 15.2K 往台北)"} 空間連續微元節點觀測與品質報告
          </p>
        </div>

        <span className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300">
          監測節點數: <span className="text-emerald-400 font-bold">{records.length}</span> 站
        </span>
      </div>

      {/* Grid of 11 detectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {records.map((rec, idx) => {
          const report = qualityReports.find((r) => r.detectorId === rec.detectorId);
          const l1 = rec.lanes[0] || { speedKmh: 80, flowVehPerHour: 1000, occupancyPercent: 10 };
          const l2 = rec.lanes[1] || { speedKmh: 80, flowVehPerHour: 1000, occupancyPercent: 10 };

          const avgSpeed = (l1.speedKmh + l2.speedKmh) / 2;
          const speedLevel = getSpeedLevel(avgSpeed);

          const isSuspicious = report?.isSuspicious;
          const isValid = report ? report.isValid : true;

          return (
            <div
              key={rec.detectorId}
              className={`p-3.5 rounded-xl border flex flex-col justify-between transition relative ${
                !isValid
                  ? "bg-rose-950/20 border-rose-800/40"
                  : isSuspicious
                  ? "bg-amber-950/20 border-amber-800/40"
                  : "bg-slate-950 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div>
                {/* Node Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold font-mono text-emerald-400">
                    {rec.mileageKm.toFixed(1)}K
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                      !isValid
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                        : isSuspicious
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        : "bg-slate-800 text-slate-300 border-slate-700"
                    }`}
                  >
                    {!isValid ? "異常" : isSuspicious ? "可疑" : "正常"}
                  </span>
                </div>

                <div className="text-[11px] font-semibold text-slate-200 line-clamp-1 mb-2">
                  {rec.detectorId}
                </div>

                {/* Lane Speeds Bar */}
                <div className="space-y-1.5 font-mono text-xs mb-3">
                  <div className="flex items-center justify-between bg-slate-900/90 px-2 py-1 rounded border border-slate-800/80">
                    <span className="text-[10px] text-slate-400">車道 1 (內):</span>
                    <span className={`font-bold ${getSpeedLevel(l1.speedKmh).colorText}`}>
                      {l1.speedKmh} <span className="text-[9px] font-normal text-slate-500">km/h</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/90 px-2 py-1 rounded border border-slate-800/80">
                    <span className="text-[10px] text-slate-400">車道 2 (外):</span>
                    <span className={`font-bold ${getSpeedLevel(l2.speedKmh).colorText}`}>
                      {l2.speedKmh} <span className="text-[9px] font-normal text-slate-500">km/h</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Statistical Noise & Confidence Footer */}
              <div className="pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>總流量:</span>
                  <span className="text-slate-200">{l1.flowVehPerHour + l2.flowVehPerHour} veh/hr</span>
                </div>
                <div className="flex justify-between">
                  <span>佔有率:</span>
                  <span className="text-slate-200">{Math.round((l1.occupancyPercent + l2.occupancyPercent) / 2)}%</span>
                </div>
                <div className="flex justify-between text-emerald-400/90">
                  <span>噪聲共變異 R:</span>
                  <span>{report ? report.adaptiveNoiseR : 6.25}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
