/**
 * API Route & Endpoint Alignment Configuration Service
 * (API 路由與端點名稱對齊配置服務)
 *
 * 功能：
 * 1. 支援自訂與重命名 API 端點名稱 (Endpoint Names) 與路徑 (Paths)，讓本系統能與外部其他網站/後端 API 完全對齊。
 * 2. 支援設定外部 API Base URL (例如：https://my-backend-domain.com 或同源相對路徑)。
 * 3. 支援配置自訂 Request Headers (如 Authorization: Bearer <token> 或 X-API-Key)。
 * 4. 內建即時連線測試 (Ping / Test Alignment) 工具，驗證與對方網站的資料格式相容性。
 * 5. 安全持久化儲存於 localStorage，並提供一鍵還原預設值。
 */

export interface ApiEndpointConfig {
  baseUrl: string; // 例如 "" (同源) 或 "https://api.example.com"
  freewayVdPath: string; // 預設: "/api/tdx/freeway-vd"
  freewayLiveEventsPath: string; // 預設: "/api/tdx/freeway-live-events"
  tokenPath: string; // 預設: "/api/tdx/token"
  healthPath: string; // 預設: "/api/health"
  customAuthHeaderName: string; // 預設: "Authorization"
  customAuthHeaderValue: string; // 例如: "Bearer xxx" 或自訂 Token
  customApiKeyHeaderName: string; // 例如: "X-API-Key" 或留空
  customApiKeyHeaderValue: string; // 例如: "my-key-123" 或留空
  apiAliasName: string; // 用戶為此組 API 自訂的識別名稱 (例如: "國5即時路況主服務", "第三方整合中繼站")
}

const STORAGE_KEY = "N5_CUSTOM_API_CONFIG_V1";

export const DEFAULT_API_CONFIG: ApiEndpointConfig = {
  baseUrl: "",
  freewayVdPath: "https://tdx.transportdata.tw/api/basic/v2/Road/Traffic/Live/VD/Freeway?$filter=startswith(VDID,%20%27VD-N5%27)&$format=JSON",
  freewayLiveEventsPath: "https://tdx.transportdata.tw/api/basic/v2/Road/Traffic/Live/LiveEvent/Freeway?$filter=contains(Location/FreeExpressHighway/Road,%20%27國道5號%27)&$format=JSON",
  tokenPath: "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token",
  healthPath: "/api/health",
  customAuthHeaderName: "Authorization",
  customAuthHeaderValue: "",
  customApiKeyHeaderName: "",
  customApiKeyHeaderValue: "",
  apiAliasName: "交通部 TDX 官方直連端點 (預設)",
};

/**
 * 取得當前 API 端點與命名配置
 */
export function getApiConfig(): ApiEndpointConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_API_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_API_CONFIG,
      ...parsed,
    };
  } catch (e) {
    console.warn("Failed to parse API config from localStorage, using default:", e);
    return { ...DEFAULT_API_CONFIG };
  }
}

/**
 * 儲存 API 端點與命名配置
 */
export function saveApiConfig(config: Partial<ApiEndpointConfig>): ApiEndpointConfig {
  const current = getApiConfig();
  const updated: ApiEndpointConfig = {
    ...current,
    ...config,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * 重設為預設 API 配置
 */
export function resetApiConfig(): ApiEndpointConfig {
  localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_API_CONFIG };
}

/**
 * 組合完整的 API 呼叫 URL
 */
export function getResolvedApiUrl(
  endpointKey: "freewayVd" | "freewayLiveEvents" | "token" | "health"
): string {
  const config = getApiConfig();
  let path = "";
  switch (endpointKey) {
    case "freewayVd":
      path = config.freewayVdPath || DEFAULT_API_CONFIG.freewayVdPath;
      break;
    case "freewayLiveEvents":
      path = config.freewayLiveEventsPath || DEFAULT_API_CONFIG.freewayLiveEventsPath;
      break;
    case "token":
      path = config.tokenPath || DEFAULT_API_CONFIG.tokenPath;
      break;
    case "health":
      path = config.healthPath || DEFAULT_API_CONFIG.healthPath;
      break;
  }

  // 若路徑本身已為完整絕對網址 (http:// 或 https://)，直接回傳
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const base = (config.baseUrl || "").trim().replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return base ? `${base}${normalizedPath}` : normalizedPath;
}

/**
 * 組合當前配置的 Request Headers
 */
export function getResolvedApiHeaders(): Record<string, string> {
  const config = getApiConfig();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (config.customAuthHeaderValue && config.customAuthHeaderName) {
    headers[config.customAuthHeaderName] = config.customAuthHeaderValue;
  }

  if (config.customApiKeyHeaderName && config.customApiKeyHeaderValue) {
    headers[config.customApiKeyHeaderName] = config.customApiKeyHeaderValue;
  }

  return headers;
}

/**
 * 測試特定 API 端點連線是否成功對齊
 */
export async function testApiEndpointConnection(
  endpointUrl: string,
  headers: Record<string, string> = {}
): Promise<{ success: boolean; status: number; message: string; dataPreview?: string; latencyMs: number }> {
  const startTime = Date.now();
  try {
    const res = await fetch(endpointUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...headers,
      },
    });
    const latencyMs = Date.now() - startTime;
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.toLowerCase().includes("json");

    if (!res.ok) {
      let errDetail = "";
      if (isJson) {
        try {
          const errObj = await res.json();
          errDetail = errObj.message || errObj.error_description || errObj.error || JSON.stringify(errObj);
        } catch {
          errDetail = `HTTP ${res.status} ${res.statusText}`;
        }
      } else {
        const errText = await res.text().catch(() => "");
        errDetail = errText.includes("<!DOCTYPE") || errText.includes("<html")
          ? "伺服器回應 404 HTML 頁面 (無效路由)"
          : errText.slice(0, 150);
      }
      return {
        success: false,
        status: res.status,
        message: `HTTP ${res.status} 錯誤: ${errDetail || "連線未回應"}`,
        latencyMs,
      };
    }

    if (!isJson) {
      const rawText = await res.text().catch(() => "");
      return {
        success: false,
        status: res.status,
        message: `回應非 JSON 格式 (${contentType})，請確認網址是否正確`,
        dataPreview: rawText.slice(0, 120),
        latencyMs,
      };
    }

    const data = await res.json().catch(() => null);
    const dataPreview = data ? JSON.stringify(data).slice(0, 200) + "..." : "成功收到回應";

    return {
      success: true,
      status: res.status,
      message: `連線成功！(延遲: ${latencyMs}ms)`,
      dataPreview,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const cleanErrMsg = typeof err === "object" && err ? (err.message || JSON.stringify(err)) : String(err);
    return {
      success: false,
      status: 0,
      message: cleanErrMsg || "連線失敗 (可能為跨網域 CORS 限制或主機無法連線)",
      latencyMs,
    };
  }
}
