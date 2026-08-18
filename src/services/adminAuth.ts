/**
 * 雪山隧道與國道5號即時路況系統 - 後台權限與安全驗證模組
 * 嚴格規範：所有可更改、重設、微調訓練、刪除與金鑰修改動作，均限制只有後台驗證後才能執行
 * 後台管理密碼：Jj9503804
 */

export const ADMIN_PASSWORD = "Jj9503804";
export const ADMIN_STORAGE_KEY = "HSUEHSHAN_ADMIN_AUTH_SESSION_V1";

// 記憶體內訂閱事件回調
const authListeners: Set<(isAuth: boolean) => void> = new Set();

/**
 * 檢查目前連線是否已完成後台驗證
 */
export function isAdminAuthenticated(): boolean {
  try {
    const sessionVal = sessionStorage.getItem(ADMIN_STORAGE_KEY);
    if (sessionVal === "AUTHENTICATED_OK") {
      return true;
    }
    // 同步檢查本機記憶（方便使用者重新整理頁面後維持後台登入狀態）
    const localVal = localStorage.getItem(ADMIN_STORAGE_KEY);
    return localVal === "AUTHENTICATED_OK";
  } catch {
    return false;
  }
}

/**
 * 驗證後台密碼是否正確
 */
export function verifyAdminPassword(password: string): boolean {
  if (!password) return false;
  return password.trim() === ADMIN_PASSWORD;
}

/**
 * 執行後台登入驗證
 */
export function loginAdmin(password: string): boolean {
  if (verifyAdminPassword(password)) {
    try {
      sessionStorage.setItem(ADMIN_STORAGE_KEY, "AUTHENTICATED_OK");
      localStorage.setItem(ADMIN_STORAGE_KEY, "AUTHENTICATED_OK");
    } catch {}
    notifyAuthChange(true);
    return true;
  }
  return false;
}

/**
 * 登出後台管理員權限（轉為一般前台唯讀模式）
 */
export function logoutAdmin(): void {
  try {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    localStorage.removeItem(ADMIN_STORAGE_KEY);
  } catch {}
  notifyAuthChange(false);
}

/**
 * 訂閱後台驗證狀態變更
 */
export function subscribeAdminAuth(callback: (isAuth: boolean) => void): () => void {
  authListeners.add(callback);
  // 立即傳遞當前狀態
  callback(isAdminAuthenticated());
  return () => {
    authListeners.delete(callback);
  };
}

function notifyAuthChange(isAuth: boolean) {
  authListeners.forEach((fn) => {
    try {
      fn(isAuth);
    } catch (e) {
      console.error("Auth listener error:", e);
    }
  });
}
