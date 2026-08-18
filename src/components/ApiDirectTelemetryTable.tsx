import React, { useState } from "react";
import { DoubleVerificationState, ApiDirectVdTelemetry } from "../types";
import {
  Radio,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Activity,
  Layers,
  ArrowRight,
  Database,
  Search,
  SlidersHorizontal,
} from "lucide-react";

interface ApiDirectTelemetryTableProps {
  doubleVerification?: DoubleVerificationState;
  isExtremeSituation?: boolean;
  className?: string;
  defaultExpanded?: boolean;
}

export default function ApiDirectTelemetryTable({
  doubleVerification,
  isExtremeSituation,
  className = "",
  defaultExpanded = true,
}: ApiDirectTelemetryTableProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [filterQuery, setFilterQuery] = useState("");

  if (!doubleVerification || !doubleVerification.directApiDisplay) {
    return null;
  }

  const {
    triggered,
    triggerThresholdKmh,
    initialLaneDiffKmh,
    recalculatedLaneDiffKmh,
    recalculatedThresholdKmh,
    statusText,
    extremeExplanation,
    verificationMethod,
    directApiDisplay,
  } = doubleVerification;

  const filteredVd = directApiDisplay.vdReadings.filter(
    (vd) =>
      vd.detectorId.toLowerCase().includes(filterQuery.toLowerCase()) ||
      vd.mileageKm.toFixed(1).includes(filterQuery)
  );

  return (
    <div
      id="api-direct-telemetry-container"
      className={`rounded-3xl border transition overflow-hidden shadow-xs ${
        isExtremeSituation
          ? "bg-rose-950/10 border-rose-400/80 ring-2 ring-rose-500/20"
          : triggered
          ? "bg-amber-950/10 border-amber-400/80"
          : "bg-white border-slate-200"
      } ${className}`}
    >
      {/* 頂部狀態列 */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/70">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white font-mono">
              <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
              <span>API 傳輸數據直接展示</span>
            </span>

            {isExtremeSituation ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white shadow-xs animate-bounce">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>極端情況確認 (速差仍 &gt; 20 km/h)</span>
              </span>
            ) : triggered ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-600 text-white">
                <Activity className="h-3.5 w-3.5" />
                <span>二次驗證完成 (重算收斂 ≤ 20 km/h)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>雙車道流速常態 (速差 ≤ 23 km/h)</span>
              </span>
            )}

            <span className="text-[11px] text-slate-500 font-mono">
              接收時間: {new Date(directApiDisplay.receivedTimestamp).toLocaleTimeString("zh-TW", { hour12: false })}
            </span>
          </div>

          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            交通部 TDX 原始車輛偵測器 (VD) 實時遙測數據與雙重重算驗證
          </h3>
        </div>

        <button
          id="btn-toggle-telemetry-table"
          onClick={() => setIsExpanded(!isExpanded)}
          className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-medium text-slate-700 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
          <span>{isExpanded ? "收合 API 數據清單" : "展開 API 數據清單"}</span>
        </button>
      </div>

      {/* 雙重重算驗證決策說明卡 */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 初算兩車道速差 */}
          <div className="p-3 rounded-2xl bg-slate-100/80 border border-slate-200 space-y-1">
            <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
              <span>初算兩車道速差 (Initial Δv)</span>
              <span className="font-mono text-[10px] text-slate-400">門檻: 23 km/h</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-xl font-black font-mono ${
                  initialLaneDiffKmh > triggerThresholdKmh ? "text-amber-600" : "text-slate-800"
                }`}
              >
                {initialLaneDiffKmh.toFixed(1)} <span className="text-xs font-normal">km/h</span>
              </span>
              <span className="text-[11px] text-slate-500">
                {initialLaneDiffKmh > triggerThresholdKmh
                  ? "⚡ 超過 23 km/h (觸發二次重算)"
                  : "✓ 低於 23 km/h (常態)"}
              </span>
            </div>
          </div>

          {/* 重算後兩車道速差 */}
          <div className="p-3 rounded-2xl bg-slate-100/80 border border-slate-200 space-y-1">
            <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
              <span>二次重算後速差 (Recalculated Δv)</span>
              <span className="font-mono text-[10px] text-slate-400">極端門檻: 20 km/h</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-xl font-black font-mono ${
                  recalculatedLaneDiffKmh > recalculatedThresholdKmh ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {recalculatedLaneDiffKmh.toFixed(1)} <span className="text-xs font-normal">km/h</span>
              </span>
              <span className="text-[11px] text-slate-500">
                {recalculatedLaneDiffKmh > recalculatedThresholdKmh
                  ? "🚨 仍 > 20 km/h (判定為極端情況)"
                  : "✓ 收斂 ≤ 20 km/h (非極端)"}
              </span>
            </div>
          </div>

          {/* 總站點平均 API 數據 */}
          <div className="p-3 rounded-2xl bg-slate-100/80 border border-slate-200 space-y-1">
            <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
              <span>API 實時全線站點均值</span>
              <span className="font-mono text-[10px] text-slate-400">{directApiDisplay.totalVdStations} 站</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-0.5">
              <div>
                <span className="text-slate-400 block text-[10px]">Lane 1 實傳均速</span>
                <span className="font-bold text-indigo-700">{directApiDisplay.lane1AvgApiSpeedKmh} km/h</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Lane 2 實傳均速</span>
                <span className="font-bold text-amber-700">{directApiDisplay.lane2AvgApiSpeedKmh} km/h</span>
              </div>
            </div>
          </div>
        </div>

        {/* 驗證演算法與判定說明 */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Cpu className="h-4 w-4 text-emerald-600" />
            <span>雙重重算驗證機制決策邏輯：</span>
          </div>
          <p className="text-slate-600 leading-relaxed">{statusText}</p>
          {extremeExplanation && (
            <p className="text-rose-700 font-medium bg-rose-50 p-2 rounded-xl border border-rose-200/60 leading-relaxed">
              {extremeExplanation}
            </p>
          )}
          <div className="text-[11px] text-slate-400 font-mono pt-1">
            重算方法：{verificationMethod}
          </div>
        </div>

        {/* 3. API 直接傳輸明細數據表格 (Direct API Readings Table) */}
        {isExpanded && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-800">
                  全線 VD 各站實傳遙測數據表 ({filteredVd.length} / {directApiDisplay.totalVdStations} 站點)
                </span>
              </div>

              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜尋站點編號 / 里程..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 w-full sm:w-48"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100/90 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">VD 站點編號</th>
                    <th className="py-2.5 px-3">隧道里程</th>
                    <th className="py-2.5 px-3 text-indigo-700">車道 1 實傳速度</th>
                    <th className="py-2.5 px-3 text-amber-700">車道 2 實傳速度</th>
                    <th className="py-2.5 px-3 text-rose-700">速差 Δv</th>
                    <th className="py-2.5 px-3">L1/L2 流量 (輛/時)</th>
                    <th className="py-2.5 px-3">L1/L2 佔有率</th>
                    <th className="py-2.5 px-3 text-center">遙測狀態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredVd.map((vd) => {
                    const isExtremeSpot = vd.speedDeltaKmh > 20.0;
                    return (
                      <tr
                        key={vd.detectorId}
                        className={`hover:bg-slate-50 transition ${
                          isExtremeSpot ? "bg-rose-50/60 font-semibold" : ""
                        }`}
                      >
                        <td className="py-2 px-3 text-slate-900 font-bold">{vd.detectorId}</td>
                        <td className="py-2 px-3 text-slate-600">{vd.mileageKm.toFixed(3)} K</td>
                        <td className="py-2 px-3 text-indigo-700 font-bold">
                          {vd.lane1SpeedKmh.toFixed(1)} km/h
                        </td>
                        <td className="py-2 px-3 text-amber-700 font-bold">
                          {vd.lane2SpeedKmh.toFixed(1)} km/h
                        </td>
                        <td
                          className={`py-2 px-3 font-bold ${
                            isExtremeSpot
                              ? "text-rose-600 bg-rose-100/80 px-2 py-0.5 rounded-sm"
                              : vd.speedDeltaKmh > 10
                              ? "text-amber-600"
                              : "text-slate-500"
                          }`}
                        >
                          {vd.speedDeltaKmh.toFixed(1)} km/h
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {vd.lane1FlowVehPerHour} / {vd.lane2FlowVehPerHour}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {vd.lane1OccupancyPercent.toFixed(1)}% / {vd.lane2OccupancyPercent.toFixed(1)}%
                        </td>
                        <td className="py-2 px-3 text-center">
                          {isExtremeSpot ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-sans font-bold">
                              極端分流
                            </span>
                          ) : vd.speedDeltaKmh > 10 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-sans">
                              速度差異
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-sans">
                              正常
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
