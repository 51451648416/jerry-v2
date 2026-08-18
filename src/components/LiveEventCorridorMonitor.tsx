import React, { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  Bell,
  ShieldAlert,
  Clock,
  MapPin,
  CheckCircle,
  RefreshCw,
  Info,
  Radio,
  FileText,
  Volume2,
  X,
  ExternalLink,
} from "lucide-react";
import {
  TdxLiveEventsRootPayload,
  LiveEventAlgorithmResult,
  parseTdxLiveEventsJson,
  GERMAN_TRAFFIC_EXAMPLE_PAYLOAD,
} from "../services/liveEventsEngine";
import { fetchDirectFreewayLiveEvents } from "../services/tdxDirectClient";

interface LiveEventCorridorMonitorProps {
  onEventDetected?: (result: LiveEventAlgorithmResult) => void;
}

export default function LiveEventCorridorMonitor({
  onEventDetected,
}: LiveEventCorridorMonitorProps) {
  const [eventResult, setEventResult] = useState<LiveEventAlgorithmResult | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [nextCheckSeconds, setNextCheckSeconds] = useState<number>(300); // 5 minutes countdown
  const [activeTab, setActiveTab] = useState<"corridor" | "german_demo" | "json">("corridor");
  const [dismissedMessages, setDismissedMessages] = useState<Set<number>>(new Set());

  // Background 5-minute polling loop
  useEffect(() => {
    // Initial fetch
    fetchLiveEvents();

    // 1-second interval for countdown & 5-minute trigger
    const interval = setInterval(() => {
      setNextCheckSeconds((prev) => {
        if (prev <= 1) {
          fetchLiveEvents();
          return 300; // Reset to 5 minutes
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchLiveEvents = async () => {
    setIsChecking(true);
    try {
      const parsed = await fetchDirectFreewayLiveEvents();
      setEventResult(parsed);
      if (onEventDetected) onEventDetected(parsed);
    } catch (e: any) {
      console.warn("Background TDX Live Events check completed with safe fallback:", e?.message || e);
      const emptyResult = parseTdxLiveEventsJson({ LiveEvents: [] });
      setEventResult(emptyResult);
    } finally {
      setIsChecking(false);
      setLastCheckTime(new Date().toLocaleTimeString("zh-TW", { hour12: false }));
    }
  };

  const loadGermanExample = () => {
    const parsed = parseTdxLiveEventsJson(GERMAN_TRAFFIC_EXAMPLE_PAYLOAD);
    setEventResult(parsed);
    setActiveTab("german_demo");
    if (onEventDetected) onEventDetected(parsed);
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const hasCorridorAlerts = eventResult && eventResult.corridorEventsCount > 0;

  return (
    <div className="space-y-4">
      {/* 1. Real-time Message Alert Banner (When 14~29 KM has events) */}
      {hasCorridorAlerts && (
        <div className="bg-amber-950/60 border-2 border-amber-500/60 p-4 sm:p-5 rounded-2xl shadow-xl space-y-3 animate-pulse-slow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black">
                <Volume2 className="h-5 w-5" />
              </span>
              <div>
                <h4 className="text-sm sm:text-base font-black text-amber-200 flex items-center gap-2">
                  <span>國道5號 14KM ~ 29KM 走廊即時事件通報 (Real-Time Message Alert)</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono">
                    {eventResult.corridorEventsCount} 則事件
                  </span>
                </h4>
                <p className="text-xs text-amber-300/80">
                  背景監控系統每 5 分鐘自動巡檢，已將起始里程與國道參數代入核心運算模型
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-amber-400/90 bg-amber-950 px-2.5 py-1 rounded-lg border border-amber-800/60">
              {lastCheckTime ? `通報時間 ${lastCheckTime}` : "即時更新"}
            </span>
          </div>

          {/* Messages Stream */}
          <div className="space-y-2 pt-1">
            {eventResult.extractedEvents
              .filter((ev) => ev.isInHsuehshanCorridor14to29Km)
              .map((ev, idx) => {
                if (dismissedMessages.has(idx)) return null;
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/40 flex items-start justify-between gap-3 text-xs text-slate-200"
                  >
                    <div className="flex items-start gap-2">
                      <Radio className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold text-amber-300 text-xs sm:text-sm">
                          {ev.messageAlertFormatted}
                        </p>
                        <div className="flex flex-wrap gap-2 text-[11px] font-mono text-slate-400">
                          <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            路段: {ev.road}
                          </span>
                          <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            里程: {ev.startKm.toFixed(1)}K - {ev.endKm.toFixed(1)}K
                          </span>
                          <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            影響: {ev.severity}
                          </span>
                          <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-amber-300">
                            封閉: {ev.blockedLanes}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 2. Control & Background Status Card */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Bell className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                TDX 國道即時道路事件解析模組 (LiveEvents Background Monitor)
              </h3>
              <p className="text-xs text-slate-400">
                背景排程：每 5 分鐘自動執行一次，監控 14K 至 29K 關鍵走廊
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-indigo-400" />
              <span>下次輪詢：{formatCountdown(nextCheckSeconds)}</span>
            </div>
            <button
              onClick={fetchLiveEvents}
              disabled={isChecking}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${isChecking ? "animate-spin text-indigo-400" : ""}`} />
              手動刷新
            </button>
            <button
              onClick={loadGermanExample}
              className="px-3 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-semibold rounded-xl border border-indigo-500/40 flex items-center gap-1.5 transition cursor-pointer"
            >
              載入德文範例 (German Demo)
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 border-b border-slate-800/80 pb-2 text-xs">
          <button
            onClick={() => setActiveTab("corridor")}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeTab === "corridor"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            即時走廊狀態 (14K ~ 29K)
          </button>
          <button
            onClick={() => setActiveTab("german_demo")}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeTab === "german_demo"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            德文交通範例 (Autobahn Ereignis)
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeTab === "json"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            演算法輸入 JSON 結構 (Algorithm Feed JSON)
          </button>
        </div>

        {/* Content Views */}
        {activeTab === "corridor" && (
          <div className="space-y-3 text-xs">
            {eventResult && eventResult.totalEventsFound > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span>
                    解析完成：共擷取 <strong className="text-white">{eventResult.totalEventsFound}</strong> 筆事件，其中{" "}
                    <strong className="text-amber-400">{eventResult.corridorEventsCount}</strong> 筆位於 14K~29K 走廊
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    上次執行：{lastCheckTime || "無"}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {eventResult.extractedEvents.map((ev, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border font-mono space-y-1.5 ${
                        ev.isInHsuehshanCorridor14to29Km
                          ? "bg-slate-950 border-amber-500/30 text-slate-200"
                          : "bg-slate-950/60 border-slate-800 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between font-sans">
                        <span className="font-bold flex items-center gap-1.5">
                          <MapPin
                            className={`h-3.5 w-3.5 ${
                              ev.isInHsuehshanCorridor14to29Km ? "text-amber-400" : "text-slate-500"
                            }`}
                          />
                          {ev.road} ({ev.direction === "S" ? "南向" : "北向"}) {ev.startKm}K ~ {ev.endKm}K
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                            ev.isInHsuehshanCorridor14to29Km
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {ev.isInHsuehshanCorridor14to29Km ? "🚨 位於 14~29KM 監控區間" : "區間外"}
                        </span>
                      </div>
                      <p className="font-sans text-xs text-slate-300 leading-relaxed">{ev.description}</p>
                      <div className="text-[11px] text-slate-400 flex flex-wrap gap-3 pt-1 border-t border-slate-800/80">
                        <span>影響等級: {ev.severity}</span>
                        <span>車道封閉: {ev.blockedLanes}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1 text-slate-400">
                <CheckCircle className="h-5 w-5 text-emerald-400 mx-auto" />
                <p className="font-semibold text-slate-200">
                  目前 LiveEvents 無異常事件 (14K ~ 29K 走廊暢通)
                </p>
                <p className="text-[11px] text-slate-500">
                  若 LiveEvents 為空陣列，依規範直接回傳無事件狀態並維持核心演算法運作。
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "german_demo" && (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-1 text-indigo-200">
              <div className="font-bold flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-indigo-400" />
                德國交通事件範例 (German Traffic Autobahn A8 / A99 Event)
              </div>
              <p className="text-[11px] text-indigo-300/80 leading-relaxed">
                示範將德文 Störungsmeldung JSON 載入，並透過嚴格路徑提取 StartKM (18.5K、24.8K) 與 Road 參數送入演算法微元定位。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {GERMAN_TRAFFIC_EXAMPLE_PAYLOAD.LiveEvents?.map((ev, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-[11px] font-mono text-indigo-300">
                    <span>Event #{ev.EventID}</span>
                    <span className="bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                      KM {ev.Location?.FreeExpressHighway?.StartKM} ~ {ev.Location?.FreeExpressHighway?.EndKM}
                    </span>
                  </div>
                  <div className="text-xs text-slate-200 font-semibold">{ev.Description}</div>
                  <div className="text-[11px] text-slate-400 space-y-0.5">
                    <div>
                      Road: <span className="text-slate-300">{ev.Location?.FreeExpressHighway?.Road}</span>
                    </div>
                    <div>
                      Severity: <span className="text-amber-300">{ev.Impact?.Severity}</span>
                    </div>
                    <div>
                      BlockedLanes: <span className="text-rose-300">{ev.Impact?.BlockedLanes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "json" && (
          <div className="space-y-2">
            <div className="text-[11px] text-slate-400">
              演算法代入變數結構 (Algorithm Feed Inputs - StartKM & Road):
            </div>
            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-60">
              {JSON.stringify(eventResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
