import { SpeedRuleLevel } from "../types";

export const SPEED_RULES: SpeedRuleLevel[] = [
  {
    min: 80,
    max: 999,
    label: "≥ 80 km/h",
    congestion: "順暢",
    colorText: "text-emerald-400",
    colorBg: "bg-emerald-500/15",
    colorBorder: "border-emerald-500/30",
    badge: "🟢 80+ 順暢",
  },
  {
    min: 60,
    max: 79.9,
    label: "60 - 79 km/h",
    congestion: "輕度壅塞 (車流良好)",
    colorText: "text-lime-400",
    colorBg: "bg-lime-500/15",
    colorBorder: "border-lime-500/30",
    badge: "🟡 60-80 良好",
  },
  {
    min: 40,
    max: 59.9,
    label: "40 - 59 km/h",
    congestion: "中度壅塞 (車多緩行)",
    colorText: "text-amber-400",
    colorBg: "bg-amber-500/15",
    colorBorder: "border-amber-500/30",
    badge: "🟠 40-60 中度",
  },
  {
    min: 20,
    max: 39.9,
    label: "20 - 39 km/h",
    congestion: "重度壅塞 (慢速行駛)",
    colorText: "text-rose-400",
    colorBg: "bg-rose-500/20",
    colorBorder: "border-rose-500/40",
    badge: "🔴 20-40 重度",
  },
  {
    min: 0,
    max: 19.9,
    label: "< 20 km/h (10)",
    congestion: "極重度壅塞 (紫爆定點)",
    colorText: "text-purple-400",
    colorBg: "bg-purple-500/25",
    colorBorder: "border-purple-500/40",
    badge: "🟣 <20 (10) 紫爆",
  },
];

export function getSpeedLevel(speed: number | null | undefined): SpeedRuleLevel {
  if (speed === null || speed === undefined || isNaN(speed)) {
    return {
      min: 0,
      max: 0,
      label: "--",
      congestion: "無數據",
      colorText: "text-slate-500",
      colorBg: "bg-slate-900",
      colorBorder: "border-slate-800",
      badge: "⚪ 無數據",
    };
  }

  if (speed >= 80) return SPEED_RULES[0];
  if (speed >= 60) return SPEED_RULES[1];
  if (speed >= 40) return SPEED_RULES[2];
  if (speed >= 20) return SPEED_RULES[3];
  return SPEED_RULES[4];
}

export function getCongestionBySpeed(speed: number | null | undefined): {
  text: string;
  className: string;
  badgeClass: string;
} {
  const level = getSpeedLevel(speed);
  return {
    text: level.congestion,
    className: `${level.colorText} font-bold`,
    badgeClass: `${level.colorBg} ${level.colorText} ${level.colorBorder} border px-2 py-0.5 rounded-md text-[11px] font-semibold`,
  };
}

export function getDensityText(occ: number) {
  if (occ > 25) return "極度飽和 (車流定點)";
  if (occ > 18) return "擁擠密集 (易急煞)";
  if (occ > 10) return "車多穩定 (跟車前行)";
  return "順暢寬鬆 (充裕安全車距)";
}

export function getDensityColorClass(occ: number) {
  if (occ > 25) return "text-purple-400 font-bold";
  if (occ > 18) return "text-rose-400 font-semibold";
  if (occ > 10) return "text-amber-400 font-semibold";
  return "text-emerald-400";
}
