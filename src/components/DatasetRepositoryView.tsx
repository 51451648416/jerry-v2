import React, { useState, useEffect } from "react";
import {
  Database,
  Download,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  FileCode,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Cpu,
  Lock,
  Unlock,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { CapturedDatasetRecord } from "../types";
import {
  getStoredDataset,
  exportDatasetToJson,
  exportDatasetToCsv,
  resetDataset,
  clearAllDataset,
  deleteDatasetRecord,
} from "../services/datasetRepository";
import { isAdminAuthenticated } from "../services/adminAuth";
import ModelTrainingMonitor from "./ModelTrainingMonitor";

interface DatasetRepositoryViewProps {
  onRefresh?: () => void;
  onRequireAuthPrompt?: (title: string, desc: string, callback: () => void) => void;
}

export default function DatasetRepositoryView({
  onRefresh,
  onRequireAuthPrompt,
}: DatasetRepositoryViewProps) {
  const [dataset, setDataset] = useState<CapturedDatasetRecord[]>([]);
  const [filterDirection, setFilterDirection] = useState<"ALL" | "S" | "N">("ALL");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    setDataset(getStoredDataset());
  }, []);

  const handleReload = () => {
    setDataset(getStoredDataset());
    if (onRefresh) onRefresh();
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // 重設為種子庫 (需要後台權限)
  const handleReset = () => {
    const doReset = () => {
      const reset = resetDataset();
      setDataset(reset);
      showToast("✓ 資料庫已重設為初始種子歷史基準！");
      if (onRefresh) onRefresh();
    };

    if (isAdminAuthenticated()) {
      if (window.confirm("確定要重設資料集庫為預設種子資料嗎？")) {
        doReset();
      }
    } else if (onRequireAuthPrompt) {
      onRequireAuthPrompt(
        "重設資料集庫為種子預設",
        "重設資料庫屬於後台管理變更動作，請輸入後台密碼以取得執行授權。",
        doReset
      );
    } else {
      alert("此動作需要管理員權限，請先由後台解鎖！");
    }
  };

  // 徹底清空資料庫 (需要後台權限)
  const handleClearAll = () => {
    const doClear = () => {
      const empty = clearAllDataset();
      setDataset(empty);
      showToast("✓ 資料庫所有歷史紀錄已徹底清空！");
      if (onRefresh) onRefresh();
    };

    if (isAdminAuthenticated()) {
      if (window.confirm("確定要徹底清空全部資料庫紀錄嗎？此動作無法復原。")) {
        doClear();
      }
    } else if (onRequireAuthPrompt) {
      onRequireAuthPrompt(
        "徹底清空資料庫",
        "清空全部資料集屬於後台管理動作，請輸入後台密碼以取得執行授權。",
        doClear
      );
    } else {
      alert("此動作需要管理員權限，請先由後台解鎖！");
    }
  };

  // 刪除單筆紀錄 (需要後台權限)
  const handleDeleteRow = (id: string) => {
    const doDelete = () => {
      const updated = deleteDatasetRecord(id);
      setDataset(updated);
      showToast(`✓ 已成功刪除紀錄 ${id}`);
      if (onRefresh) onRefresh();
    };

    if (isAdminAuthenticated()) {
      doDelete();
    } else if (onRequireAuthPrompt) {
      onRequireAuthPrompt(
        "刪除單筆資料紀錄",
        `刪除資料紀錄 (${id}) 屬於後台管理動作，請輸入後台密碼以取得執行授權。`,
        doDelete
      );
    } else {
      alert("此動作需要管理員權限，請先由後台解鎖！");
    }
  };

  const filtered = dataset.filter((r) => {
    if (filterDirection === "ALL") return true;
    return r.direction === filterDirection;
  });

  // 統計數據
  const totalSamples = dataset.length;
  const avgEqSpeed =
    totalSamples > 0
      ? (dataset.reduce((acc, r) => acc + r.tunnelEqSpeedKmh, 0) / totalSamples).toFixed(1)
      : "0.0";
  const avgL1 =
    totalSamples > 0
      ? (dataset.reduce((acc, r) => acc + r.tunnelLane1SpeedKmh, 0) / totalSamples).toFixed(1)
      : "0.0";
  const avgL2 =
    totalSamples > 0
      ? (dataset.reduce((acc, r) => acc + r.tunnelLane2SpeedKmh, 0) / totalSamples).toFixed(1)
      : "0.0";

  const isAuth = isAdminAuthenticated();

  return (
    <div className="space-y-6">
      {/* 頂部數據集庫概況卡片 */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-xl bg-emerald-600 text-white font-bold">
                <Database className="h-4 w-4" />
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>雪山隧道與國5即時偵測資料集庫 (Dataset Repository)</span>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                    isAuth
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {isAuth ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  <span>{isAuth ? "後台管理已解鎖" : "前台唯讀 (修改需密碼)"}</span>
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              每次點擊「即時路況分析」或定時抓取時，系統會自動將偵測站截圖與 20 空間微元積分結果寫入持久化資料集庫
            </p>
          </div>

          {/* 匯出與管理按鈕 */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportDatasetToCsv(dataset)}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>匯出 CSV</span>
            </button>
            <button
              onClick={() => exportDatasetToJson(dataset)}
              className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <FileCode className="h-3.5 w-3.5" />
              <span>匯出 JSON</span>
            </button>
            <button
              onClick={handleReload}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
              title="重新整理資料集"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
              title="重設為種子資料庫 (限後台執行)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>重設種子</span>
            </button>
            <button
              onClick={handleClearAll}
              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer"
              title="清空資料庫 (限後台執行)"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 提示訊息 */}
        {toastMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* 4 大統計指標 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[11px] text-slate-400 font-sans block">已收錄樣本總數</span>
            <div className="text-2xl font-black text-slate-800 mt-1">
              {totalSamples}{" "}
              <span className="text-xs font-normal text-slate-500">筆觀測</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-sans block mt-0.5">
              每次分析自動納入庫
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[11px] text-slate-400 font-sans block">歷史樣本等效均速</span>
            <div className="text-2xl font-black text-slate-800 mt-1">
              {avgEqSpeed}{" "}
              <span className="text-xs font-normal text-slate-500">km/h</span>
            </div>
            <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
              全線等效調和平均
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[11px] text-slate-400 font-sans block">內側車道 (Lane 1) 均速</span>
            <div className="text-2xl font-black text-slate-800 mt-1">
              {avgL1}{" "}
              <span className="text-xs font-normal text-slate-500">km/h</span>
            </div>
            <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
              歷史全樣本基準
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[11px] text-slate-400 font-sans block">外側車道 (Lane 2) 均速</span>
            <div className="text-2xl font-black text-slate-800 mt-1">
              {avgL2}{" "}
              <span className="text-xs font-normal text-slate-500">km/h</span>
            </div>
            <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
              歷史全樣本基準
            </span>
          </div>
        </div>
      </div>

      {/* 機器學習在線訓練與車道切換優化監控面板 */}
      <ModelTrainingMonitor
        onModelUpdated={handleReload}
        onRequireAuthPrompt={onRequireAuthPrompt}
      />

      {/* 資料集清單明細表格 */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>歷史偵測截圖紀錄清單</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
              顯示 {filtered.length} 筆
            </span>
          </h3>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setFilterDirection("ALL")}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                filterDirection === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilterDirection("S")}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                filterDirection === "S" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
              }`}
            >
              南向 (往宜蘭)
            </button>
            <button
              onClick={() => setFilterDirection("N")}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                filterDirection === "N" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
              }`}
            >
              北向 (往台北)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-slate-500 text-[11px] border-b border-slate-200 font-sans">
              <tr>
                <th className="py-3 px-4">時間戳記 / 節慶時段</th>
                <th className="py-3 px-4">方向 / 走廊區間</th>
                <th className="py-3 px-4">雪隧耗時 (分秒)</th>
                <th className="py-3 px-4">內側時速</th>
                <th className="py-3 px-4">外側時速</th>
                <th className="py-3 px-4">等效流速</th>
                <th className="py-3 px-4">國5全線 (0K-54K)</th>
                <th className="py-3 px-4">推薦車道</th>
                <th className="py-3 px-4">路況評級</th>
                <th className="py-3 px-4 text-right">後台刪除</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-bold text-slate-900">{item.timeFormatted}</div>
                    <div className="text-[10px] text-slate-400 font-sans mt-0.5 flex items-center gap-1">
                      <span>{item.dayOfWeek}</span>
                      <span>・</span>
                      <span className="text-emerald-600 font-medium">{item.holidayTag || "一般常態流"}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[10px] w-fit ${
                          item.direction === "S"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-sky-50 text-sky-700 border border-sky-200"
                        }`}
                      >
                        {item.direction === "S" ? "南向 (往宜蘭)" : "北向 (往台北)"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-sans">
                        {item.corridorRange || "0K-54K (南港-蘇澳)"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-black text-emerald-700 whitespace-nowrap">
                    {item.tunnelTravelTimeFormatted}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">{item.tunnelLane1SpeedKmh} km/h</td>
                  <td className="py-3 px-4 whitespace-nowrap">{item.tunnelLane2SpeedKmh} km/h</td>
                  <td className="py-3 px-4 font-bold whitespace-nowrap">{item.tunnelEqSpeedKmh} km/h</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-bold text-slate-800">
                      {item.corridor0to54TravelTimeMin || item.corridor0to50TravelTimeMin} 分鐘
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans">
                      均速 {item.corridorAvgSpeedKmh} km/h
                    </div>
                  </td>
                  <td className="py-3 px-4 font-sans font-bold text-slate-800 whitespace-nowrap">
                    {item.recommendedLane}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                      {item.congestionLevel}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleDeleteRow(item.id)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                      title="後台刪除此筆紀錄"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
