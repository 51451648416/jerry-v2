import React, { useState } from "react";
import { Code2, Copy, Check, Terminal } from "lucide-react";
import { FinalEstimatorOutput } from "../types";

interface JsonExportViewerProps {
  estimatorOutput: FinalEstimatorOutput;
}

export default function JsonExportViewer({ estimatorOutput }: JsonExportViewerProps) {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(estimatorOutput, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Code2 className="h-4 w-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white">
              標準規格 Single Source of Truth (SSOT) JSON 輸出
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            完整呈現 raw_api、estimated_state（含 4 種明確定義車速與微元切片）、quality_reports 數據結構
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">已複製 JSON</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-slate-300" />
              <span>複製輸出 JSON</span>
            </>
          )}
        </button>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
        <div className="p-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-emerald-400" />
            <span>estimated_state.json</span>
          </div>
          <span className="text-[11px] text-slate-400">
            {estimatorOutput.raw_api.records.length} 個 VD 站點數據
          </span>
        </div>

        <pre className="p-4 text-xs font-mono text-emerald-400/90 overflow-x-auto max-h-96 leading-relaxed">
          <code>{jsonString}</code>
        </pre>
      </div>
    </div>
  );
}
