import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  X,
  Compass,
  MapPin,
  Clock,
  BookOpen,
  Video,
  ExternalLink,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Globe,
  CornerDownLeft,
} from "lucide-react";
import { ActiveTabType } from "./Header";
import { CCTV_CAMERAS } from "../data/cctvData";
import { CORRIDOR_INTERCHANGES, FREEWAY_5_CORRIDOR_SEGMENTS_SOUTH, FREEWAY_5_CORRIDOR_SEGMENTS_NORTH } from "../data/corridorConfig";

export interface SearchResultItem {
  id: string;
  category: "lane" | "corridor" | "cctv" | "departure" | "theory" | "google";
  title: string;
  subtitle: string;
  tag: string;
  tabTarget?: ActiveTabType;
  direction?: "S" | "N";
  actionPayload?: {
    cctvId?: string;
    mileage?: number;
    theorySection?: string;
    interchangeName?: string;
  };
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (result: SearchResultItem) => void;
  currentDirection: "S" | "N";
}

const POPULAR_KEYWORDS = [
  "雪隧南下",
  "坪林交流道",
  "頭城北上",
  "雪隧 19K CCTV",
  "最佳出發時間",
  "柯西不等式",
  "石碇 4K",
  "通風豎井",
  "避開塞車",
];

export default function GlobalSearchModal({
  isOpen,
  onClose,
  onSelectResult,
  currentDirection,
}: GlobalSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setSelectedIndex(0);
    } else {
      setSearchTerm("");
    }
  }, [isOpen]);

  // 全域快捷鍵 Esc 關閉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // 搜尋項目庫建構
  const allSearchableItems: SearchResultItem[] = useMemo(() => {
    const items: SearchResultItem[] = [];

    // 1. 雪隧車道與核心路段
    items.push({
      id: "lane-south-recom",
      category: "lane",
      title: "雪山隧道南向車道即時推薦 (往宜蘭)",
      subtitle: "坪林 15.3K → 頭城 28.2K 雙向 20 微元空間積分流速推估",
      tag: "雪隧車道",
      tabTarget: "lane",
      direction: "S",
    });
    items.push({
      id: "lane-north-recom",
      category: "lane",
      title: "雪山隧道北向車道即時推薦 (往台北)",
      subtitle: "頭城 28.2K → 坪林 15.3K 內/外側時速與最佳省時評估",
      tag: "雪隧車道",
      tabTarget: "lane",
      direction: "N",
    });
    items.push({
      id: "lane-shaft",
      category: "lane",
      title: "雪山隧道通風三號豎井群 (約 20K~23K)",
      subtitle: "排風抽引氣壓阻力衰減區段，微元氣動補償",
      tag: "物理特徵",
      tabTarget: "lane",
      actionPayload: { mileage: 21.0 },
    });
    items.push({
      id: "lane-cross-section",
      category: "lane",
      title: "雪山隧道即時橫斷面模型 (HUD)",
      subtitle: "隧道左管南下/右管北上即時車速、淨距與車道指示燈",
      tag: "視覺化",
      tabTarget: "lane",
    });

    // 2. 國5全線交流道
    CORRIDOR_INTERCHANGES.forEach((ic) => {
      items.push({
        id: `ic-${ic.mileageKm}`,
        category: "corridor",
        title: `${ic.name} (${ic.mileageKm.toFixed(1)}K)`,
        subtitle: ic.label,
        tag: "國5交流道",
        tabTarget: "corridor",
        actionPayload: { interchangeName: ic.name, mileage: ic.mileageKm },
      });
    });

    // 3. 走廊區段
    FREEWAY_5_CORRIDOR_SEGMENTS_SOUTH.forEach((seg) => {
      items.push({
        id: `seg-s-${seg.id}`,
        category: "corridor",
        title: `南下 ${seg.name} (${seg.fromKm}K~${seg.toKm}K)`,
        subtitle: `${seg.description}・速限 ${seg.speedLimitKmh} km/h`,
        tag: "走廊路段",
        tabTarget: "corridor",
        direction: "S",
        actionPayload: { mileage: seg.fromKm },
      });
    });

    FREEWAY_5_CORRIDOR_SEGMENTS_NORTH.forEach((seg) => {
      items.push({
        id: `seg-n-${seg.id}`,
        category: "corridor",
        title: `北上 ${seg.name} (${seg.toKm}K~${seg.fromKm}K)`,
        subtitle: `${seg.description}・速限 ${seg.speedLimitKmh} km/h`,
        tag: "走廊路段",
        tabTarget: "corridor",
        direction: "N",
        actionPayload: { mileage: seg.fromKm },
      });
    });

    // 4. 即時 CCTV 攝影機
    CCTV_CAMERAS.forEach((cam) => {
      items.push({
        id: `cctv-${cam.id}`,
        category: "cctv",
        title: `${cam.title} - ${cam.locationName}`,
        subtitle: `國道5號 ${cam.direction === "S" ? "南下" : "北上"} 里程 ${cam.mileage}K 即時路況攝影機`,
        tag: "CCTV 影像",
        tabTarget: "cctv",
        direction: cam.direction,
        actionPayload: { cctvId: cam.id, mileage: cam.mileage },
      });
    });

    // 5. 最佳出發時間模組
    items.push({
      id: "dep-south-plan",
      category: "departure",
      title: "南下往宜蘭最佳出發時間精算",
      subtitle: "台北出發前往礁溪/宜蘭/羅東避開尖峰塞車時段試算",
      tag: "出發試算",
      tabTarget: "departure",
      direction: "S",
    });
    items.push({
      id: "dep-north-plan",
      category: "departure",
      title: "北上往台北最佳出發時間精算",
      subtitle: "宜蘭北返台北避開雪隧回堵與尖峰排隊車流時段",
      tag: "出發試算",
      tabTarget: "departure",
      direction: "N",
    });
    items.push({
      id: "dep-hqv-rules",
      category: "departure",
      title: "國道5號假日高乘載管制分析與離峰推薦",
      subtitle: "週日北向 15:00~20:00 與連假離峰行車時間比較",
      tag: "管制分析",
      tabTarget: "departure",
    });

    // 6. 數理模型與交通流體力學
    items.push({
      id: "theory-cauchy-schwarz",
      category: "theory",
      title: "柯西-施瓦茨不等式檢驗 (Cauchy-Schwarz)",
      subtitle: "交通流時間平均速 (TMS) 與空間平均速 (SMS) 嚴格不等式 v_TMS >= v_SMS",
      tag: "數理定理",
      tabTarget: "theory",
      actionPayload: { theorySection: "math_theorems" },
    });
    items.push({
      id: "theory-jensen",
      category: "theory",
      title: "簡森不等式檢驗 (Jensen's Inequality)",
      subtitle: "動態旅行時間非線性凸函數期望偏差 E[1/v] >= 1/E[v]",
      tag: "數理定理",
      tabTarget: "theory",
      actionPayload: { theorySection: "math_theorems" },
    });
    items.push({
      id: "theory-20micro",
      category: "theory",
      title: "雪隧 20 微元空間積分流速推估理論",
      subtitle: "全線 12.9 公里微元區段、雙三次三次樣條插值與坡度補償",
      tag: "微元模型",
      tabTarget: "theory",
      actionPayload: { theorySection: "micro_elements" },
    });
    items.push({
      id: "theory-models",
      category: "theory",
      title: "4 大交通模型流速橫向對比",
      subtitle: "Greenshields、Greenberg、Underwood 與微元空間積分模型交叉驗證",
      tag: "模型對比",
      tabTarget: "theory",
      actionPayload: { theorySection: "models_comparison" },
    });

    return items;
  }, []);

  // 關鍵字搜尋過濾邏輯 (支援模糊、空格拆分、英文數字與中文)
  const filteredResults = useMemo(() => {
    const rawQuery = searchTerm.trim().toLowerCase();
    if (!rawQuery) {
      // 預設推薦前 8 筆熱門實用項目
      return allSearchableItems.slice(0, 8);
    }

    const queryTokens = rawQuery.split(/\s+/).filter(Boolean);

    return allSearchableItems.filter((item) => {
      const targetText = `${item.title} ${item.subtitle} ${item.tag} ${item.category}`.toLowerCase();
      return queryTokens.every((token) => targetText.includes(token));
    });
  }, [searchTerm, allSearchableItems]);

  // Google 搜尋連結
  const googleSearchUrl = useMemo(() => {
    const q = searchTerm.trim()
      ? `國道5號 雪山隧道 ${searchTerm.trim()} 即時路況`
      : "國道5號 雪山隧道 即時路況 CCTV";
    return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  }, [searchTerm]);

  const handleSelect = (item: SearchResultItem) => {
    onSelectResult(item);
    onClose();
  };

  const handleGoogleSearch = () => {
    window.open(googleSearchUrl, "_blank", "noopener,noreferrer");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 sm:pt-20 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 頂部搜尋欄 */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/70">
          <div className="p-2 rounded-xl bg-emerald-100/80 text-emerald-700 shrink-0">
            <Search className="h-5 w-5" />
          </div>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="搜尋雪隧路段、交流道(石碇/坪林/頭城)、CCTV、出發時間、數理公式..."
              className="w-full bg-transparent text-slate-900 placeholder-slate-400 font-medium text-sm sm:text-base focus:outline-none pr-8"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer shrink-0"
          >
            ESC 關閉
          </button>
        </div>

        {/* 熱門關鍵字標籤 */}
        <div className="px-4 py-2.5 bg-slate-50/50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" />
            熱門：
          </span>
          {POPULAR_KEYWORDS.map((kw) => (
            <button
              key={kw}
              onClick={() => setSearchTerm(kw)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition cursor-pointer whitespace-nowrap"
            >
              {kw}
            </button>
          ))}
        </div>

        {/* 搜尋結果列表 */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {filteredResults.length > 0 ? (
            filteredResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-emerald-50/90 border-emerald-300 shadow-xs"
                      : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/80"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        item.category === "lane"
                          ? "bg-emerald-100 text-emerald-700"
                          : item.category === "corridor"
                          ? "bg-blue-100 text-blue-700"
                          : item.category === "cctv"
                          ? "bg-purple-100 text-purple-700"
                          : item.category === "departure"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      {item.category === "lane" && <Compass className="h-4 w-4" />}
                      {item.category === "corridor" && <MapPin className="h-4 w-4" />}
                      {item.category === "cctv" && <Video className="h-4 w-4" />}
                      {item.category === "departure" && <Clock className="h-4 w-4" />}
                      {item.category === "theory" && <BookOpen className="h-4 w-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {item.title}
                        </h4>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold whitespace-nowrap ${
                            item.category === "lane"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.category === "corridor"
                              ? "bg-blue-100 text-blue-800"
                              : item.category === "cctv"
                              ? "bg-purple-100 text-purple-800"
                              : item.category === "departure"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-indigo-100 text-indigo-800"
                          }`}
                        >
                          {item.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 shrink-0">
                    <span className="text-[10px] hidden sm:inline font-mono">前往</span>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">找不到相符的站內關鍵字</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                您可以嘗試搜尋「雪隧」、「石碇」、「坪林」、「CCTV」或使用下方按鈕前往 Google 搜尋。
              </p>
            </div>
          )}
        </div>

        {/* 底部 Google 搜尋整合列 */}
        <div className="p-3 sm:p-4 bg-slate-900 text-white border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Globe className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              想使用 Google 搜尋更多國5路況？
              {searchTerm && (
                <span className="text-emerald-300 font-bold ml-1">
                  「{searchTerm}」
                </span>
              )}
            </span>
          </div>

          <button
            onClick={handleGoogleSearch}
            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <span>在 Google 上搜尋即時路況</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
