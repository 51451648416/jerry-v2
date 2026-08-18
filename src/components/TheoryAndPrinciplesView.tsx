import React, { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Layers,
  Gauge,
  Compass,
  Cpu,
  TrendingDown,
  Sparkles,
  Info,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Direction, FinalEstimatorOutput } from "../types";
import MathTheoryInspector from "./MathTheoryInspector";
import ModelComparisonCard from "./ModelComparisonCard";
import RawVsModelDiagnostic from "./RawVsModelDiagnostic";
import GroundTruthBenchmark from "./GroundTruthBenchmark";

interface TheoryAndPrinciplesViewProps {
  estimatorOutput: FinalEstimatorOutput | null;
  direction: Direction;
}

export default function TheoryAndPrinciplesView({
  estimatorOutput,
  direction,
}: TheoryAndPrinciplesViewProps) {
  const [activeSection, setActiveSection] = useState<
    "math_theorems" | "micro_elements" | "models_comparison" | "diagnostic" | "benchmark"
  >("math_theorems");

  const estState = estimatorOutput?.estimated_state;

  return (
    <div className="space-y-6">
      {/* 頂部標題與說明 */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-2xl bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20">
                <BookOpen className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>數理模型與交通流體力學原理</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                    公開數理分析
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  全線 12.9 公里雪山隧道雙向 20 空間微元積分、柯西-施瓦茨不等式與簡森不等式數理驗證
                </p>
              </div>
            </div>
          </div>

          {/* 方向切換指示 */}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-3.5 py-1.5 rounded-2xl border border-slate-200">
            <span>當前分析方向：</span>
            <span className="text-indigo-600 font-extrabold">
              {direction === "S" ? "南下 (往宜蘭)" : "北上 (往台北)"}
            </span>
          </div>
        </div>

        {/* 次級導覽分頁 */}
        <div className="flex items-center gap-2 pt-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSection("math_theorems")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSection === "math_theorems"
                ? "bg-indigo-600 text-white shadow-sm font-extrabold"
                : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>數學定理與不等式檢驗</span>
          </button>

          <button
            onClick={() => setActiveSection("micro_elements")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSection === "micro_elements"
                ? "bg-indigo-600 text-white shadow-sm font-extrabold"
                : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>20 微元空間積分原理</span>
          </button>

          <button
            onClick={() => setActiveSection("models_comparison")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSection === "models_comparison"
                ? "bg-indigo-600 text-white shadow-sm font-extrabold"
                : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>4 大模型流速橫向對比</span>
          </button>

          <button
            onClick={() => setActiveSection("diagnostic")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSection === "diagnostic"
                ? "bg-indigo-600 text-white shadow-sm font-extrabold"
                : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <Gauge className="h-3.5 w-3.5" />
            <span>原始站點 vs 模型推估診斷</span>
          </button>

          <button
            onClick={() => setActiveSection("benchmark")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSection === "benchmark"
                ? "bg-indigo-600 text-white shadow-sm font-extrabold"
                : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Ground Truth 驗證基準</span>
          </button>
        </div>
      </div>

      {/* 區塊 1: 數學定理與不等式檢驗 */}
      {activeSection === "math_theorems" && estState && (
        <div className="space-y-4">
          <MathTheoryInspector estState={estState} />
        </div>
      )}

      {/* 區塊 2: 20 微元空間積分原理 */}
      {activeSection === "micro_elements" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                <Layers className="h-4 w-4" />
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                雪山隧道 20 微元連續空間積分理論 (Continuous Micro-Element Integration)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              為解決雪山隧道內部僅有有限偵測器（VD）造成的取樣盲區，本系統採用流體力學連續微元模型。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                空間積分公式
              </span>
              <h4 className="text-sm font-bold text-slate-900">動態旅行時間 T 與等效流速 v_eq</h4>
              <div className="bg-slate-900 text-indigo-300 p-4 rounded-xl font-mono text-xs space-y-2">
                <div>{`T = ∫_{0}^{L} \\frac{1}{v(x, t)} dx \\approx \\sum_{i=1}^{20} \\frac{\\Delta x_i}{v_i}`}</div>
                <div className="text-slate-400 text-[11px]">{`v_{eq} = \\frac{L}{T} = \\frac{L}{\\sum_{i=1}^{20} \\frac{\\Delta x_i}{v_i}}`}</div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                其中全線 L = 12.9 km 切分為 20 個空間微元區段（Δx ≈ 645 m）。各微元之時速 v_i 係依據前後偵測站進行雙三次三次樣條插值，並結合縱坡（+1.2% / -1.2%）與通風豎井群阻力進行連續修正。
              </p>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                物理邊界與幾何校正
              </span>
              <h4 className="text-sm font-bold text-slate-900">坡度阻力與通風井阻流補償</h4>
              <div className="space-y-2 text-xs text-slate-700">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-indigo-600">1. 縱向坡度：</span>
                  <span>
                    南下進入雪隧前段具 +1.2% 爬坡坡度，重車在微元區段 3~7 速降顯著；北上則呈下坡與平緩段。
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-indigo-600">2. 通風三號豎井群：</span>
                  <span>
                    通風井排風抽引氣流造成局部氣動阻力，模型在微元 11~14 注入氣壓阻力衰減係數。
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-indigo-600">3. 洞口明暗適應：</span>
                  <span>
                    南口（頭城端）與北口（坪林端）光線驟變造成的駕駛減速效應納入洞口微元抑制項。
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 區塊 3: 4 大模型流速橫向對比 */}
      {activeSection === "models_comparison" && estimatorOutput && (
        <div className="space-y-4">
          <ModelComparisonCard estimatorOutput={estimatorOutput} />
        </div>
      )}

      {/* 區塊 4: 原始站點 vs 模型推估診斷 */}
      {activeSection === "diagnostic" && estimatorOutput && (
        <div className="space-y-4">
          <RawVsModelDiagnostic estimatorOutput={estimatorOutput} />
        </div>
      )}

      {/* 區塊 5: Ground Truth 驗證基準 */}
      {activeSection === "benchmark" && (
        <div className="space-y-4">
          <GroundTruthBenchmark />
        </div>
      )}
    </div>
  );
}
