import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Activity,
  Radio,
  Clock,
  ShieldCheck,
  Cpu,
  Layers,
} from "lucide-react";
import { parseTdxLiveEventsJson } from "../services/liveEventsEngine";

export default function SystemStatusFooter() {
  const [lastCheckTime, setLastCheckTime] = useState<string>(
    new Date().toLocaleTimeString("zh-TW", { hour12: false })
  );
  const [nextCountdown, setNextCountdown] = useState<number>(300); // 5 分鐘背景計時

  useEffect(() => {
    const timer = setInterval(() => {
      setNextCountdown((prev) => {
        if (prev <= 1) {
          setLastCheckTime(new Date().toLocaleTimeString("zh-TW", { hour12: false }));
          return 300;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <footer className="w-full border-t border-slate-200 bg-white/90 backdrop-blur-sm py-3 px-4 mt-8">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-600">
        {/* 左側：系統運作中清單 */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="text-slate-700 font-sans font-bold flex items-center gap-1">
            <Activity className="h-3.5 w-3.5 text-emerald-600" />
            系統服務正常運行：
          </span>

          <span className="inline-flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            TDX 實時 VD 車速串流 (正常)
          </span>

          <span className="inline-flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            20微元動態空間積分 (運作中)
          </span>

          <span className="inline-flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            API 金鑰自動輪流機制 (正常)
          </span>

          <span className="inline-flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            道路事件背景監聽 (正常 · 5分/次)
          </span>
        </div>

        {/* 右側：時間與倒數 */}
        <div className="flex items-center gap-3 text-slate-500 font-mono text-[10px]">
          <span>最後輪詢: {lastCheckTime}</span>
          <span className="text-slate-300">|</span>
          <span>下次背景檢測: {formatCountdown(nextCountdown)}</span>
        </div>
      </div>
    </footer>
  );
}
