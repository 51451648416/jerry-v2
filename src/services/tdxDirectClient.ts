/**
 * TDX Direct Official API Client (前端直連交通部 TDX 官方 API 模組)
 * 
 * 解決痛點：
 * 專案部署至 Vercel 或純前端靜態主機時，缺乏後端 /api/tdx/... 代理路由會返回 HTML 404，
 * 導致前端 JSON 解析時發生 "Unexpected token '<', '<!doctype '... is not valid JSON" 崩潰。
 * 
 * 核心規範：
 * 1. 移除內部 /api/tdx/... 依賴，改為前端直接向 TDX 官方端點發送請求。
 * 2. Token 端點 (POST, application/x-www-form-urlencoded):
 *    https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token
 *    參數: grant_type=client_credentials, client_id, client_secret
 * 3. 國道 5 號即時車流端點 (GET, Bearer Token):
 *    https://tdx.transportdata.tw/api/basic/v2/Road/Traffic/Live/VD/Freeway?$filter=startswith(VDID,%20%27VD-N5%27)&$format=JSON
 * 4. 國道 5 號即時事件端點 (GET, Bearer Token):
 *    https://tdx.transportdata.tw/api/basic/v2/Road/Traffic/Live/LiveEvent/Freeway?$filter=contains(Location/FreeExpressHighway/Road,%20%27國道5號%27)&$format=JSON
 * 5. 防呆防崩潰機制：
 *    在執行 JSON 解析前，嚴格檢驗 res.ok 與 res.headers.get('content-type')。
 *    若非 JSON 或狀態碼非 200，提供友善捕獲與清晰提示，絕不執行 res.json() 避免拋出語法崩潰。
 * 6. 金鑰管理支援：優先讀取 LocalStorage，其次環境變數 (VITE_TDX_CLIENT_ID / TDX_CLIENT_ID)，最後使用備用輪轉金鑰。
 */

import { globalTdxKeyManager, TdxKeyPair } from "./tdxKeyRotator";
import { TdxLiveEventsRootPayload, parseTdxLiveEventsJson, LiveEventAlgorithmResult } from "./liveEventsEngine";

export const TDX_OFFICIAL_AUTH_URL =
  "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token";

export const TDX_OFFICIAL_FREEWAY_VD_URL =
  "https://tdx.transportdata.tw/api/basic/v2/Road/Traffic/Live/VD/Freeway?$filter=startswith(VDID,%20%27VD-N5%27)&$format=JSON";

export const TDX_OFFICIAL_FREEWAY_LIVE_EVENTS_URL =
  "https://tdx.transportdata.tw/api/basic/v2/Road/Traffic/Live/LiveEvent/Freeway?$filter=contains(Location/FreeExpressHighway/Road,%20%27國道5號%27)&$format=JSON";

/**
 * 安全防呆 HTTP 請求函式 (Safe Defensive Fetch)
 * 預先驗證狀態碼與 Content-Type，絕不直接對 HTML 執行 res.json()
 */
export async function safeFetchJson<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (netErr: any) {
    throw new Error(`網路連線中斷或 CORS 限制，無法發送請求至端點：${netErr.message || "連線逾時"}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.toLowerCase().includes("application/json") || contentType.toLowerCase().includes("json");

  // 若狀態碼非 200-299 成功區間
  if (!response.ok) {
    let errorDetail = "";
    if (isJson) {
      try {
        const errorJson = await response.json();
        errorDetail =
          errorJson.error_description ||
          errorJson.error ||
          errorJson.message ||
          JSON.stringify(errorJson);
      } catch {
        errorDetail = `HTTP ${response.status} ${response.statusText}`;
      }
    } else {
      // 讀取前 200 字元字串摘要，避免 HTML 標籤直接噴進報錯
      const rawText = await response.text().catch(() => "");
      if (rawText.includes("<!DOCTYPE") || rawText.includes("<html") || rawText.includes("404")) {
        errorDetail = `端點回傳 HTML 頁面 (可能是 404 或代理路由不存在)，非 API 資料。狀態碼：HTTP ${response.status}`;
      } else {
        errorDetail = rawText.substring(0, 150) || `HTTP ${response.status} ${response.statusText}`;
      }
    }

    throw new Error(`TDX 官方伺服器回應錯誤 (HTTP ${response.status}): ${errorDetail}`);
  }

  // 狀態碼 200 但非 JSON 格式防呆
  if (!isJson) {
    const rawText = await response.text().catch(() => "");
    if (rawText.trim().startsWith("<") || rawText.includes("<!doctype")) {
      throw new Error(
        `伺服器回應 HTML 頁面而非 JSON 格式 (Content-Type: ${contentType})。請確認 API 網址是否正確。`
      );
    }
    // 嘗試解析純文字中的 JSON
    try {
      return JSON.parse(rawText) as T;
    } catch {
      throw new Error(
        `伺服器回傳格式不符 (Content-Type: ${contentType})，無法解析為 JSON 資料。`
      );
    }
  }

  // 安全讀取 JSON
  try {
    const data = (await response.json()) as T;
    return data;
  } catch (jsonErr: any) {
    throw new Error(`JSON 解析失敗: ${jsonErr.message}`);
  }
}

/**
 * 取得當前有效的金鑰資訊 (優先讀取 LocalStorage，其次環境變數，最後使用內建輪轉池)
 */
export function getActiveCredentials(): { clientId: string; clientSecret: string; source: string } {
  // 1. 優先讀取 LocalStorage
  if (typeof window !== "undefined" && window.localStorage) {
    const localId = localStorage.getItem("TDX_CLIENT_ID");
    const localSecret = localStorage.getItem("TDX_CLIENT_SECRET");
    if (localId && localSecret && localId.trim() && localSecret.trim()) {
      return {
        clientId: localId.trim(),
        clientSecret: localSecret.trim(),
        source: "LocalStorage (自訂金鑰)",
      };
    }
  }

  // 2. 其次讀取環境變數 (Vite import.meta.env 與 Node process.env)
  const envId =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_TDX_CLIENT_ID) ||
    (typeof process !== "undefined" && process.env?.TDX_CLIENT_ID);
  const envSecret =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_TDX_CLIENT_SECRET) ||
    (typeof process !== "undefined" && process.env?.TDX_CLIENT_SECRET);

  if (envId && envSecret && String(envId).trim() && String(envSecret).trim()) {
    return {
      clientId: String(envId).trim(),
      clientSecret: String(envSecret).trim(),
      source: "環境變數 (Environment Variables)",
    };
  }

  // 3. 使用金鑰輪轉池當前金鑰
  const activePair = globalTdxKeyManager.getActiveKeyPair();
  return {
    clientId: activePair.clientId,
    clientSecret: activePair.clientSecret,
    source: activePair.label,
  };
}

/**
 * 直接向 TDX 官方發送 Token 請求 (取得 Bearer Token)
 */
export async function fetchDirectTdxToken(
  clientId?: string,
  clientSecret?: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const creds = clientId && clientSecret
    ? { clientId, clientSecret, source: "手動指定憑證" }
    : getActiveCredentials();

  const bodyParams = new URLSearchParams();
  bodyParams.append("grant_type", "client_credentials");
  bodyParams.append("client_id", creds.clientId);
  bodyParams.append("client_secret", creds.clientSecret);

  const tokenData = await safeFetchJson<{
    access_token: string;
    token_type: string;
    expires_in: number;
  }>(TDX_OFFICIAL_AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: bodyParams.toString(),
  });

  if (!tokenData.access_token) {
    throw new Error("TDX 官方認證伺服器未回傳有效之 access_token");
  }

  return {
    accessToken: tokenData.access_token,
    expiresIn: tokenData.expires_in || 86400,
  };
}

/**
 * 直接從前端向 TDX 官方 API 抓取國道 5 號即時車流 VD 數據 (Direct Freeway VD Fetch)
 */
export async function fetchDirectFreewayVd(customUrl?: string): Promise<any> {
  const targetUrl = customUrl && customUrl.trim() ? customUrl.trim() : TDX_OFFICIAL_FREEWAY_VD_URL;

  // 使用金鑰輪轉管理器全自動獲取 Token 並支援失敗自動輪轉
  // 若使用自訂金鑰，亦直接支援
  const result = await globalTdxKeyManager.executeWithFailover<any>(targetUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  return result.data;
}

/**
 * 直接從前端向 TDX 官方 API 抓取即時事件通報 (Direct Live Events Fetch)
 */
export async function fetchDirectFreewayLiveEvents(customUrl?: string): Promise<LiveEventAlgorithmResult> {
  const targetUrl = customUrl && customUrl.trim() ? customUrl.trim() : TDX_OFFICIAL_FREEWAY_LIVE_EVENTS_URL;

  try {
    const result = await globalTdxKeyManager.executeWithFailover<TdxLiveEventsRootPayload>(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (result.data && typeof result.data === "object") {
      return parseTdxLiveEventsJson(result.data);
    }
    return parseTdxLiveEventsJson({ LiveEvents: [] });
  } catch (err: any) {
    console.warn("TDX Live Events 即時端點讀取無事件或暫時不可達，安全回傳空事件狀態：", err.message);
    return parseTdxLiveEventsJson({ LiveEvents: [] });
  }
}
