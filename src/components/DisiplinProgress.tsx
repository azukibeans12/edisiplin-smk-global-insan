"use client";

import React from "react";
import { DISIPLIN_STAGES, getDisiplinStage } from "@/lib/disiplin";

interface Props {
  score: number;
  hasInstantOut?: boolean;
}

export function DisiplinProgress({ score, hasInstantOut = false }: Props) {
  const effectiveScore = hasInstantOut ? 450 : score;
  const pct = Math.min(100, Math.round((effectiveScore / 450) * 100));
  const stage = getDisiplinStage(score, hasInstantOut);

  const barColor =
    stage.tone === "danger"
      ? "bg-rose-600"
      : stage.tone === "warn"
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <div className="space-y-3">
      <div className="w-full h-3 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {DISIPLIN_STAGES.map((item) => {
          const reached = effectiveScore >= item.min;
          return (
            <div
              key={item.stage}
              className={`p-2 rounded-lg border text-center transition ${
                reached
                  ? item.stage >= 3
                    ? "bg-rose-50 border-rose-300 text-rose-900"
                    : "bg-amber-50 border-amber-300 text-amber-900"
                  : "bg-slate-50 border-slate-200 text-slate-500"
              }`}
            >
              <div className="text-[11px] font-bold">P{item.stage}: {item.shortLabel}</div>
              <div className="text-[11px] font-mono opacity-80">{item.range} pt</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
