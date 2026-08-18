import { Direction, RawApiDetectorRecord, StandardDirection, StandardVdMetadata } from "../types";
import { HSUEHSHAN_BOUNDS } from "../data/detectorConfig";

/**
 * 模組功能：車輛偵測器（VD）與里程資訊標準化解析
 * 
 * 1. 里程數轉換規則（目標：統一輸出為「浮點數公里值 mileage_km」）：
 *    - 樁號加公尺格式「XXK+YYY」：例如「15K+200」或「015K+200」計算為 15 + 200/1000 = 15.2；「28K+050」計算為 28.05。
 *    - 小數點格式「XX.YYK」或「XX.YYY」：例如「15.200」或「24.8K」直接解析為 15.2 或 24.8。
 *    - 整數樁號「XXK」：例如「024K」解析為 24.0。
 * 
 * 2. 行車方向代碼標準化（統一映射為單一標準字元）：
 *    - 北向 / 北上 / NB / N -> "N"
 *    - 南向 / 南下 / SB / S -> "S"
 *    - 東向 / 東上 / EB / E -> "E"
 *    - 西向 / 西下 / WB / W -> "W"
 *    - 若無方向資訊 -> "Unknown"
 * 
 * 3. 欄位結構化要求：
 *    - 包含欄位：route（路線名稱）、direction（方向代碼）、mileage_km（數值型公里數）、raw_mileage（原始字串）、vd_id（原始設備代碼）。
 *    - 排除無效雜訊字串（如 "-M-LOOP"、"LOOP" 等技術後綴），保留核心地理屬性。
 */
export function parseStandardVdMetadata(
  input: string | any,
  rawObj: any = {}
): StandardVdMetadata {
  const vdid =
    typeof input === "string"
      ? input.trim()
      : typeof rawObj.VDID === "string"
      ? rawObj.VDID.trim()
      : typeof rawObj.detectorId === "string"
      ? rawObj.detectorId.trim()
      : typeof rawObj.DetectorID === "string"
      ? rawObj.DetectorID.trim()
      : typeof rawObj.id === "string"
      ? rawObj.id.trim()
      : "";

  // 1. 路線名稱識別（route）
  let route = "國道5號";
  const contextStr = `${vdid} ${rawObj.RouteName || ""} ${rawObj.RoadName || ""} ${rawObj.PositionName || ""} ${rawObj.SubAuthorityCode || ""}`;
  if (/國道?3號?|N3\b/i.test(contextStr)) {
    route = "國道3號";
  } else if (/國道?1號?|N1\b/i.test(contextStr)) {
    route = "國道1號";
  } else if (/國道?5號?|N5\b/i.test(contextStr)) {
    route = "國道5號";
  }

  // 2. 行車方向代碼標準化（direction）
  let direction: StandardDirection = "Unknown";
  const explicitDir = (rawObj.Direction || rawObj.direction || "").toString().toUpperCase();
  if (explicitDir === "N" || explicitDir === "NB" || explicitDir === "NORTH" || explicitDir.includes("北")) {
    direction = "N";
  } else if (explicitDir === "S" || explicitDir === "SB" || explicitDir === "SOUTH" || explicitDir.includes("南")) {
    direction = "S";
  } else if (explicitDir === "E" || explicitDir === "EB" || explicitDir === "EAST" || explicitDir.includes("東")) {
    direction = "E";
  } else if (explicitDir === "W" || explicitDir === "WB" || explicitDir === "WEST" || explicitDir.includes("西")) {
    direction = "W";
  } else if (typeof vdid === "string") {
    // 依序精確檢查 VDID 命名規則（如 VD-N5-S-15.139-M-LOOP 或 VD-N5-N-28.134-M-LOOP）
    if (/-N-|-NB-|-N(?=[-_]|$)|北向|北上|\bNB\b/i.test(vdid)) {
      direction = "N";
    } else if (/-S-|-SB-|-S(?=[-_]|$)|南向|南下|\bSB\b/i.test(vdid)) {
      direction = "S";
    } else if (/-E-|-EB-|-E(?=[-_]|$)|東向|東上|\bEB\b/i.test(vdid)) {
      direction = "E";
    } else if (/-W-|-WB-|-W(?=[-_]|$)|西向|西下|\bWB\b/i.test(vdid)) {
      direction = "W";
    }
  }

  // 3. 里程數轉換規則（mileage_km 及 raw_mileage）
  let mileage_km = 0;
  let raw_mileage = "";

  // 若 rawObj 已有數值型 Mileage 欄位先採納
  if (typeof rawObj.Mileage === "number" && rawObj.Mileage > 0) {
    mileage_km = rawObj.Mileage;
    raw_mileage = `${rawObj.Mileage}`;
  } else if (typeof rawObj.mileageKm === "number" && rawObj.mileageKm > 0) {
    mileage_km = rawObj.mileageKm;
    raw_mileage = `${rawObj.mileageKm}`;
  } else if (typeof rawObj.Mileage === "string" && rawObj.Mileage.trim()) {
    raw_mileage = rawObj.Mileage.trim();
  }

  const strToSearch = `${raw_mileage} ${vdid} ${rawObj.PositionName || ""}`;

  // 規則 1：樁號加公尺格式「XXK+YYY」或「015K+200」
  const kPlusRegex = /(\d+)\s*[Kk]\s*\+\s*(\d+)/;
  const kPlusMatch = strToSearch.match(kPlusRegex);
  if (kPlusMatch) {
    const kmPart = parseInt(kPlusMatch[1], 10);
    const mPart = parseInt(kPlusMatch[2], 10);
    mileage_km = kmPart + mPart / 1000;
    raw_mileage = kPlusMatch[0];
  } else {
    // 國道標準 VD 命名格式：(VD-)?N5-[NSEW]-(里程數)(後綴)
    const freewaySegmentRegex = /(?:VD-)?(?:N\d+|國\d+)-[NSEW]-(\d+(?:\.\d+)?(?:[Kk])?|\d+[Kk]\+\d+)/i;
    const fwMatch = vdid.match(freewaySegmentRegex);
    if (fwMatch) {
      const seg = fwMatch[1];
      raw_mileage = seg;
      if (/[Kk]\+/i.test(seg)) {
        const parts = seg.split(/[Kk]\+/i);
        mileage_km = parseInt(parts[0], 10) + parseInt(parts[1], 10) / 1000;
      } else if (/[Kk]$/i.test(seg)) {
        mileage_km = parseFloat(seg.replace(/[Kk]$/i, ""));
      } else {
        mileage_km = parseFloat(seg);
      }
    } else {
      // 規則 2：小數點格式「XX.YYK」或「XX.YYY」例如「15.200」或「24.8K」
      const decMatch = strToSearch.match(/(\d+\.\d+)\s*([Kk])?/);
      if (decMatch) {
        mileage_km = parseFloat(decMatch[1]);
        raw_mileage = decMatch[0].trim();
      } else {
        // 規則 3：整數樁號「XXK」例如「024K」-> 24.0
        const intKMatch = strToSearch.match(/(\d+)\s*[Kk]\b/);
        if (intKMatch) {
          mileage_km = parseInt(intKMatch[1], 10);
          raw_mileage = intKMatch[0].trim();
        }
      }
    }
  }

  return {
    route,
    direction,
    mileage_km: parseFloat(mileage_km.toFixed(3)),
    raw_mileage: raw_mileage || `${mileage_km}`,
    vd_id: vdid,
  };
}

/**
 * 取得排除技術雜訊（如 -M-LOOP, -IMAGE, -LOOP）的乾淨地理描述名稱
 */
export function getCleanLocationDescription(
  vdid: string,
  mileageKm: number,
  dir: Direction
): string {
  // 移除技術後綴
  const cleanId = vdid
    .replace(/-M-LOOP|-IMAGE|-LOOP|-PS-LOOP|-PS/gi, "")
    .replace(/^VD-N5-[NS]-/i, "");

  const dirZh = dir === "S" ? "南向 (往宜蘭)" : "北向 (往台北)";
  return `國道5號 ${dirZh} ${mileageKm.toFixed(1)}K (雪山隧道 ${cleanId || `${mileageKm.toFixed(1)}K`})`;
}

/**
 * Phase 1: Robust & Standardized API Parser
 * Strictly parses raw TDX VD JSON and extracts records within
 * Snow Mountain Tunnel bounds:
 * Southbound (S): 15k+203 ～ 28k+128 (15.100 - 28.250 km for VD stations)
 * Northbound (N): 15k+179 ～ 28k+134 (15.100 - 28.450 km for VD stations)
 */
export function parseRawTdxVdPayload(
  rawJson: any,
  targetDirection: Direction
): {
  records: RawApiDetectorRecord[];
  allCorridorRecords: RawApiDetectorRecord[];
  missingFields: string[];
  totalRawItems: number;
} {
  const missingFields: string[] = [];
  const records: RawApiDetectorRecord[] = [];
  const allCorridorRecords: RawApiDetectorRecord[] = [];

  if (!rawJson) {
    missingFields.push("rawJson is null or undefined");
    return { records, allCorridorRecords, missingFields, totalRawItems: 0 };
  }

  // 支援 TDX VDLives 陣列、直接陣列與 LinkFlows 結構
  const rawList: any[] = Array.isArray(rawJson.VDLives)
    ? rawJson.VDLives
    : Array.isArray(rawJson)
    ? rawJson
    : Array.isArray(rawJson.data)
    ? rawJson.data
    : [rawJson];

  const totalRawItems = rawList.length;
  const bounds = HSUEHSHAN_BOUNDS[targetDirection];

  // 隧道實體邊界與偵測站範圍（容許起訖洞口外側 0.2km 之進出站偵測點）
  const minAllowedKm = Math.min(bounds.minKm, 15.100);
  const maxAllowedKm = Math.max(bounds.maxKm, 28.300);

  rawList.forEach((item, itemIdx) => {
    if (!item) return;

    // 使用標準化解析器提取地理屬性
    const meta = parseStandardVdMetadata(item.VDID || item.detectorId, item);
    const vdid = meta.vd_id || `VD-UNKNOWN-${itemIdx}`;
    const mileageKm = meta.mileage_km;

    // 方向過濾：只保留目標方向
    if (meta.direction !== targetDirection && meta.direction !== "Unknown") {
      return;
    }

    if (mileageKm <= 0) {
      return; // 無法識別里程數者排除
    }

    // 時間戳記
    const timestamp =
      item.DataCollectTime ||
      item.timestamp ||
      item.UpdateTime ||
      new Date().toISOString();

    // 道路區段標準名稱
    const roadSection = getCleanLocationDescription(vdid, mileageKm, targetDirection);

    // 車道數據提取
    const lanes: RawApiDetectorRecord["lanes"] = [];

    // Format A: TDX 官方標準格式 LinkFlows[0].Lanes
    if (Array.isArray(item.LinkFlows) && item.LinkFlows[0] && Array.isArray(item.LinkFlows[0].Lanes)) {
      item.LinkFlows[0].Lanes.forEach((laneObj: any, lIdx: number) => {
        let totalFlowVehPerHr = 0;
        let weightedSpeedSum = 0;
        let weightedVolumeSum = 0;
        if (Array.isArray(laneObj.Vehicles)) {
          laneObj.Vehicles.forEach((v: any) => {
            const vol = typeof v.Volume === "number" ? v.Volume : 0;
            const spd = typeof v.Speed === "number" ? v.Speed : 0;
            weightedVolumeSum += vol;
            weightedSpeedSum += vol * spd;
          });
          totalFlowVehPerHr = weightedVolumeSum * 60;
        } else if (typeof laneObj.Flow === "number") {
          totalFlowVehPerHr = laneObj.Flow;
        } else if (typeof laneObj.Volume === "number") {
          totalFlowVehPerHr = laneObj.Volume * 60;
        }

        let rawSpeed = typeof laneObj.Speed === "number" && laneObj.Speed > 0 ? laneObj.Speed : 0;
        if (rawSpeed === 0 && weightedVolumeSum > 0) {
          rawSpeed = Math.round(weightedSpeedSum / weightedVolumeSum);
        }
        const rawOcc = typeof laneObj.Occupancy === "number" ? laneObj.Occupancy : 0;

        lanes.push({
          laneId: laneObj.LaneID !== undefined ? laneObj.LaneID + 1 : lIdx + 1,
          speedKmh: rawSpeed,
          flowVehPerHour: totalFlowVehPerHr,
          occupancyPercent: rawOcc,
        });
      });
    }
    // Format B: Direct lanes array
    else if (Array.isArray(item.lanes)) {
      item.lanes.forEach((laneObj: any, lIdx: number) => {
        lanes.push({
          laneId: laneObj.laneId || laneObj.LaneID || lIdx + 1,
          speedKmh: laneObj.speedKmh || laneObj.Speed || 0,
          flowVehPerHour: laneObj.flowVehPerHour || (laneObj.Volume ? laneObj.Volume * 60 : 0),
          occupancyPercent: laneObj.occupancyPercent || laneObj.Occupancy || 0,
        });
      });
    }
    // Format C: Single aggregated detector speed/flow/occupancy
    else if (typeof item.Speed === "number" || typeof item.speed === "number") {
      const spd = typeof item.Speed === "number" ? item.Speed : item.speed;
      const occ = typeof item.Occupancy === "number" ? item.Occupancy : (item.occupancy || 0);
      const flw = typeof item.Volume === "number" ? item.Volume * 60 : (item.flow || 0);
      lanes.push({
        laneId: 1,
        speedKmh: spd,
        flowVehPerHour: flw,
        occupancyPercent: occ,
      });
    }

    if (lanes.length === 0) {
      missingFields.push(`VD [${vdid}] 無有效車道資料`);
    }

    const record: RawApiDetectorRecord = {
      detectorId: vdid,
      timestamp,
      direction: targetDirection,
      mileageKm,
      roadSection,
      route: meta.route,
      rawMileage: meta.raw_mileage,
      lanes,
      rawPayload: item,
    };

    // 全線走廊集合 (0K ~ 54K)
    if (mileageKm >= 0.0 && mileageKm <= 56.0) {
      allCorridorRecords.push(record);
    }

    // 雪山隧道核心集合 (15.1K ~ 28.3K)
    if (mileageKm >= minAllowedKm && mileageKm <= maxAllowedKm) {
      records.push(record);
    }
  });

  // 依行車行進軌跡嚴格排序
  if (targetDirection === "S") {
    records.sort((a, b) => a.mileageKm - b.mileageKm);
    allCorridorRecords.sort((a, b) => a.mileageKm - b.mileageKm);
  } else {
    records.sort((a, b) => b.mileageKm - a.mileageKm);
    allCorridorRecords.sort((a, b) => b.mileageKm - a.mileageKm);
  }

  return {
    records,
    allCorridorRecords,
    missingFields,
    totalRawItems,
  };
}
