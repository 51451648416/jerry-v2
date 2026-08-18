import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { globalTdxKeyManager } from "./src/services/tdxKeyRotator";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON request bodies
  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // TDX Key Rotation System Status
  app.get("/api/tdx/keys/status", (req, res) => {
    try {
      const status = globalTdxKeyManager.getStatus();
      return res.json(status);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Unified endpoint for Freeway VD data with Automatic Key Rotation & Failover
  const handleFreewayVd = async (req: express.Request, res: express.Response) => {
    try {
      const tdxUrl =
        "https://tdx.transportdata.tw/api/basic/v2/Road/Traffic/Live/VD/Freeway?$filter=startswith(VDID,%20%27VD-N5%27)&$format=JSON";

      const result = await globalTdxKeyManager.executeWithFailover<any>(tdxUrl);
      return res.json(result.data);
    } catch (err: any) {
      console.error("TDX Freeway-VD fetch error:", err);
      return res.status(502).json({
        error: err.message || "無法連線至交通部 TDX 伺服器，所有金鑰輪轉嘗試皆未成功，請稍後重試",
      });
    }
  };

  app.get("/api/tdx/freeway-vd", handleFreewayVd);
  app.get("/api/v1/freeway-vd", handleFreewayVd);
  app.get("/api/traffic/vd", handleFreewayVd);
  app.get("/api/n5/vd", handleFreewayVd);

  // Unified endpoint for Freeway Live Events data with Automatic Key Rotation & Failover
  const handleFreewayLiveEvents = async (req: express.Request, res: express.Response) => {
    try {
      // TDX API: 國道即時路況事件端點
      const tdxEventsUrl =
        "https://tdx.transportdata.tw/api/basic/v2/Road/Traffic/Live/LiveEvent/Freeway?$filter=contains(Location/FreeExpressHighway/Road,%20%27國道5號%27)&$format=JSON";

      try {
        const result = await globalTdxKeyManager.executeWithFailover<any>(tdxEventsUrl);
        return res.json(result.data);
      } catch (innerErr: any) {
        // 若端點無事件或過濾結果為空/返回 404，依規範安全回傳空事件結構，不中斷系統
        console.info("TDX 即時事件端點返回無活躍事件或路徑通知，回傳空事件結構");
        return res.json({
          UpdateTime: new Date().toISOString(),
          UpdateInterval: 300,
          LiveEvents: [],
        });
      }
    } catch (err: any) {
      console.error("TDX Freeway Live Events fetch error:", err);
      return res.json({
        UpdateTime: new Date().toISOString(),
        UpdateInterval: 300,
        LiveEvents: [],
      });
    }
  };

  app.get("/api/tdx/freeway-live-events", handleFreewayLiveEvents);
  app.get("/api/v1/freeway-live-events", handleFreewayLiveEvents);
  app.get("/api/traffic/live-events", handleFreewayLiveEvents);
  app.get("/api/n5/events", handleFreewayLiveEvents);

  // TDX Auth Token Proxy (compatibility with rotation fallback)
  app.post("/api/tdx/token", async (req, res) => {
    try {
      const { clientId, clientSecret } = req.body;
      if (clientId && clientSecret) {
        // If specific credentials passed, use direct token request
        const authUrl = "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token";
        const requestBody = `grant_type=client_credentials&client_id=${encodeURIComponent(
          clientId
        )}&client_secret=${encodeURIComponent(clientSecret)}`;

        const response = await fetch(authUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: requestBody,
        });

        if (!response.ok) {
          const errText = await response.text();
          return res.status(response.status).json({ error: `TDX 認證伺服器回應錯誤: ${errText}` });
        }

        const data = await response.json();
        return res.json({ access_token: data.access_token });
      }

      // Default: Use rotation manager
      const { token } = await globalTdxKeyManager.getValidAccessToken();
      return res.json({ access_token: token });
    } catch (err: any) {
      console.error("Error in /api/tdx/token proxy:", err);
      return res.status(500).json({ error: err.message || "TDX 連線認證失敗" });
    }
  });

  // TDX Data Proxy
  app.get("/api/tdx/proxy", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      const authHeader = req.headers.authorization;

      if (!targetUrl) {
        return res.status(400).json({ error: "Missing 'url' query parameter" });
      }
      if (!authHeader) {
        return res.status(400).json({ error: "Missing 'Authorization' header" });
      }

      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: `TDX fetch failed: ${errText}` });
      }

      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      console.error("Error in /api/tdx/proxy:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
