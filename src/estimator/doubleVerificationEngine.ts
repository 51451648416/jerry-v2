/**
 * Double Verification & Extreme Situation Determination Engine
 * (極端情況雙重重算驗證與 API 原始傳輸數據展示引擎)
 * 
 * 核心規範 (Strict Engineering Specification):
 * 1. 保留原本動態連續積分演算法為預設主方法 (Original Primary Approach Preserved).
 * 2. 若原本方法失敗 (計算例外/數值無效)，自動採用替代方法 (Alternative Robust Fallback Method).
 * 3. 極端情況二次驗證機制：若初算兩車道速差 > 23 km/h，自動觸發二次重算 (Double Verification Trigger: Δv > 23 km/h).
 * 4. 執行二次獨立空間插值與離群抑制重算 (Re-calculate).
 * 5. 若重算後兩車道速差仍 > 20 km/h (Recalculated Δv > 20 km/h)，正式判定為「極端異常情況 (Extreme Situation Determined)」.
 * 6. 直接展示 API 傳輸數據 (Directly Display API Transmission Telemetry Data) 以供比對核實.
 */

import {
  Direction,
  RawApiDetectorRecord,
  RoadSegmentSlice,
  DoubleVerificationState,
  ApiDirectVdTelemetry,
} from "../types";
import {
  HSUEHSHAN_TUNNEL_TOTAL_LENGTH_KM,
  MODEL_DISCRETIZATION_SLICES,
  SLICE_LENGTH_KM,
  MIN_PHYSICAL_CRAWL_SPEED_KMH,
} from "./delayAwareEngine";

export const EXTREME_TRIGGER_THRESHOLD_KMH = 23.0; // 兩車道速差超過 23 km/h 觸發二次重算
export const EXTREME_DETERMINED_THRESHOLD_KMH = 20.0; // 重算後速差仍超過 20 km/h 判定為極端情況

/**
 * 備援替代演算法 (Alternative Robust Method):
 * 當原本微元非線性動態積分發生數值溢位、例外或無效資料時調用
 */
export function computeAlternativeRobustTrajectory(
  detectors: RawApiDetectorRecord[],
  direction: Direction,
  laneIndex: number // 0 for Lane 1, 1 for Lane 2, -1 for combined
): {
  segments: RoadSegmentSlice[];
  totalTravelTimeSec: number;
  totalDistanceKm: number;
  equivalentTravelSpeedKmh: number;
  methodName: "ALTERNATIVE_ROBUST_FALLBACK";
} {
  const segments: RoadSegmentSlice[] = [];
  const startBaseKm = direction === "S" ? 15.103 : 28.200;

  // 提取各站點有效速度
  const validPoints = detectors
    .map((d) => {
      let speed = 80;
      if (laneIndex >= 0) {
        speed = d.lanes[laneIndex]?.speedKmh || d.lanes[0]?.speedKmh || 80;
      } else {
        const sumSpeed = d.lanes.reduce((acc, l) => acc + l.speedKmh, 0);
        speed = d.lanes.length > 0 ? sumSpeed / d.lanes.length : 80;
      }
      return {
        vdId: d.detectorId,
        mileageKm: d.mileageKm,
        speed: Math.max(MIN_PHYSICAL_CRAWL_SPEED_KMH, Math.min(100, isNaN(speed) ? 80 : speed)),
      };
    })
    .sort((a, b) => (direction === "S" ? a.mileageKm - b.mileageKm : b.mileageKm - a.mileageKm));

  // 若無站點資料，給予安全常態基準
  const defaultSpeed = 80.0;

  let cumulativeTimeSec = 0;

  for (let i = 0; i < MODEL_DISCRETIZATION_SLICES; i++) {
    const startKm = direction === "S" ? startBaseKm + i * SLICE_LENGTH_KM : startBaseKm - i * SLICE_LENGTH_KM;
    const endKm = direction === "S" ? startBaseKm + (i + 1) * SLICE_LENGTH_KM : startBaseKm - (i + 1) * SLICE_LENGTH_KM;
    const midKm = (startKm + endKm) / 2;

    // 尋找鄰近站點進行穩健反距離加權 (Inverse Distance Weighting with Outlier Bounding)
    let segSpeed = defaultSpeed;
    let upId = "DEFAULT";
    let downId = "DEFAULT";

    if (validPoints.length === 1) {
      segSpeed = validPoints[0].speed;
      upId = validPoints[0].vdId;
      downId = validPoints[0].vdId;
    } else if (validPoints.length > 1) {
      // 找出最近的 2~3 個站點做穩健調和均值
      const dists = validPoints.map((p) => ({
        ...p,
        dist: Math.max(0.1, Math.abs(p.mileageKm - midKm)),
      }));
      dists.sort((a, b) => a.dist - b.dist);

      const p1 = dists[0];
      const p2 = dists[1];
      upId = p1.vdId;
      downId = p2.vdId;

      const w1 = 1 / p1.dist;
      const w2 = 1 / p2.dist;
      // 調和加權
      segSpeed = (w1 + w2) / (w1 / p1.speed + w2 / p2.speed);
    }

    segSpeed = Math.max(MIN_PHYSICAL_CRAWL_SPEED_KMH, Math.min(100, segSpeed));
    const segTimeSec = (SLICE_LENGTH_KM / segSpeed) * 3600;
    cumulativeTimeSec += segTimeSec;

    segments.push({
      segmentIndex: i + 1,
      startMileageKm: startKm,
      endMileageKm: endKm,
      lengthKm: SLICE_LENGTH_KM,
      upstreamDetectorId: upId,
      downstreamDetectorId: downId,
      estimatedSegmentSpeedKmh: segSpeed,
      segmentTravelTimeSec: segTimeSec,
      cumulativeArrivalSec: cumulativeTimeSec,
    });
  }

  const totalTravelTimeSec = Math.max(1, cumulativeTimeSec);
  const totalDistanceKm = HSUEHSHAN_TUNNEL_TOTAL_LENGTH_KM;
  const equivalentTravelSpeedKmh = totalDistanceKm / (totalTravelTimeSec / 3600);

  return {
    segments,
    totalTravelTimeSec,
    totalDistanceKm,
    equivalentTravelSpeedKmh,
    methodName: "ALTERNATIVE_ROBUST_FALLBACK",
  };
}

/**
 * 執行極端情況二次驗證與重算 (Double Verification & Recalculation)
 * 
 * 規則：
 * 1. 初算兩車道速差 > 23 km/h 時觸發二次驗證。
 * 2. 使用二次多重空間插值與離群雜訊抑制法進行獨立重算。
 * 3. 若重算後兩車道速差仍 > 20 km/h，正式判定為「極端情況 (Extreme Situation)」。
 * 4. 直接編譯並輸出 API 傳輸原始數據 (Direct API Transmission Telemetry)。
 */
export function executeDoubleVerificationAndRecalculation(
  detectors: RawApiDetectorRecord[],
  direction: Direction,
  initialLane1SpeedKmh: number,
  initialLane2SpeedKmh: number,
  receivedTimestamp: string = new Date().toISOString()
): DoubleVerificationState {
  const initialLaneDiffKmh = Math.abs(initialLane1SpeedKmh - initialLane2SpeedKmh);
  const triggered = initialLaneDiffKmh > EXTREME_TRIGGER_THRESHOLD_KMH;

  // 1. 直接構建 API 原始傳輸數據明細 (Direct API Transmission Telemetry)
  const vdReadings: ApiDirectVdTelemetry[] = detectors.map((d) => {
    const l1Speed = d.lanes[0]?.speedKmh ?? 0;
    const l2Speed = d.lanes[1]?.speedKmh ?? (d.lanes[0]?.speedKmh ?? 0);
    const l1Flow = d.lanes[0]?.flowVehPerHour ?? 0;
    const l2Flow = d.lanes[1]?.flowVehPerHour ?? 0;
    const l1Occ = d.lanes[0]?.occupancyPercent ?? 0;
    const l2Occ = d.lanes[1]?.occupancyPercent ?? 0;
    const delta = Math.abs(l1Speed - l2Speed);
    const isExtremeSpot = delta > EXTREME_DETERMINED_THRESHOLD_KMH;

    let statusTag: "NORMAL" | "SPEED_DIVERGENCE" | "EXTREME_SPOT" = "NORMAL";
    if (delta > EXTREME_DETERMINED_THRESHOLD_KMH) {
      statusTag = "EXTREME_SPOT";
    } else if (delta > 10.0) {
      statusTag = "SPEED_DIVERGENCE";
    }

    return {
      detectorId: d.detectorId,
      mileageKm: d.mileageKm,
      lane1SpeedKmh: l1Speed,
      lane2SpeedKmh: l2Speed,
      speedDeltaKmh: delta,
      lane1FlowVehPerHour: l1Flow,
      lane2FlowVehPerHour: l2Flow,
      lane1OccupancyPercent: l1Occ,
      lane2OccupancyPercent: l2Occ,
      isExtremeSpot,
      statusTag,
    };
  });

  const totalVdStations = detectors.length;
  const lane1AvgApiSpeed =
    vdReadings.reduce((acc, r) => acc + r.lane1SpeedKmh, 0) / (totalVdStations || 1);
  const lane2AvgApiSpeed =
    vdReadings.reduce((acc, r) => acc + r.lane2SpeedKmh, 0) / (totalVdStations || 1);
  const lane1AvgFlow =
    vdReadings.reduce((acc, r) => acc + r.lane1FlowVehPerHour, 0) / (totalVdStations || 1);
  const lane2AvgFlow =
    vdReadings.reduce((acc, r) => acc + r.lane2FlowVehPerHour, 0) / (totalVdStations || 1);
  const lane1AvgOcc =
    vdReadings.reduce((acc, r) => acc + r.lane1OccupancyPercent, 0) / (totalVdStations || 1);
  const lane2AvgOcc =
    vdReadings.reduce((acc, r) => acc + r.lane2OccupancyPercent, 0) / (totalVdStations || 1);

  // 2. 若觸發二次重算 (initialLaneDiffKmh > 23 km/h)
  let recalculatedLaneDiffKmh = initialLaneDiffKmh;
  let isExtremeSituation = false;
  let statusText = "";
  let extremeExplanation = "";

  if (triggered) {
    // 執行二次獨立重算演算法 (Secondary Independent Re-calculation with Outlier Suppression)
    // 採用穩健調和微元重算 (Robust Harmonic Slicing Recalculation)
    const reLane1 = computeAlternativeRobustTrajectory(detectors, direction, 0);
    const reLane2 = computeAlternativeRobustTrajectory(detectors, direction, 1);

    const reLane1Speed = reLane1.equivalentTravelSpeedKmh;
    const reLane2Speed = reLane2.equivalentTravelSpeedKmh;
    recalculatedLaneDiffKmh = Math.abs(reLane1Speed - reLane2Speed);

    // 判定：若重算後結果仍 > 20 km/h，正式判定為極端情況
    if (recalculatedLaneDiffKmh > EXTREME_DETERMINED_THRESHOLD_KMH) {
      isExtremeSituation = true;
      statusText = `極端情況確認：初算兩車道速差 ${initialLaneDiffKmh.toFixed(1)} km/h（超過 23 km/h 觸發門檻），經二次獨立重算後速差仍達 ${recalculatedLaneDiffKmh.toFixed(1)} km/h（超過 20 km/h 門檻），正式判定為極端異常分流／單線事故路況！`;
      extremeExplanation = `系統已鎖定極端路況特徵：雙車道在隧道內部出現顯著速度斷層 (速差 ${recalculatedLaneDiffKmh.toFixed(1)} km/h > 20 km/h)，可能導因於單線慢速故障車、局部施工或突發事故。下方直接展示交通部 API 原始傳輸遙測數據以供即時核對。`;
    } else {
      isExtremeSituation = false;
      statusText = `二次驗證通過：初算兩車道速差 ${initialLaneDiffKmh.toFixed(1)} km/h，經二次離群抑制重算後速差收斂至 ${recalculatedLaneDiffKmh.toFixed(1)} km/h（未超逾 20 km/h 極端門檻），判定為偶發離散雜訊已校正。`;
      extremeExplanation = `二次重算成功平滑單一感測器之離群跳動，兩車道速差回落至安全耦合區間 (${recalculatedLaneDiffKmh.toFixed(1)} km/h)。`;
    }
  } else {
    // 未達 23 km/h，常態雙車道流動
    recalculatedLaneDiffKmh = initialLaneDiffKmh;
    isExtremeSituation = false;
    statusText = `常態交通流動：兩車道初算速差 ${initialLaneDiffKmh.toFixed(1)} km/h（低於 23 km/h 二次驗證門檻），處於正常物理流動範圍。`;
  }

  return {
    triggered,
    triggerThresholdKmh: EXTREME_TRIGGER_THRESHOLD_KMH, // 23.0
    initialLaneDiffKmh: parseFloat(initialLaneDiffKmh.toFixed(2)),
    recalculatedLaneDiffKmh: parseFloat(recalculatedLaneDiffKmh.toFixed(2)),
    recalculatedThresholdKmh: EXTREME_DETERMINED_THRESHOLD_KMH, // 20.0
    isExtremeSituation,
    verificationMethod: "二次獨立多重空間插值與離群抑制重算法 (Double Robust Cross-Verification)",
    statusText,
    extremeExplanation: extremeExplanation || undefined,
    directApiDisplay: {
      receivedTimestamp,
      lane1AvgApiSpeedKmh: parseFloat(lane1AvgApiSpeed.toFixed(1)),
      lane2AvgApiSpeedKmh: parseFloat(lane2AvgApiSpeed.toFixed(1)),
      lane1ApiFlowVehPerHour: Math.round(lane1AvgFlow),
      lane2ApiFlowVehPerHour: Math.round(lane2AvgFlow),
      lane1ApiOccupancyPercent: parseFloat(lane1AvgOcc.toFixed(1)),
      lane2ApiOccupancyPercent: parseFloat(lane2AvgOcc.toFixed(1)),
      totalVdStations,
      vdReadings,
    },
  };
}
