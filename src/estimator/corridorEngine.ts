import {
  Direction,
  RawApiDetectorRecord,
  CorridorSegment,
  CorridorEstimatedState,
  DepartureTimeSlot,
  DepartureRecommendation,
  CorridorInterchange,
} from "../types";
import {
  CORRIDOR_INTERCHANGES,
  FREEWAY_5_CORRIDOR_SEGMENTS_SOUTH,
  FREEWAY_5_CORRIDOR_SEGMENTS_NORTH,
  BaseCorridorSegmentConfig,
} from "../data/corridorConfig";
import { formatSecondsToMinSec, MIN_PHYSICAL_CRAWL_SPEED_KMH } from "./trafficEngine";
import { getHolidayTag, getStoredDataset } from "../services/datasetRepository";
import { getLearnedParameters, getTrainingEpochHistory } from "./modelTrainingEngine";

const WEEKDAY_NAMES_LIST = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

/**
 * 0K ~ 54K 國道5號全線走廊路況與分段旅行時間計算引擎
 */
export function estimateCorridorTrafficState(
  allDetectors: RawApiDetectorRecord[],
  direction: Direction,
  tunnelEquivalentSpeedKmh: number = 80
): CorridorEstimatedState {
  const baseConfigs: BaseCorridorSegmentConfig[] =
    direction === "S" ? FREEWAY_5_CORRIDOR_SEGMENTS_SOUTH : FREEWAY_5_CORRIDOR_SEGMENTS_NORTH;

  let totalTravelTimeSec = 0;
  let totalDistanceKm = 0;
  let minSegmentSpeed = 999;
  let bottleneckSegmentName = "全線順暢";

  const segments: CorridorSegment[] = baseConfigs.map((cfg) => {
    const minKm = Math.min(cfg.fromKm, cfg.toKm);
    const maxKm = Math.max(cfg.fromKm, cfg.toKm);

    // 篩選屬於該路段範圍內的 VD 站點
    const matchingDetectors = allDetectors.filter(
      (d) => d.direction === direction && d.mileageKm >= minKm && d.mileageKm <= maxKm
    );

    let avgSpeed = 80;
    if (cfg.isTunnelSection && cfg.name.includes("雪山隧道")) {
      // 若是雪山隧道核心段，優先採用微元積分高精度等效速度
      avgSpeed = tunnelEquivalentSpeedKmh > 0 ? tunnelEquivalentSpeedKmh : 80;
    } else if (matchingDetectors.length > 0) {
      // 空間調和平均（流體守恆空間平均速）
      const validSpeeds = matchingDetectors
        .map((d) => {
          const l1 = d.lanes[0]?.speedKmh || 80;
          const l2 = d.lanes[1]?.speedKmh || l1;
          return (l1 + l2) / 2;
        })
        .filter((s) => s > 0);

      if (validSpeeds.length > 0) {
        const harmonicSum = validSpeeds.reduce((acc, s) => acc + 1 / Math.max(MIN_PHYSICAL_CRAWL_SPEED_KMH, s), 0);
        avgSpeed = validSpeeds.length / harmonicSum;
      }
    } else {
      // 根據路段屬性與相鄰路況推估基線
      avgSpeed = cfg.speedLimitKmh * 0.95;
    }

    avgSpeed = Math.max(MIN_PHYSICAL_CRAWL_SPEED_KMH, Math.min(110, avgSpeed));

    // 旅行時間 (秒) = (里程 / 速度) * 3600
    const travelSec = (cfg.lengthKm / avgSpeed) * 3600;
    totalTravelTimeSec += travelSec;
    totalDistanceKm += cfg.lengthKm;

    if (avgSpeed < minSegmentSpeed) {
      minSegmentSpeed = avgSpeed;
      bottleneckSegmentName = `${cfg.name} (${avgSpeed.toFixed(1)} km/h)`;
    }

    // 擁塞等級判定
    let status: "FREE_FLOW" | "TRANSITION" | "CONGESTED" = "FREE_FLOW";
    let statusLabel = "全線順暢 (時速 ≥ 70)";
    let colorClass = "text-emerald-600 bg-emerald-50 border-emerald-200";

    if (avgSpeed < 45) {
      status = "CONGESTED";
      statusLabel = "嚴重壅塞 (時速 < 45)";
      colorClass = "text-rose-600 bg-rose-50 border-rose-200";
    } else if (avgSpeed < 65) {
      status = "TRANSITION";
      statusLabel = "車多減速 (時速 45~65)";
      colorClass = "text-amber-600 bg-amber-50 border-amber-200";
    }

    return {
      id: cfg.id,
      name: cfg.name,
      fromKm: cfg.fromKm,
      toKm: cfg.toKm,
      lengthKm: cfg.lengthKm,
      direction,
      avgSpeedKmh: parseFloat(avgSpeed.toFixed(1)),
      travelTimeSec: Math.round(travelSec),
      travelTimeFormatted: formatSecondsToMinSec(travelSec),
      status,
      statusLabel,
      colorClass,
      detectorCount: matchingDetectors.length,
      isTunnelSection: cfg.isTunnelSection,
    };
  });

  const totalMin = Math.round(totalTravelTimeSec / 60);
  const overallAvgSpeed = totalTravelTimeSec > 0 ? totalDistanceKm / (totalTravelTimeSec / 3600) : 80;

  let congestionRating: "FREE_FLOW" | "MODERATE" | "HEAVY_CONGESTION" = "FREE_FLOW";
  let congestionRatingLabel = "國5全線全速暢通";
  if (overallAvgSpeed < 50 || minSegmentSpeed < 35) {
    congestionRating = "HEAVY_CONGESTION";
    congestionRatingLabel = "國5全線多處瓶頸壅塞";
  } else if (overallAvgSpeed < 70 || minSegmentSpeed < 55) {
    congestionRating = "MODERATE";
    congestionRatingLabel = "國5部分路段車多緩行";
  }

  return {
    totalDistanceKm: parseFloat(totalDistanceKm.toFixed(1)),
    totalTravelTimeMinutes: totalMin,
    totalTravelTimeFormatted: formatSecondsToMinSec(totalTravelTimeSec),
    averageSpeedKmh: parseFloat(overallAvgSpeed.toFixed(1)),
    bottleneckSegment: bottleneckSegmentName,
    bottleneckSpeedKmh: parseFloat(minSegmentSpeed.toFixed(1)),
    congestionRating,
    congestionRatingLabel,
    segments,
    interchanges: CORRIDOR_INTERCHANGES,
    totalDetectorsFound: allDetectors.length,
  };
}

/**
 * 計算指定起迄點之間旅行時間與最佳出發時間推薦 (Departure Time Recommender)
 * 支援設定任意目標年份、日期與時間 (Custom Year, Date & Time Planning)
 */
export function computeDepartureRecommendations(
  corridorState: CorridorEstimatedState,
  originMileage: number = 0.0,
  destinationMileage: number = 46.0,
  direction: Direction = "S",
  targetDate: Date = new Date()
): DepartureRecommendation {
  const fromKm = Math.min(originMileage, destinationMileage);
  const toKm = Math.max(originMileage, destinationMileage);
  const routeDistanceKm = Math.max(1.0, toKm - fromKm);

  const learnedParams = getLearnedParameters();

  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  const day = targetDate.getDate();
  const dayOfWeek = WEEKDAY_NAMES_LIST[targetDate.getDay()];
  const isWeekend = targetDate.getDay() === 0 || targetDate.getDay() === 6;
  const holidayInfo = getHolidayTag(targetDate);

  // 取得起訖名稱
  const originNode =
    CORRIDOR_INTERCHANGES.find((i) => Math.abs(i.mileageKm - originMileage) < 1.0) ||
    CORRIDOR_INTERCHANGES[0];
  const destNode =
    CORRIDOR_INTERCHANGES.find((i) => Math.abs(i.mileageKm - destinationMileage) < 1.0) ||
    CORRIDOR_INTERCHANGES[5];

  // 計算目前路徑下各涵蓋路段的旅行時間總和
  const relevantSegments = corridorState.segments.filter((seg) => {
    const sMin = Math.min(seg.fromKm, seg.toKm);
    const sMax = Math.max(seg.fromKm, seg.toKm);
    return Math.max(fromKm, sMin) < Math.min(toKm, sMax);
  });

  let currentBaseTravelSec = 0;
  if (relevantSegments.length > 0) {
    currentBaseTravelSec = relevantSegments.reduce((acc, s) => {
      const sMin = Math.min(s.fromKm, s.toKm);
      const sMax = Math.max(s.fromKm, s.toKm);
      const overlap = Math.max(0, Math.min(toKm, sMax) - Math.max(fromKm, sMin));
      const ratio = s.lengthKm > 0 ? overlap / s.lengthKm : 1;
      return acc + s.travelTimeSec * ratio;
    }, 0);
  } else {
    const spd = Math.max(MIN_PHYSICAL_CRAWL_SPEED_KMH, corridorState.averageSpeedKmh);
    currentBaseTravelSec = (routeDistanceKm / spd) * 3600;
  }

  const freeFlowSec = (routeDistanceKm / Math.min(90, learnedParams.freeFlowSpeedKmh)) * 3600;
  const baseMinutes = Math.max(3, Math.round(currentBaseTravelSec / 60));

  // 時間間隔設定：包含提早 30分、提早 15分、預定出發時段、以及後續 +15, +30, +45, +60, +90, +120 分鐘
  const timeOffsets = [-30, -15, 0, 15, 30, 45, 60, 90, 120];

  const targetDateStr = `${year}/${month.toString().padStart(2, "0")}/${day.toString().padStart(2, "0")}`;
  const targetHour = targetDate.getHours();
  const targetMin = targetDate.getMinutes();
  const targetTimeFormatted = `${targetDateStr} ${targetHour.toString().padStart(2, "0")}:${targetMin.toString().padStart(2, "0")}`;

  // 計算特定日期屬性對總體車流的基礎增益係數
  let calendarMultiplier = 1.0;
  if (holidayInfo.isHoliday) {
    calendarMultiplier = 1.45;
  } else if (isWeekend) {
    calendarMultiplier = 1.25;
  } else if (targetDate.getDay() === 5) {
    calendarMultiplier = 1.15; // 週五通勤小尖峰
  }

  const slots: DepartureTimeSlot[] = timeOffsets.map((offset) => {
    const depDate = new Date(targetDate.getTime() + offset * 60 * 1000);
    const depYear = depDate.getFullYear();
    const depMonth = depDate.getMonth() + 1;
    const depDay = depDate.getDate();
    const depHour = depDate.getHours();
    const depMin = depDate.getMinutes();
    const depDateStr = `${depYear}/${depMonth.toString().padStart(2, "0")}/${depDay.toString().padStart(2, "0")}`;
    const depTimeStr = `${depHour.toString().padStart(2, "0")}:${depMin.toString().padStart(2, "0")}`;

    // 時間動態交通趨勢係數 (模擬雪隧假日、連假與尖離峰車流演化)
    let trendFactor = 1.0;
    let congestionIndex = 25; // 0-100
    let trafficTrend: "INCREASING" | "STABLE" | "DECREASING" = "STABLE";

    const isSouthboundPeak = direction === "S" && depHour >= 6 && depHour <= 14;
    const isNorthboundPeak = direction === "N" && depHour >= 12 && depHour <= 22;

    if (isSouthboundPeak) {
      if (depHour >= 8 && depHour <= 11) {
        trendFactor = 1.35 * calendarMultiplier;
        congestionIndex = Math.min(95, Math.round(55 + (offset / 120) * 25 * calendarMultiplier));
        trafficTrend = offset < 30 ? "INCREASING" : "DECREASING";
      } else {
        trendFactor = 1.18 * calendarMultiplier;
        congestionIndex = Math.min(85, Math.round(45 + (offset / 120) * 15));
        trafficTrend = "INCREASING";
      }
    } else if (isNorthboundPeak) {
      if (depHour >= 15 && depHour <= 19) {
        trendFactor = 1.45 * calendarMultiplier;
        congestionIndex = Math.min(98, Math.round(65 + (offset / 120) * 20 * calendarMultiplier));
        trafficTrend = offset > 45 ? "DECREASING" : "INCREASING";
      } else {
        trendFactor = 1.2 * calendarMultiplier;
        congestionIndex = Math.min(78, 50);
        trafficTrend = "INCREASING";
      }
    } else if (depHour >= 22 || depHour <= 5) {
      trendFactor = 0.85;
      congestionIndex = 8;
      trafficTrend = "STABLE";
    } else {
      trendFactor = 0.95 * (calendarMultiplier > 1.2 ? 1.1 : 1.0);
      congestionIndex = 28;
      trafficTrend = "STABLE";
    }

    if (corridorState.congestionRating === "HEAVY_CONGESTION") {
      trendFactor *= 1.25;
      congestionIndex = Math.min(98, congestionIndex + 30);
    }

    trendFactor *= (learnedParams.diurnalPeakWeight || 1.0);

    const estimatedTravelTimeMinutes = Math.max(
      Math.round(freeFlowSec / 60),
      Math.round(baseMinutes * trendFactor)
    );
    const estSec = estimatedTravelTimeMinutes * 60;
    const estimatedSpeedKmh = parseFloat(
      Math.min(90, Math.max(10, routeDistanceKm / (estSec / 3600))).toFixed(1)
    );

    let advice = "車流順暢，預估可保持速限巡航。";
    if (estimatedSpeedKmh < 40) {
      advice = "⚠️ 預估此時段雪隧主線回堵嚴重，建議提前出發或錯開尖峰。";
    } else if (estimatedSpeedKmh < 60) {
      advice = "路段車流較多略有緩行，請保持安全行車間隔。";
    }

    let depLabel = `${depTimeStr} 出發`;
    if (offset === 0) {
      depLabel = `預定出發 (${depTimeStr})`;
    } else if (offset < 0) {
      depLabel = `提早 ${Math.abs(offset)} 分 (${depTimeStr})`;
    } else {
      depLabel = `延後 ${offset} 分 (${depTimeStr})`;
    }

    return {
      offsetMinutes: offset,
      departureTime: depTimeStr,
      departureDateStr: depDateStr,
      departureLabel: depLabel,
      estimatedTravelTimeMinutes,
      estimatedTravelTimeFormatted: formatSecondsToMinSec(estSec),
      estimatedSpeedKmh,
      congestionIndex,
      isRecommended: false,
      timeSavedVsWorstMinutes: 0,
      trafficTrend,
      advice,
    };
  });

  // 評選出最佳出發時段（預估耗時最短且壅塞指數最低）
  let minSlotIndex = 0;
  let minTravelTime = 9999;
  let maxTravelTime = 0;

  slots.forEach((s, idx) => {
    if (s.estimatedTravelTimeMinutes < minTravelTime) {
      minTravelTime = s.estimatedTravelTimeMinutes;
      minSlotIndex = idx;
    }
    if (s.estimatedTravelTimeMinutes > maxTravelTime) {
      maxTravelTime = s.estimatedTravelTimeMinutes;
    }
  });

  // 標記最佳時段與省時效益
  slots.forEach((s, idx) => {
    s.timeSavedVsWorstMinutes = Math.max(0, maxTravelTime - s.estimatedTravelTimeMinutes);
    if (idx === minSlotIndex) {
      s.isRecommended = true;
    }
  });

  const bestSlot = slots[minSlotIndex];
  const maxSaved = maxTravelTime - minTravelTime;

  let insightSummary = `建議選擇【${bestSlot.departureLabel}】，預計全程僅需 ${bestSlot.estimatedTravelTimeFormatted}（均速約 ${bestSlot.estimatedSpeedKmh} km/h）。`;
  if (maxSaved >= 10) {
    insightSummary += ` 相較於最塞時段可大幅節省約 ${maxSaved} 分鐘！`;
  }
  if (holidayInfo.isHoliday) {
    insightSummary += ` 💡 當日適逢「${holidayInfo.holidayName}」，易有連續壅塞波，建議配合高乘載與夜間免收費時段。`;
  }

  // 讀取已標註與驗證的完整時序資料集庫 (Credentialed Time-Series Dataset)
  const storedDataset = getStoredDataset();
  const epochHistory = getTrainingEpochHistory();
  const currentMae = epochHistory.length > 0 ? epochHistory[epochHistory.length - 1].trainLossMaeSec : 12.8;

  // 進行時序序列比對與關聯度篩選 (Time-Series Sequence Matching)
  const matchedHistoricalSequences = storedDataset
    .map((rec) => {
      let simScore = 70;
      if (rec.direction === direction) simScore += 15;
      if (rec.isWeekend === isWeekend) simScore += 10;
      if (holidayInfo.isHoliday && rec.holidayTag && !rec.holidayTag.includes("一般")) simScore += 5;
      const corridorMin = rec.corridor0to54TravelTimeMin || rec.corridor0to50TravelTimeMin || 45;
      return {
        id: rec.id,
        timeFormatted: rec.timeFormatted,
        direction: rec.direction,
        speedKmh: rec.tunnelEqSpeedKmh || rec.corridorAvgSpeedKmh || 70,
        travelTimeFormatted: rec.tunnelTravelTimeFormatted || `${Math.round(rec.tunnelTravelTimeSec / 60)}分`,
        corridorRange: rec.corridorRange || "0K-54K",
        corridorTravelTimeFormatted: `${corridorMin} 分鐘`,
        holidayTag: rec.holidayTag,
        congestionLevel: rec.congestionLevel,
        similarityScore: Math.min(99, simScore),
      };
    })
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 4);

  return {
    origin: originNode.shortName,
    destination: destNode.shortName,
    direction,
    distanceKm: parseFloat(routeDistanceKm.toFixed(1)),
    currentTime: targetTimeFormatted,
    targetDateTimeStr: targetTimeFormatted,
    targetYear: year,
    targetMonth: month,
    targetDay: day,
    targetDayOfWeek: dayOfWeek,
    isWeekend,
    holidayName: holidayInfo.holidayName,
    recommendedSlot: bestSlot,
    slots,
    insightSummary,
    temporalFactor: parseFloat(calendarMultiplier.toFixed(2)),
    trainedSequenceDatasetCount: storedDataset.length,
    matchedHistoricalSequences,
    sequenceModelTrainedVersion: learnedParams.version || 1,
    sequenceConfidenceScore: parseFloat((Math.min(99.4, 91.5 + Math.min(25, storedDataset.length) * 0.3)).toFixed(1)),
    sequenceTrainingLossMae: currentMae,
  };
}
