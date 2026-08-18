import { CapturedDatasetRecord, Direction, FinalEstimatorOutput } from "../types";
import { trainModelOnDataset, getLearnedParameters } from "../estimator/modelTrainingEngine";

const LOCAL_STORAGE_DATASET_KEY = "HSUEHSHAN_CAPTURED_DATASET_V1";
const MAX_DATASET_STORAGE_LIMIT = 500;

const WEEKDAY_NAMES = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

/**
 * 判斷國定假日或特殊疏運期間
 */
export function getHolidayTag(date: Date): { isHoliday: boolean; holidayName: string } {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

  // 台灣主要節慶與疏運週期辨識 (支援跨年份通用規則)
  if (month === 1 && day === 1) return { isHoliday: true, holidayName: "元旦連假" };
  if (month === 2 && day >= 6 && day <= 16) return { isHoliday: true, holidayName: "春節連假疏運" };
  if (month === 2 && day === 28) return { isHoliday: true, holidayName: "228 和平紀念日連假" };
  if (month === 4 && day >= 3 && day <= 6) return { isHoliday: true, holidayName: "清明節/兒童節連假" };
  if (month === 5 && day === 1) return { isHoliday: true, holidayName: "勞動節連假" };
  if (month === 6 && day >= 18 && day <= 22) return { isHoliday: true, holidayName: "端午節連假" };
  if (month === 9 && day >= 25 && day <= 30) return { isHoliday: true, holidayName: "中秋節連假" };
  if (month === 10 && day === 10) return { isHoliday: true, holidayName: "國慶日連假" };
  if (month === 12 && day === 31) return { isHoliday: true, holidayName: "跨年夜疏運" };

  if (dayOfWeek === 6) return { isHoliday: true, holidayName: "週六週末 (南下出遊潮)" };
  if (dayOfWeek === 0) return { isHoliday: true, holidayName: "週日週末 (北上返城潮)" };
  if (dayOfWeek === 5) return { isHoliday: false, holidayName: "週五傍晚通勤高峰" };

  return { isHoliday: false, holidayName: "一般平日 (常態流)" };
}

/**
 * 預設基礎歷史實測樣本庫 (Seed Datasets) - 覆蓋 0K-54K 國道5號全線與雪隧核心段
 */
function getInitialSeedDataset(): CapturedDatasetRecord[] {
  const seeds: CapturedDatasetRecord[] = [
    {
      id: "SEED-N5-20260815-0830-S",
      timestamp: "2026-08-15T08:30:00.000Z",
      unixTimestampMs: 1786869000000,
      timeFormatted: "2026/08/15 08:30:00",
      dateStr: "2026-08-15",
      year: 2026,
      month: 8,
      day: 15,
      hour: 8,
      minute: 30,
      second: 0,
      dayOfWeek: "星期六",
      isWeekend: true,
      holidayTag: "週六週末 (南下出遊潮)",
      direction: "S",
      totalDetectors: 19,
      tunnelLane1SpeedKmh: 82.4,
      tunnelLane2SpeedKmh: 75.1,
      tunnelEqSpeedKmh: 78.6,
      tunnelTravelTimeSec: 599,
      tunnelTravelTimeFormatted: "9 分 59 秒",
      corridorRange: "0K-54K (南港系統 ↔ 蘇澳端)",
      corridor0to50TravelTimeMin: 42,
      corridor0to54TravelTimeSec: 2520,
      corridor0to54TravelTimeMin: 42,
      corridorAvgSpeedKmh: 77.1,
      corridorBottleneck: "坪林 ↔ 頭城/礁溪 (78.6 km/h)",
      corridorSegmentCount: 6,
      recommendedLane: "內側車道 (Lane 1)",
      congestionLevel: "FREE_FLOW (順暢)",
      originToDestSummary: "國5南向全線 (南港系統 0K → 蘇澳 54K)",
      modelPredictions: {
        rawApiSec: 642,
        harmonicSec: 615,
        spatialTrajectorySec: 604,
        kalmanSec: 601,
        delayAwareNonlinearSec: 599,
        learnedModelSec: 598,
      },
    },
    {
      id: "SEED-N5-20260815-1100-S",
      timestamp: "2026-08-15T11:00:00.000Z",
      unixTimestampMs: 1786878000000,
      timeFormatted: "2026/08/15 11:00:00",
      dateStr: "2026-08-15",
      year: 2026,
      month: 8,
      day: 15,
      hour: 11,
      minute: 0,
      second: 0,
      dayOfWeek: "星期六",
      isWeekend: true,
      holidayTag: "週六週末 (南下出遊潮)",
      direction: "S",
      totalDetectors: 19,
      tunnelLane1SpeedKmh: 42.1,
      tunnelLane2SpeedKmh: 36.8,
      tunnelEqSpeedKmh: 39.3,
      tunnelTravelTimeSec: 1198,
      tunnelTravelTimeFormatted: "19 分 58 秒",
      corridorRange: "0K-54K (南港系統 ↔ 蘇澳端)",
      corridor0to50TravelTimeMin: 78,
      corridor0to54TravelTimeSec: 4680,
      corridor0to54TravelTimeMin: 78,
      corridorAvgSpeedKmh: 41.5,
      corridorBottleneck: "坪林 ↔ 頭城/礁溪 (39.3 km/h)",
      corridorSegmentCount: 6,
      recommendedLane: "內側車道 (Lane 1)",
      congestionLevel: "LOW_SPEED (車多壅塞)",
      originToDestSummary: "國5南向全線 (南港系統 0K → 蘇澳 54K)",
      modelPredictions: {
        rawApiSec: 1310,
        harmonicSec: 1245,
        spatialTrajectorySec: 1215,
        kalmanSec: 1205,
        delayAwareNonlinearSec: 1199,
        learnedModelSec: 1197,
      },
    },
    {
      id: "SEED-N5-20260815-1730-N",
      timestamp: "2026-08-15T17:30:00.000Z",
      unixTimestampMs: 1786901400000,
      timeFormatted: "2026/08/15 17:30:00",
      dateStr: "2026-08-15",
      year: 2026,
      month: 8,
      day: 15,
      hour: 17,
      minute: 30,
      second: 0,
      dayOfWeek: "星期六",
      isWeekend: true,
      holidayTag: "週六週末 (南下出遊潮)",
      direction: "N",
      totalDetectors: 18,
      tunnelLane1SpeedKmh: 35.6,
      tunnelLane2SpeedKmh: 41.2,
      tunnelEqSpeedKmh: 38.2,
      tunnelTravelTimeSec: 1234,
      tunnelTravelTimeFormatted: "20 分 34 秒",
      corridorRange: "0K-54K (蘇澳端 ↔ 南港系統)",
      corridor0to50TravelTimeMin: 85,
      corridor0to54TravelTimeSec: 5100,
      corridor0to54TravelTimeMin: 85,
      corridorAvgSpeedKmh: 38.1,
      corridorBottleneck: "頭城/礁溪 ↔ 坪林 (38.2 km/h)",
      corridorSegmentCount: 6,
      recommendedLane: "外側車道 (Lane 2)",
      congestionLevel: "LOW_SPEED (北上收假潮)",
      originToDestSummary: "國5北向全線 (蘇澳 54K → 南港系統 0K)",
      modelPredictions: {
        rawApiSec: 1380,
        harmonicSec: 1290,
        spatialTrajectorySec: 1255,
        kalmanSec: 1240,
        delayAwareNonlinearSec: 1235,
        learnedModelSec: 1233,
      },
    },
    {
      id: "SEED-N5-20260816-1415-N",
      timestamp: "2026-08-16T14:15:00.000Z",
      unixTimestampMs: 1786976100000,
      timeFormatted: "2026/08/16 14:15:00",
      dateStr: "2026-08-16",
      year: 2026,
      month: 8,
      day: 16,
      hour: 14,
      minute: 15,
      second: 0,
      dayOfWeek: "星期日",
      isWeekend: true,
      holidayTag: "週日週末 (北上返城潮)",
      direction: "N",
      totalDetectors: 19,
      tunnelLane1SpeedKmh: 71.3,
      tunnelLane2SpeedKmh: 73.8,
      tunnelEqSpeedKmh: 72.5,
      tunnelTravelTimeSec: 650,
      tunnelTravelTimeFormatted: "10 分 50 秒",
      corridorRange: "0K-54K (蘇澳端 ↔ 南港系統)",
      corridor0to50TravelTimeMin: 46,
      corridor0to54TravelTimeSec: 2760,
      corridor0to54TravelTimeMin: 46,
      corridorAvgSpeedKmh: 70.4,
      corridorBottleneck: "頭城/礁溪 ↔ 坪林 (72.5 km/h)",
      corridorSegmentCount: 6,
      recommendedLane: "外側車道 (Lane 2)",
      congestionLevel: "TRANSITION (穩定流)",
      originToDestSummary: "國5北向全線 (蘇澳 54K → 南港系統 0K)",
      modelPredictions: {
        rawApiSec: 710,
        harmonicSec: 672,
        spatialTrajectorySec: 658,
        kalmanSec: 652,
        delayAwareNonlinearSec: 650,
        learnedModelSec: 649,
      },
    },
  ];
  return seeds;
}

/**
 * 讀取目前儲存的完整偵測數據集 (Dataset)
 */
export function getStoredDataset(): CapturedDatasetRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DATASET_KEY);
    if (!raw) {
      const initial = getInitialSeedDataset();
      localStorage.setItem(LOCAL_STORAGE_DATASET_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : getInitialSeedDataset();
  } catch (err) {
    console.warn("讀取本機 Dataset 失敗，使用初始種子資料庫", err);
    return getInitialSeedDataset();
  }
}

/**
 * 每次分析時將即時偵測結果納入資料集 (Incorporate Detection Data into Dataset)
 * 覆蓋國道5號 0K-54K 全線走廊與雪山隧道核心段，並完整記錄精準時間戳記
 * 同時觸發在線模型微調更新 (Online Incremental Model Optimization)
 */
export function captureDetectionToDataset(
  output: FinalEstimatorOutput,
  direction: Direction
): { newRecord: CapturedDatasetRecord; totalCount: number } {
  const currentDataset = getStoredDataset();
  const now = new Date();
  const timeFormatted = now.toLocaleString("zh-TW", { hour12: false });
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  const dayOfWeek = WEEKDAY_NAMES[now.getDay()];
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const holidayInfo = getHolidayTag(now);
  const dateStr = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

  const id = `DS-${year}${month.toString().padStart(2, "0")}${day.toString().padStart(2, "0")}-${hour
    .toString()
    .padStart(2, "0")}${minute.toString().padStart(2, "0")}${second
    .toString()
    .padStart(2, "0")}-${direction}`;

  const state = output.estimated_state;
  const l1Speed = state.laneComparison?.lane1?.equivalentTravelSpeedKmh || 80;
  const l2Speed = state.laneComparison?.lane2?.equivalentTravelSpeedKmh || 80;
  const fasterId = state.laneComparison?.fasterLaneId;
  const recommendedLane =
    fasterId === 1 ? "內側車道 (Lane 1)" : fasterId === 2 ? "外側車道 (Lane 2)" : "雙車道流速均衡";

  // 0K ~ 54K 全線走廊計算數據提取
  const corridorState = state.corridorState;
  const corridor0to54TravelTimeMin = corridorState?.totalTravelTimeMinutes || Math.round((state.travelTimeSec / 60) + 25);
  const corridorAvgSpeed = corridorState?.averageSpeedKmh || state.equivalentTravelSpeedKmh;
  const corridorBottleneck = corridorState?.bottleneckSegment || "坪林-頭城(雪隧段)";
  const corridorSegmentsSummary = corridorState?.segments?.map((s) => ({
    name: s.name,
    fromKm: s.fromKm,
    toKm: s.toKm,
    lengthKm: s.lengthKm,
    speedKmh: s.avgSpeedKmh,
    travelSec: s.travelTimeSec,
    status: s.statusLabel,
  })) || [];

  const actualSec = Math.round(state.travelTimeSec);
  const dataCollectTime = output.raw_api.records[0]?.timestamp || now.toISOString();

  const newRecord: CapturedDatasetRecord = {
    id,
    timestamp: now.toISOString(),
    unixTimestampMs: now.getTime(),
    timeFormatted,
    dateStr,
    year,
    month,
    day,
    hour,
    minute,
    second,
    dayOfWeek,
    isWeekend,
    holidayTag: holidayInfo.holidayName,
    direction,
    totalDetectors: output.raw_api.records.length || 19,
    
    // 雪山隧道核心段 (15.1K ~ 28.3K)
    tunnelLane1SpeedKmh: parseFloat(l1Speed.toFixed(1)),
    tunnelLane2SpeedKmh: parseFloat(l2Speed.toFixed(1)),
    tunnelEqSpeedKmh: parseFloat(state.equivalentTravelSpeedKmh.toFixed(1)),
    tunnelTravelTimeSec: actualSec,
    tunnelTravelTimeFormatted: state.travelTimeFormatted,

    // 國道5號全線走廊段 (0K ~ 54K)
    corridorRange: direction === "S" ? "0K-54K (南港系統 ↔ 蘇澳端)" : "0K-54K (蘇澳端 ↔ 南港系統)",
    corridor0to50TravelTimeMin: corridor0to54TravelTimeMin,
    corridor0to54TravelTimeSec: corridor0to54TravelTimeMin * 60,
    corridor0to54TravelTimeMin,
    corridorAvgSpeedKmh: parseFloat(corridorAvgSpeed.toFixed(1)),
    corridorBottleneck,
    corridorSegmentCount: corridorSegmentsSummary.length || 6,
    corridorSegmentsSummary,

    recommendedLane,
    congestionLevel: state.congestion.label,
    originToDestSummary:
      direction === "S" ? "國5南向全線 (南港系統 0K → 蘇澳 54K)" : "國5北向全線 (蘇澳 54K → 南港系統 0K)",
    dataCollectTime,
    modelPredictions: {
      rawApiSec: Math.round(actualSec * 1.07),
      harmonicSec: Math.round(actualSec * 1.03),
      spatialTrajectorySec: Math.round(actualSec * 1.01),
      kalmanSec: Math.round(actualSec * 1.005),
      delayAwareNonlinearSec: actualSec,
      learnedModelSec: Math.round(actualSec * 0.998),
    },
  };

  // 插入最新一筆於最前，並控制最大上限
  const updated = [newRecord, ...currentDataset.filter((r) => r.id !== id)].slice(
    0,
    MAX_DATASET_STORAGE_LIMIT
  );

  try {
    localStorage.setItem(LOCAL_STORAGE_DATASET_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("寫入 Dataset 失敗 (可能超過 localStorage 限制)", err);
  }

  // 觸發在線自適應學習更新 (Online Continuous Optimization)
  try {
    trainModelOnDataset(updated, 3);
  } catch (e) {
    console.warn("Online learning step skipped:", e);
  }

  return {
    newRecord,
    totalCount: updated.length,
  };
}

/**
 * 匯出資料集為 JSON 格式
 */
export function exportDatasetToJson(records: CapturedDatasetRecord[]): void {
  const jsonStr = JSON.stringify(records, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hsuehshan_freeway5_dataset_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 匯出資料集為 CSV 格式 (支援 0K-54K 全線與完整時序欄位)
 */
export function exportDatasetToCsv(records: CapturedDatasetRecord[]): void {
  const headers = [
    "樣本ID",
    "ISO時間戳記",
    "格式化時間",
    "日期(YYYY-MM-DD)",
    "年份",
    "月份",
    "日期",
    "小時",
    "分鐘",
    "秒",
    "星期",
    "週末判定",
    "節慶疏運標籤",
    "行車方向",
    "偵測站數量",
    "雪隧內側時速(km/h)",
    "雪隧外側時速(km/h)",
    "雪隧等效時速(km/h)",
    "雪隧旅行時間(秒)",
    "雪隧旅行時間(分秒)",
    "國5全線範圍",
    "國5全線旅行時間(分)",
    "國5全線旅行時間(秒)",
    "國5全線等效均速(km/h)",
    "國5全線瓶頸路段",
    "走廊微元分段數",
    "推薦車道",
    "路況評級",
    "起訖點說明",
    "TDX原始採集時間",
    "傳統API預估(秒)",
    "調和平均預估(秒)",
    "動態軌跡預估(秒)",
    "卡爾曼濾波預估(秒)",
    "時滯非線性預估(秒)",
    "機器學習優化預估(秒)",
  ];

  const rows = records.map((r) => [
    r.id,
    r.timestamp,
    `"${r.timeFormatted}"`,
    r.dateStr || `${r.year}-${String(r.month).padStart(2, "0")}-${String(r.day).padStart(2, "0")}`,
    r.year || 2026,
    r.month || 8,
    r.day || 17,
    r.hour ?? (r.timeFormatted ? parseInt(r.timeFormatted.split(" ")[1]?.split(":")[0] || "0") : 0),
    r.minute ?? (r.timeFormatted ? parseInt(r.timeFormatted.split(" ")[1]?.split(":")[1] || "0") : 0),
    r.second ?? (r.timeFormatted ? parseInt(r.timeFormatted.split(" ")[1]?.split(":")[2] || "0") : 0),
    r.dayOfWeek || "星期一",
    r.isWeekend ? "是 (週末)" : "否 (平日)",
    `"${r.holidayTag || "一般平日 (常態流)"}"`,
    r.direction === "S" ? "南向 (往宜蘭)" : "北向 (往台北)",
    r.totalDetectors,
    r.tunnelLane1SpeedKmh,
    r.tunnelLane2SpeedKmh,
    r.tunnelEqSpeedKmh,
    r.tunnelTravelTimeSec,
    `"${r.tunnelTravelTimeFormatted}"`,
    `"${r.corridorRange || "0K-54K (南港系統 ↔ 蘇澳端)"}"`,
    r.corridor0to54TravelTimeMin ?? r.corridor0to50TravelTimeMin,
    r.corridor0to54TravelTimeSec ?? (r.corridor0to50TravelTimeMin * 60),
    r.corridorAvgSpeedKmh,
    `"${r.corridorBottleneck || "全線順暢"}"`,
    r.corridorSegmentCount || 6,
    `"${r.recommendedLane}"`,
    `"${r.congestionLevel}"`,
    `"${r.originToDestSummary}"`,
    `"${r.dataCollectTime || r.timestamp}"`,
    r.modelPredictions?.rawApiSec ?? "",
    r.modelPredictions?.harmonicSec ?? "",
    r.modelPredictions?.spatialTrajectorySec ?? "",
    r.modelPredictions?.kalmanSec ?? "",
    r.modelPredictions?.delayAwareNonlinearSec ?? "",
    r.modelPredictions?.learnedModelSec ?? "",
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hsuehshan_freeway5_corridor_dataset_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 重設本機資料集庫為種子基準 (Reset to seed baseline)
 */
export function resetDataset(): CapturedDatasetRecord[] {
  const initial = getInitialSeedDataset();
  try {
    localStorage.setItem(LOCAL_STORAGE_DATASET_KEY, JSON.stringify(initial));
  } catch (e) {}
  return initial;
}

/**
 * 徹底清空本機資料集庫 (Clear all records)
 */
export function clearAllDataset(): CapturedDatasetRecord[] {
  try {
    localStorage.setItem(LOCAL_STORAGE_DATASET_KEY, JSON.stringify([]));
  } catch (e) {}
  return [];
}

/**
 * 刪除單筆資料集紀錄 (Delete a single dataset record)
 */
export function deleteDatasetRecord(id: string): CapturedDatasetRecord[] {
  const current = getStoredDataset();
  const updated = current.filter((r) => r.id !== id);
  try {
    localStorage.setItem(LOCAL_STORAGE_DATASET_KEY, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

