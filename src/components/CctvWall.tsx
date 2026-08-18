import React, { useState, useEffect } from "react";
import {
  Camera,
  ExternalLink,
  RefreshCw,
  Maximize2,
  X,
  AlertCircle,
  Video,
  ShieldCheck,
  Play,
  Pause,
  Zap,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CctvCamera, Direction } from "../types";
import { CCTV_CAMERAS } from "../data/cctvData";

interface CctvWallProps {
  currentDirection: Direction;
}

export default function CctvWall({ currentDirection }: CctvWallProps) {
  const [selectedDirection, setSelectedDirection] = useState<Direction | "ALL">(currentDirection);
  const [errorMap, setErrorMap] = useState<Record<string, boolean>>({});
  const [snapshotTimestamp, setSnapshotTimestamp] = useState<number>(Date.now()); // 每分鐘省電更新
  const [fullscreenCam, setFullscreenCam] = useState<CctvCamera | null>(null);

  // 攝影機播放狀態管理 (每台獨立 30s 播放計時，預設不自動啟動影片以節能)
  const [activePlaybackMap, setActivePlaybackMap] = useState<Record<string, number>>({}); // camId -> remainingSeconds

  // 每分鐘自動更新所有攝影機的靜態截圖封面 (大幅降低行動裝置耗電量與傳輸量)
  useEffect(() => {
    const interval = setInterval(() => {
      setSnapshotTimestamp(Date.now());
    }, 60000); // 60s
    return () => clearInterval(interval);
  }, []);

  // 30 秒自動倒數播放計時器 (30 秒後停止播放回復靜態封面以省電，使用者可再點擊重播維持連續監看)
  useEffect(() => {
    const timer = setInterval(() => {
      setActivePlaybackMap((prev) => {
        const next: Record<string, number> = {};
        let changed = false;
        Object.entries(prev).forEach(([camId, sec]) => {
          const numSec = Number(sec);
          if (numSec > 1) {
            next[camId] = numSec - 1;
            changed = true;
          } else {
            // 倒數結束，自動關閉串流以省電
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const togglePlayCamera = (camId: string) => {
    setActivePlaybackMap((prev) => {
      if (prev[camId]) {
        const copy = { ...prev };
        delete copy[camId];
        return copy;
      } else {
        return { ...prev, [camId]: 30 }; // 啟動 30 秒播放
      }
    });
  };

  const extendPlayback = (camId: string) => {
    setActivePlaybackMap((prev) => ({
      ...prev,
      [camId]: 30, // 重置回 30 秒
    }));
  };

  const filteredCameras = CCTV_CAMERAS.filter((cam) => {
    if (selectedDirection === "ALL") return true;
    return cam.direction === selectedDirection;
  });

  const handleImageError = (camId: string) => {
    setErrorMap((prev) => ({ ...prev, [camId]: true }));
  };

  const handleImageLoad = (camId: string) => {
    setErrorMap((prev) => {
      const next = { ...prev };
      delete next[camId];
      return next;
    });
  };

  const handleRefreshAll = () => {
    setErrorMap({});
    setSnapshotTimestamp(Date.now());
  };

  return (
    <section className="space-y-4">
      {/* Top Controls Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Video className="h-4 w-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white">雪山隧道全線即時 CCTV 主動監控牆</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            採用低耗電智慧架構：預設每 1 分鐘更新靜態截圖；點擊可連續播放 30 秒即時影像，隨時點擊延續監看。
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap justify-between sm:justify-end">
          {/* Direction Filter Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedDirection("S")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                selectedDirection === "S"
                  ? "bg-emerald-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              南向 (往宜蘭)
            </button>
            <button
              onClick={() => setSelectedDirection("N")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                selectedDirection === "N"
                  ? "bg-emerald-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              北向 (往台北)
            </button>
            <button
              onClick={() => setSelectedDirection("ALL")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                selectedDirection === "ALL"
                  ? "bg-emerald-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              全部雙向
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefreshAll}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer transition"
            title="手動刷新所有攝影機最新畫面"
          >
            <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
            更新封面
          </button>
        </div>
      </div>

      {/* CCTV Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredCameras.map((cam) => {
          const isError = errorMap[cam.id];
          const remainingSec = activePlaybackMap[cam.id] || 0;
          const isPlaying = remainingSec > 0;

          // 若正在播放則載入即時串流，否則載入每分鐘更新一次的截圖封面
          const streamUrl = isPlaying
            ? `${cam.url}&_t=${Date.now()}`
            : `${cam.url}&_t=${snapshotTimestamp}`;

          return (
            <div
              key={cam.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm hover:border-slate-700 transition group"
            >
              {/* Card Header */}
              <div className="p-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      cam.direction === "S"
                        ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                        : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {cam.direction === "S" ? "南向 S" : "北向 N"}
                  </span>
                  <span className="text-xs font-bold text-white">{cam.title}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">{cam.code}</span>
              </div>

              {/* Video Player / Fallback Box */}
              <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                {!isError ? (
                  <img
                    src={streamUrl}
                    alt={cam.title}
                    referrerPolicy="no-referrer"
                    onError={() => handleImageError(cam.id)}
                    onLoad={() => handleImageLoad(cam.id)}
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-102"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center space-y-2.5">
                    <AlertCircle className="h-6 w-6 text-amber-400" />
                    <p className="text-xs text-slate-400">內嵌串流讀取受限</p>
                    <a
                      href={cam.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[11px] font-bold rounded-lg transition shadow-sm"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      開啟外部即時影像
                    </a>
                  </div>
                )}

                {/* 非播放狀態：顯示省電封面提示與中央播放按鈕 (Do not start with videos) */}
                {!isPlaying && !isError && (
                  <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center transition group-hover:bg-slate-950/20">
                    <button
                      onClick={() => togglePlayCamera(cam.id)}
                      className="p-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-full shadow-lg transition transform group-hover:scale-110 cursor-pointer flex items-center justify-center"
                      title="點擊播放 30 秒即時影像"
                    >
                      <Play className="h-5 w-5 fill-current ml-0.5" />
                    </button>
                    <span className="text-[10px] text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded-full mt-2 border border-slate-800">
                      省電封面 (每分鐘更新)
                    </span>
                  </div>
                )}

                {/* Top Overlay Badge */}
                <div className="absolute top-2 left-2 pointer-events-none">
                  {isPlaying ? (
                    <span className="px-1.5 py-0.5 rounded bg-slate-950/80 text-[10px] text-emerald-400 font-mono font-bold border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {remainingSec}s 播放中
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-slate-950/80 text-[10px] text-slate-400 font-mono font-bold border border-slate-800 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      主動監看
                    </span>
                  )}
                </div>

                {/* Action buttons on hover */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition">
                  {isPlaying && (
                    <button
                      onClick={() => extendPlayback(cam.id)}
                      className="p-1.5 bg-slate-950/80 hover:bg-slate-800 text-emerald-400 rounded-lg border border-slate-700 text-xs transition cursor-pointer"
                      title="延長 30 秒播放"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setFullscreenCam(cam)}
                    className="p-1.5 bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs transition cursor-pointer"
                    title="放大檢視"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                  <a
                    href={cam.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs transition inline-flex items-center justify-center"
                    title="新視窗開啟外部原串流"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-2.5 bg-slate-900 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate pr-2">{cam.locationName}</span>
                {isPlaying ? (
                  <button
                    onClick={() => extendPlayback(cam.id)}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 shrink-0 transition cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" /> 重播 (+30s)
                  </button>
                ) : (
                  <button
                    onClick={() => togglePlayCamera(cam.id)}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 shrink-0 transition cursor-pointer"
                  >
                    <Play className="h-3 w-3 fill-current" /> 點擊進入播放
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Preview Modal */}
      <AnimatePresence>
        {fullscreenCam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFullscreenCam(null)}
              className="fixed inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl z-10"
            >
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-bold text-white text-base">
                    {fullscreenCam.title} - {fullscreenCam.locationName}
                  </h3>
                </div>
                <button
                  onClick={() => setFullscreenCam(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="relative aspect-video w-full bg-black flex items-center justify-center">
                <img
                  src={`${fullscreenCam.url}&_t=${Date.now()}`}
                  alt={fullscreenCam.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="p-4 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>高公局交通控制即時攝影機 ({fullscreenCam.code})</span>
                </div>
                <a
                  href={fullscreenCam.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl flex items-center gap-2 transition"
                >
                  <ExternalLink className="h-4 w-4" />
                  直接在新分頁開啟高公局原串流
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

