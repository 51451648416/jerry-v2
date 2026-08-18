import React, { useState } from "react";
import { X, Award, Code2, Activity, Layers, BookOpen, Scale, Cpu } from "lucide-react";
import { motion } from "motion/react";
import RawVsModelDiagnostic from "./RawVsModelDiagnostic";
import ModelComparisonCard from "./ModelComparisonCard";
import MathTheoryInspector from "./MathTheoryInspector";
import DetectorArrayGrid from "./DetectorArrayGrid";
import GroundTruthBenchmark from "./GroundTruthBenchmark";
import JsonExportViewer from "./JsonExportViewer";
import ModelTrainingMonitor from "./ModelTrainingMonitor";
import { Direction, FinalEstimatorOutput } from "../types";

interface AdvancedAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimatorOutput: FinalEstimatorOutput;
  direction: Direction;
  onRequireAuthPrompt?: (title: string, desc: string, callback: () => void) => void;
}

export default function AdvancedAnalysisModal({
  isOpen,
  onClose,
  estimatorOutput,
  direction,
  onRequireAuthPrompt,
}: AdvancedAnalysisModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<"training" | "raw_vs_model" | "models" | "theory" | "detectors" | "benchmark" | "json">("training");

  if (!isOpen) return null;

  const estState = estimatorOutput.estimated_state;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Layers className="h-4 w-4" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                進階設定與模型診斷分析 (Advanced Diagnostic & Settings)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              在線模型訓練與車道切換優化、RAW API 與 MODEL 分離診斷、20 個空間微元積分與全線 VD 觀測
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1.5 p-3 bg-slate-950 border-b border-slate-800 overflow-x-auto">
          {[
            { id: "training", label: "在線訓練與車道切換優化", icon: Cpu },
            { id: "raw_vs_model", label: "RAW vs MODEL 診斷對照", icon: Scale },
            { id: "models", label: "20微元連續積分與速度表", icon: Activity },
            { id: "theory", label: "數學定理與一致性檢驗", icon: BookOpen },
            { id: "detectors", label: `全線VD觀測 (${estimatorOutput.raw_api.records.length}站)`, icon: Layers },
            { id: "benchmark", label: "Ground Truth 評測說明", icon: Award },
            { id: "json", label: "SSOT JSON 導出", icon: Code2 },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                  activeSubTab === tab.id
                    ? "bg-emerald-500 text-slate-950 shadow-sm font-extrabold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-950/40">
          {activeSubTab === "training" && (
            <ModelTrainingMonitor onRequireAuthPrompt={onRequireAuthPrompt} />
          )}

          {activeSubTab === "raw_vs_model" && (
            <RawVsModelDiagnostic estimatorOutput={estimatorOutput} />
          )}

          {activeSubTab === "models" && (
            <div className="space-y-4">
              <ModelComparisonCard estimatorOutput={estimatorOutput} />
            </div>
          )}

          {activeSubTab === "theory" && (
            <div className="space-y-4">
              <MathTheoryInspector estState={estState} />
            </div>
          )}

          {activeSubTab === "detectors" && (
            <div className="space-y-4">
              <DetectorArrayGrid
                records={estimatorOutput.raw_api.records}
                qualityReports={estimatorOutput.quality_reports}
                direction={direction}
              />
            </div>
          )}

          {activeSubTab === "benchmark" && (
            <div className="space-y-4">
              <GroundTruthBenchmark />
            </div>
          )}

          {activeSubTab === "json" && (
            <div className="space-y-4">
              <JsonExportViewer estimatorOutput={estimatorOutput} />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span>雪山隧道空間微元交通狀態估計系統</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition font-medium cursor-pointer"
          >
            關閉視窗
          </button>
        </div>
      </motion.div>
    </div>
  );
}
