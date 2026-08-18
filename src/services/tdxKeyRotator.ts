/**
 * TDX API Key Rotation & Failover System (精要輪流金鑰管理器)
 *
 * 核心機制：
 * 1. 支援多組 TDX Client ID 與 Client Secret (可由環境變數、配置陣列或動態擴充設定)。
 * 2. 輪流調度機制 (Round-Robin with Automatic Failover)：
 *    - 平時使用當前有效的金鑰組 (Active Key)。
 *    - 當第一組金鑰失效、達到請求頻率上限 (429/401/403/逾期) 或連線失敗時，自動輪轉切換至第二組金鑰。
 *    - 若後續組別失效，則依序推進並自動「輪轉循環 (Loop Back)」回第一組，確保服務永不中斷。
 * 3. 獨立封裝，絕不干涉或變更任何交通流物理估計、微元動態積分與既有數學運算公式。
 */

export interface TdxKeyPair {
  id: string;
  clientId: string;
  clientSecret: string;
  label: string;
  failCount: number;
  lastUsedTimestamp?: number;
  lastError?: string;
  isHealthy: boolean;
}

export interface CachedTokenEntry {
  accessToken: string;
  expiresAt: number;
  keyId: string;
}

export interface TdxKeyManagerStatus {
  totalKeys: number;
  activeKeyIndex: number;
  activeKeyLabel: string;
  activeClientIdMasked: string;
  rotationCount: number;
  lastRotationTimestamp?: string;
  lastRotationReason?: string;
  keysStatus: {
    index: number;
    label: string;
    clientIdMasked: string;
    isHealthy: boolean;
    failCount: number;
    lastError?: string;
  }[];
}

export class TdxKeyRotationSystem {
  private keyPairs: TdxKeyPair[] = [];
  private activeIndex: number = 0;
  private tokenCache: Map<string, CachedTokenEntry> = new Map();
  private rotationCount: number = 0;
  private lastRotationTimestamp?: string;
  private lastRotationReason?: string;

  constructor() {
    this.initializeKeys();
  }

  /**
   * 初始化金鑰池
   * 優先順序：
   * 1. 瀏覽器 LocalStorage (使用者透過介面自訂之 TDX_CLIENT_ID / TDX_CLIENT_SECRET)
   * 2. 瀏覽器 LocalStorage 多組陣列 (TDX_API_KEYS)
   * 3. 環境變數 (Vite import.meta.env 與 Node process.env)
   * 4. 內建備援輪轉金鑰
   */
  public initializeKeys() {
    const defaultKeys: { id: string; clientId: string; clientSecret: string; label: string }[] = [];

    // 1. 優先級 1：讀取瀏覽器 LocalStorage (用戶自訂或後台設定)
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const localId = localStorage.getItem("TDX_CLIENT_ID");
        const localSecret = localStorage.getItem("TDX_CLIENT_SECRET");
        if (localId && localSecret && localId.trim() && localSecret.trim()) {
          defaultKeys.push({
            id: "key-local-storage-primary",
            clientId: localId.trim(),
            clientSecret: localSecret.trim(),
            label: "TDX 自訂金鑰 (LocalStorage 優先)",
          });
        }

        const localKeysRaw = localStorage.getItem("TDX_API_KEYS");
        if (localKeysRaw) {
          try {
            const parsed = JSON.parse(localKeysRaw);
            if (Array.isArray(parsed)) {
              parsed.forEach((k: any, idx: number) => {
                if (k.clientId && k.clientSecret && String(k.clientId).trim() && String(k.clientSecret).trim()) {
                  defaultKeys.push({
                    id: `key-local-custom-${idx + 1}`,
                    clientId: String(k.clientId).trim(),
                    clientSecret: String(k.clientSecret).trim(),
                    label: k.label || `TDX 本機多組金鑰 ${idx + 1}`,
                  });
                }
              });
            }
          } catch {}
        }
      } catch (e) {
        console.warn("無法讀取 LocalStorage 金鑰設定:", e);
      }
    }

    // 2. 優先級 2：環境變數 (支援 Vite import.meta.env 與 Node process.env)
    const getEnvVal = (key: string): string => {
      let val = "";
      if (typeof import.meta !== "undefined" && (import.meta as any).env) {
        val = (import.meta as any).env[`VITE_${key}`] || (import.meta as any).env[key] || "";
      }
      if (!val && typeof process !== "undefined" && process.env) {
        val = process.env[key] || process.env[`VITE_${key}`] || "";
      }
      return String(val || "").trim();
    };

    const envId1 = getEnvVal("TDX_CLIENT_ID");
    const envSecret1 = getEnvVal("TDX_CLIENT_SECRET");
    if (envId1 && envSecret1 && !defaultKeys.some((k) => k.clientId === envId1)) {
      defaultKeys.push({
        id: "key-env-1",
        clientId: envId1,
        clientSecret: envSecret1,
        label: "TDX 主要環境變數金鑰",
      });
    }

    const envId2 = getEnvVal("TDX_CLIENT_ID_2");
    const envSecret2 = getEnvVal("TDX_CLIENT_SECRET_2");
    if (envId2 && envSecret2 && !defaultKeys.some((k) => k.clientId === envId2)) {
      defaultKeys.push({
        id: "key-env-2",
        clientId: envId2,
        clientSecret: envSecret2,
        label: "TDX 備用環境變數金鑰 A",
      });
    }

    const envId3 = getEnvVal("TDX_CLIENT_ID_3");
    const envSecret3 = getEnvVal("TDX_CLIENT_SECRET_3");
    if (envId3 && envSecret3 && !defaultKeys.some((k) => k.clientId === envId3)) {
      defaultKeys.push({
        id: "key-env-3",
        clientId: envId3,
        clientSecret: envSecret3,
        label: "TDX 備用環境變數金鑰 B",
      });
    }

    // 3. 內建備援公用輪轉金鑰
    const builtInDefaults = [
      {
        id: "key-builtin-primary",
        clientId: "jerry09032-f563b9b2-6af4-4437",
        clientSecret: "0b749325-d88e-4e11-9d4d-318cb6f34fbe",
        label: "TDX 系統備援金鑰 1",
      },
    ];

    for (const b of builtInDefaults) {
      if (!defaultKeys.some((k) => k.clientId === b.clientId)) {
        defaultKeys.push(b);
      }
    }

    this.keyPairs = defaultKeys.map((k) => ({
      id: k.id,
      clientId: k.clientId,
      clientSecret: k.clientSecret,
      label: k.label,
      failCount: 0,
      isHealthy: true,
    }));
  }

  /**
   * 重新載入金鑰池並清空快取 (當使用者在介面更新 LocalStorage 時調用)
   */
  public reloadKeys() {
    this.tokenCache.clear();
    this.activeIndex = 0;
    this.initializeKeys();
  }

  /**
   * 取得當前輪值中的金鑰
   */
  public getActiveKeyPair(): TdxKeyPair {
    if (this.keyPairs.length === 0) {
      this.initializeKeys();
    }
    return this.keyPairs[this.activeIndex % this.keyPairs.length];
  }

  /**
   * 將金鑰遮罩化 (保證 API Key 安全性)
   */
  private maskString(str: string): string {
    if (!str || str.length <= 8) return "********";
    return `${str.substring(0, 4)}...${str.substring(str.length - 4)}`;
  }

  /**
   * 切換並輪轉至下一組金鑰 (Round-Robin Failover Loop)
   * 依序：第1組 -> 第2組 -> 第3組 -> ... -> 輪回到第1組
   */
  public rotateToNextKey(reason: string = "連線或授權異常自動輪替"): TdxKeyPair {
    const prevIndex = this.activeIndex;
    const currentKey = this.keyPairs[prevIndex];
    currentKey.failCount += 1;
    currentKey.lastError = reason;

    // 若單一金鑰連續失敗 >= 3 次，暫時標記為異常
    if (currentKey.failCount >= 3) {
      currentKey.isHealthy = false;
    }

    // 核心循環輪轉公式：(currentIndex + 1) % keyPairs.length
    this.activeIndex = (this.activeIndex + 1) % this.keyPairs.length;
    this.rotationCount += 1;
    this.lastRotationTimestamp = new Date().toISOString();
    this.lastRotationReason = reason;

    const nextKey = this.keyPairs[this.activeIndex];

    console.warn(
      `[TDX 金鑰輪流系統] 金鑰組切換 #${this.rotationCount}：從「${currentKey.label}」(${this.maskString(
        currentKey.clientId
      )}) 輪轉切換至「${nextKey.label}」(${this.maskString(nextKey.clientId)})。原因：${reason}`
    );

    return nextKey;
  }

  /**
   * 請求指定金鑰組的 TDX Access Token
   */
  private async requestTokenForPair(pair: TdxKeyPair): Promise<string> {
    const cached = this.tokenCache.get(pair.id);
    if (cached && cached.expiresAt > Date.now() + 60000) {
      return cached.accessToken;
    }

    const authUrl = "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token";
    const requestBody = `grant_type=client_credentials&client_id=${encodeURIComponent(
      pair.clientId
    )}&client_secret=${encodeURIComponent(pair.clientSecret)}`;

    const response = await fetch(authUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: requestBody,
    });

    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.toLowerCase().includes("json");

    if (!response.ok) {
      let errText = "";
      if (isJson) {
        try {
          const errObj = await response.json();
          errText = errObj.error_description || errObj.error || errObj.message || JSON.stringify(errObj);
        } catch {
          errText = response.statusText;
        }
      } else {
        const raw = await response.text().catch(() => "");
        errText = raw.length > 200 ? raw.substring(0, 200) + "..." : raw;
      }
      throw new Error(`TDX 認證伺服器回應失敗 (${response.status}): ${errText}`);
    }

    if (!isJson) {
      const raw = await response.text().catch(() => "");
      throw new Error(`TDX 認證伺服器回傳非 JSON 資料 (Content-Type: ${contentType})：${raw.substring(0, 100)}`);
    }

    const data = await response.json();
    if (!data.access_token) {
      throw new Error("TDX 未回傳有效的 access_token");
    }

    const expiresInSec = data.expires_in || 86400;
    this.tokenCache.set(pair.id, {
      accessToken: data.access_token,
      expiresAt: Date.now() + expiresInSec * 1000,
      keyId: pair.id,
    });

    pair.isHealthy = true;
    pair.failCount = 0;
    pair.lastUsedTimestamp = Date.now();

    return data.access_token;
  }

  /**
   * 取得有效的 Access Token (具備多組金鑰自動輪轉與重試保障)
   */
  public async getValidAccessToken(): Promise<{ token: string; keyPair: TdxKeyPair }> {
    const maxAttempts = this.keyPairs.length;
    let lastError: any = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const currentPair = this.getActiveKeyPair();
      try {
        const token = await this.requestTokenForPair(currentPair);
        return { token, keyPair: currentPair };
      } catch (err: any) {
        lastError = err;
        console.error(`[TDX 金鑰輪流系統] 金鑰組「${currentPair.label}」獲取 Token 失敗：`, err.message);
        // 輪轉到下一組金鑰並重試
        this.rotateToNextKey(`Token 請求異常 (${err.message})`);
      }
    }

    throw new Error(
      `所有 TDX 金鑰組皆無法成功連線獲取 Token (共輪轉嘗試 ${maxAttempts} 組)。最後錯誤：${lastError?.message || "未知錯誤"}`
    );
  }

  /**
   * 執行帶有金鑰自動輪轉與失效切換保護的 TDX API 請求 (Failover Round-Robin Execution)
   */
  public async executeWithFailover<T>(
    endpointUrl: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: any;
    } = {}
  ): Promise<{ data: T; usedKeyPair: TdxKeyPair; attempts: number }> {
    const maxAttempts = this.keyPairs.length;
    let lastError: any = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const currentPair = this.getActiveKeyPair();
      try {
        const { token } = await this.getValidAccessToken();

        const reqHeaders = {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          ...(options.headers || {}),
        };

        const res = await fetch(endpointUrl, {
          method: options.method || "GET",
          headers: reqHeaders,
          body: options.body,
        });

        const contentType = res.headers.get("content-type") || "";
        const isJson = contentType.toLowerCase().includes("json");

        // 檢查是否遭遇授權失效或限流 (401 Unauthorized / 403 Forbidden / 429 Too Many Requests)
        if (res.status === 401 || res.status === 403 || res.status === 429) {
          const errText = await res.text().catch(() => "");
          const cleanErr = errText.length > 200 ? errText.substring(0, 200) + "..." : errText;
          console.warn(
            `[TDX 金鑰輪流系統] 金鑰「${currentPair.label}」遭遇 HTTP ${res.status}，自動切換至下一組金鑰...`
          );
          // 清除該金鑰的 token 快取
          this.tokenCache.delete(currentPair.id);
          this.rotateToNextKey(`遭遇 HTTP ${res.status}: ${cleanErr}`);
          continue;
        }

        if (!res.ok) {
          let errText = "";
          if (isJson) {
            try {
              const errObj = await res.json();
              errText = errObj.error_description || errObj.error || errObj.message || JSON.stringify(errObj);
            } catch {
              errText = `HTTP ${res.status} ${res.statusText}`;
            }
          } else {
            const raw = await res.text().catch(() => "");
            errText = raw.includes("<!DOCTYPE") || raw.includes("<html")
              ? `伺服器回應 HTML 頁面 (可能是 404 或代理路徑不存在)`
              : raw.substring(0, 150);
          }
          throw new Error(`TDX 數據端點回應錯誤 (${res.status}): ${errText}`);
        }

        if (!isJson) {
          const rawText = await res.text().catch(() => "");
          if (rawText.includes("<!DOCTYPE") || rawText.includes("<html")) {
            throw new Error(`TDX 端點回傳 HTML 頁面而非 JSON 格式 (狀態碼: HTTP ${res.status})。請確認 API 網址。`);
          }
          try {
            const parsed = JSON.parse(rawText) as T;
            currentPair.lastUsedTimestamp = Date.now();
            currentPair.isHealthy = true;
            return { data: parsed, usedKeyPair: currentPair, attempts: attempt + 1 };
          } catch {
            throw new Error(`TDX 回傳格式不符 (Content-Type: ${contentType})，無法解析 JSON。`);
          }
        }

        const data = (await res.json()) as T;
        currentPair.lastUsedTimestamp = Date.now();
        currentPair.isHealthy = true;

        return {
          data,
          usedKeyPair: currentPair,
          attempts: attempt + 1,
        };
      } catch (err: any) {
        lastError = err;
        console.error(`[TDX 金鑰輪流系統] 透過「${currentPair.label}」請求數據失敗：`, err.message);
        this.rotateToNextKey(`API 請求異常: ${err.message}`);
      }
    }

    throw new Error(
      `所有 TDX 金鑰輪替嘗試皆失敗 (共測試 ${maxAttempts} 組金鑰)。最後異常：${lastError?.message || "連線逾時"}`
    );
  }

  /**
   * 取得當前輪流系統診斷與健康狀態 (遮罩敏感密鑰)
   */
  public getStatus(): TdxKeyManagerStatus {
    const activeKey = this.getActiveKeyPair();
    return {
      totalKeys: this.keyPairs.length,
      activeKeyIndex: this.activeIndex,
      activeKeyLabel: activeKey.label,
      activeClientIdMasked: this.maskString(activeKey.clientId),
      rotationCount: this.rotationCount,
      lastRotationTimestamp: this.lastRotationTimestamp,
      lastRotationReason: this.lastRotationReason,
      keysStatus: this.keyPairs.map((k, idx) => ({
        index: idx,
        label: k.label,
        clientIdMasked: this.maskString(k.clientId),
        isHealthy: k.isHealthy,
        failCount: k.failCount,
        lastError: k.lastError,
      })),
    };
  }
}

// 導出全域單例模式管理器 (Singleton Instance)
export const globalTdxKeyManager = new TdxKeyRotationSystem();
