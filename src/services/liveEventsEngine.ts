/**
 * TDX 國道即時道路事件資料解析與即時通報模組 (TDX Live Event Parser & Corridor Monitor)
 *
 * 嚴格資料結構與解析路徑規範：
 * 1. 目標事件清單位於 JSON 根目錄的 LiveEvents 陣列中。
 *    - 若 LiveEvents 為空陣列或不存在，代表目前無事件，直接結束運算並回傳無事件狀態。
 * 2. 關鍵欄位提取規則（嚴格對應）：
 *    - 事件描述：LiveEvents[].Description
 *    - 國道名稱：LiveEvents[].Location.FreeExpressHighway.Road
 *    - 方向：LiveEvents[].Location.FreeExpressHighway.Direction
 *    - 起始里程：LiveEvents[].Location.FreeExpressHighway.StartKM
 *    - 結束里程：LiveEvents[].Location.FreeExpressHighway.EndKM
 *    - 影響程度：LiveEvents[].Impact.Severity
 *    - 車道封閉狀況：LiveEvents[].Impact.BlockedLanes
 * 3. 演算法對接限制：
 *    - 提取出上述變數後，將「起始里程 (StartKM)」與「國道名稱 (Road)」作為輸入條件代入核心演算法。
 *    - 絕對禁止擅自猜測未列在 JSON 中的屬性。
 *    - 輸出格式維持系統最高原則所定義的 JSON 結構。
 * 4. 監控範圍與通知：
 *    - 當事件位於 14.0 KM 至 29.0 KM 區間（雪山隧道主線及前後關鍵管制走廊）時，觸發即時警報訊息通報 (Message Alert)。
 * 5. 背景定時執行：
 *    - 每 5 分鐘 (300,000 ms) 自動於背景排程輪詢一次。
 * 6. 提供德文交通示範案例 (German Traffic Example: Autobahn Ereignis) 用於測試與驗證。
 */

export interface TdxRawLiveEventItem {
  EventID?: string;
  Description?: string;
  Location?: {
    FreeExpressHighway?: {
      Road?: string;
      Direction?: string;
      StartKM?: number | string;
      EndKM?: number | string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  Impact?: {
    Severity?: string | number;
    BlockedLanes?: string | string[];
    [key: string]: any;
  };
  [key: string]: any;
}

export interface TdxLiveEventsRootPayload {
  UpdateTime?: string;
  UpdateInterval?: number;
  SrcUpdateTime?: string;
  LiveEvents?: TdxRawLiveEventItem[];
  [key: string]: any;
}

export interface ExtractedLiveEvent {
  description: string;
  road: string;
  direction: string;
  startKm: number;
  endKm: number;
  severity: string;
  blockedLanes: string;
  isInHsuehshanCorridor14to29Km: boolean; // 是否在 14~29km 監控範圍內
  messageAlertFormatted: string; // 訊息化通報文字
}

export interface LiveEventAlgorithmResult {
  hasEvents: boolean;
  status: "NO_EVENTS" | "EVENTS_ACTIVE";
  totalEventsFound: number;
  corridorEventsCount: number; // 位於 14~29km 的事件數量
  extractedEvents: ExtractedLiveEvent[];
  algorithmFeedInputs: {
    road: string;
    startKm: number;
    endKm: number;
    matchedSegmentIndex?: number;
  }[];
  corridorAlertMessages: string[];
  executionTimestamp: string;
}

/**
 * 德文交通示範案例 (German Traffic Example: Störungsmeldung auf Autobahn)
 * 模擬德國 Autobahn A8 / A99 道路事件標準格式對應之 JSON
 */
export const GERMAN_TRAFFIC_EXAMPLE_PAYLOAD: TdxLiveEventsRootPayload = {
  UpdateTime: new Date().toISOString(),
  UpdateInterval: 300,
  SrcUpdateTime: new Date().toISOString(),
  LiveEvents: [
    {
      EventID: "DE-BY-A8-KM18-001",
      Description: "Verkehrsunfall im Tunnelbereich Hsuehshan (A8/國道5號), stockender Verkehr und Bergungsarbeiten.",
      Location: {
        FreeExpressHighway: {
          Road: "國道5號 (A8 Korridor)",
          Direction: "S",
          StartKM: 18.5,
          EndKM: 19.2,
        },
      },
      Impact: {
        Severity: "Schwer (嚴重影響 / Heavy)",
        BlockedLanes: "Rechter Fahrstreifen gesperrt (外側車道封閉)",
      },
    },
    {
      EventID: "DE-BY-A99-KM24-002",
      Description: "Pannenfahrzeug auf dem Standstreifen, verengte Fahrbahn bei KM 24.8.",
      Location: {
        FreeExpressHighway: {
          Road: "國道5號 (A99 Korridor)",
          Direction: "S",
          StartKM: 24.8,
          EndKM: 25.0,
        },
      },
      Impact: {
        Severity: "Mittel (中度影響 / Moderate)",
        BlockedLanes: "Standstreifen blockiert (路肩佔用)",
      },
    },
  ],
};

/**
 * 嚴格解析 TDX 國道即時事件 JSON
 */
export function parseTdxLiveEventsJson(
  payload: TdxLiveEventsRootPayload | null | undefined
): LiveEventAlgorithmResult {
  const timestamp = new Date().toISOString();

  // 1. 資料結構定位：目標事件清單位於根目錄 LiveEvents 陣列中
  if (!payload || !Array.isArray(payload.LiveEvents) || payload.LiveEvents.length === 0) {
    return {
      hasEvents: false,
      status: "NO_EVENTS",
      totalEventsFound: 0,
      corridorEventsCount: 0,
      extractedEvents: [],
      algorithmFeedInputs: [],
      corridorAlertMessages: [],
      executionTimestamp: timestamp,
    };
  }

  const extractedEvents: ExtractedLiveEvent[] = [];
  const algorithmFeedInputs: { road: string; startKm: number; endKm: number; matchedSegmentIndex?: number }[] = [];
  const corridorAlertMessages: string[] = [];

  for (const item of payload.LiveEvents) {
    // 2. 關鍵欄位提取規則（嚴格對應路徑，不擅自猜測未列在 JSON 中的屬性）
    const description = item.Description ?? "";
    const road = item.Location?.FreeExpressHighway?.Road ?? "";
    const direction = item.Location?.FreeExpressHighway?.Direction ?? "";
    
    // 解析里程數 (StartKM, EndKM)
    const rawStartKm = item.Location?.FreeExpressHighway?.StartKM;
    const rawEndKm = item.Location?.FreeExpressHighway?.EndKM;

    const startKm =
      typeof rawStartKm === "number"
        ? rawStartKm
        : typeof rawStartKm === "string"
        ? parseFloat(rawStartKm) || 0
        : 0;

    const endKm =
      typeof rawEndKm === "number"
        ? rawEndKm
        : typeof rawEndKm === "string"
        ? parseFloat(rawEndKm) || startKm
        : startKm;

    const severity =
      item.Impact?.Severity !== undefined && item.Impact?.Severity !== null
        ? String(item.Impact.Severity)
        : "未標註";

    const rawBlockedLanes = item.Impact?.BlockedLanes;
    const blockedLanes = Array.isArray(rawBlockedLanes)
      ? rawBlockedLanes.join(", ")
      : rawBlockedLanes !== undefined && rawBlockedLanes !== null
      ? String(rawBlockedLanes)
      : "無車道封閉";

    // 判斷是否位於 14 km 至 29 km 關鍵通報走廊內
    const isInHsuehshanCorridor14to29Km =
      (startKm >= 14.0 && startKm <= 29.0) ||
      (endKm >= 14.0 && endKm <= 29.0) ||
      (startKm <= 14.0 && endKm >= 29.0);

    // 訊息化格式文字 (Message Alert)
    const dirLabel = direction === "S" ? "南向 (往宜蘭)" : direction === "N" ? "北向 (往台北)" : direction;
    const messageAlertFormatted = `【國道即時事件通報】${road} ${dirLabel} ${startKm.toFixed(1)}K ~ ${endKm.toFixed(
      1
    )}K 發生事件：${description}。影響等級：${severity}，車道狀況：${blockedLanes}。`;

    extractedEvents.push({
      description,
      road,
      direction,
      startKm,
      endKm,
      severity,
      blockedLanes,
      isInHsuehshanCorridor14to29Km,
      messageAlertFormatted,
    });

    // 3. 演算法對接限制：將「起始里程 (StartKM)」與「國道名稱 (Road)」作為輸入條件
    // 代入 20 微元切片定位 (15.2K ~ 28.1K)
    let matchedSegmentIndex: number | undefined = undefined;
    if (startKm >= 15.2 && startKm <= 28.3) {
      // 依 20 微元 (每片 0.65485km) 換算受影響切片
      matchedSegmentIndex = Math.min(19, Math.max(0, Math.floor((startKm - 15.2) / 0.65485)));
    }

    algorithmFeedInputs.push({
      road,
      startKm,
      endKm,
      matchedSegmentIndex,
    });

    if (isInHsuehshanCorridor14to29Km) {
      corridorAlertMessages.push(messageAlertFormatted);
    }
  }

  return {
    hasEvents: extractedEvents.length > 0,
    status: extractedEvents.length > 0 ? "EVENTS_ACTIVE" : "NO_EVENTS",
    totalEventsFound: extractedEvents.length,
    corridorEventsCount: corridorAlertMessages.length,
    extractedEvents,
    algorithmFeedInputs,
    corridorAlertMessages,
    executionTimestamp: timestamp,
  };
}
