import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Compass,
  Video,
  ExternalLink,
  Play,
  RefreshCw,
} from "lucide-react";
import { FinalEstimatorOutput, Direction, CctvCamera } from "../types";
import { CCTV_CAMERAS } from "../data/cctvData";
import { ExtractedLiveEvent } from "../services/liveEventsEngine";

interface TunnelGisMapProps {
  estimatorOutput: FinalEstimatorOutput | null;
  currentDirection: Direction;
  liveEvents?: ExtractedLiveEvent[];
  onSelectCamera?: (camera: CctvCamera) => void;
  onDirectionChange?: (dir: Direction) => void;
}

export default function TunnelGisMap({
  estimatorOutput,
  currentDirection,
  liveEvents = [],
  onSelectCamera,
  onDirectionChange,
}: TunnelGisMapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 地圖平移與縮放狀態
  const [scale, setScale] = useState<number>(2.2);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [tunnelOpacity, setTunnelOpacity] = useState<number>(0.35);
  const [showEscapes, setShowEscapes] = useState<boolean>(true);
  const [showCctv, setShowCctv] = useState<boolean>(true);
  const [showSpeedHeatmap, setShowSpeedHeatmap] = useState<boolean>(true);

  // 使用者定位相關狀態
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    inTunnel: boolean;
    currentK: number | null;
    estimatedDirection: Direction;
    speedKmh: number | null;
    recommendedLane: number | null; // 推薦車道: 1:內側, 2:外側
  } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // 選取的攝影機預覽 Popup (含 30s 倒數重播與 1 分鐘省電封面更新)
  const [selectedCam, setSelectedCam] = useState<CctvCamera | null>(null);
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false); // 預設不直接播放，省電
  const [videoTimer, setVideoTimer] = useState<number>(30); // 30 秒播放時限
  const [snapshotTimestamp, setSnapshotTimestamp] = useState<number>(Date.now()); // 每分鐘省電更新

  // 拖曳狀態
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // 隧道核心常數
  const START_K = 15.2; // 坪林 (北口)
  const END_K = 28.1; // 頭城 (南口)
  const TOTAL_METERS = (END_K - START_K) * 1000; // 12,900 公尺
  const STEP_METERS = 50;
  const TUBE_DIST = 16.0;
  const LANE_OFFSET = 3.5;

  // 參考點與通道
  const routePointsRef = useRef<
    { x: number; y: number; k: number; meters: number }[]
  >([]);
  const escapePassagesRef = useRef<
    { id: number; k: number; p1: { x: number; y: number }; p2: { x: number; y: number } }[]
  >([]);

  // 推薦車道
  const fasterLaneId = estimatorOutput?.estimated_state?.laneComparison?.fasterLaneId ?? 1;

  // 車速統計與範圍計算 (若有更高/更低流速區間)
  const speedStats = (() => {
    if (!estimatorOutput?.estimated_state?.segments) return null;
    const segs = estimatorOutput.estimated_state.segments;
    let minSpd = 999;
    let maxSpd = 0;
    segs.forEach((s) => {
      if (s.estimatedSegmentSpeedKmh < minSpd) minSpd = s.estimatedSegmentSpeedKmh;
      if (s.estimatedSegmentSpeedKmh > maxSpd) maxSpd = s.estimatedSegmentSpeedKmh;
    });
    const avgSpd =
      fasterLaneId === 1
        ? estimatorOutput.estimated_state.laneComparison.lane1.equivalentTravelSpeedKmh
        : estimatorOutput.estimated_state.laneComparison.lane2.equivalentTravelSpeedKmh;
    return {
      min: minSpd === 999 ? 0 : Math.round(minSpd),
      max: Math.round(maxSpd),
      avg: Math.round(avgSpd),
      fasterLane: fasterLaneId === 1 ? "內側車道" : "外側車道",
    };
  })();

  // 建立真實雪山隧道幾何座標線型
  const generateHsuehshanRoute = () => {
    const pts: { x: number; y: number; k: number; meters: number }[] = [];
    let currX = 0;
    let currY = 0;

    for (let m = 0; m <= TOTAL_METERS; m += STEP_METERS) {
      const k = START_K + m / 1000;
      let headingDeg = 138;
      if (k >= 17.5 && k < 20.5) headingDeg = 135;
      if (k >= 20.5 && k < 24.0) headingDeg = 140;
      if (k >= 24.0 && k < 27.5) headingDeg = 136;
      if (k >= 27.5) headingDeg = 125;

      const rad = headingDeg * (Math.PI / 180);
      const dx = Math.sin(rad) * STEP_METERS;
      const dy = -Math.cos(rad) * STEP_METERS;

      pts.push({ x: currX, y: currY, k, meters: m });
      currX += dx;
      currY += dy;
    }
    routePointsRef.current = pts;

    // 計算 36 處逃生通道
    const escapes: { id: number; k: number; p1: { x: number; y: number }; p2: { x: number; y: number } }[] = [];
    const escapeStep = TOTAL_METERS / 35;
    for (let e = 0; e < 36; e++) {
      const mTarget = e * escapeStep;
      const p = pts.find((pt) => pt.meters >= mTarget) || pts[pts.length - 1];
      const idx = pts.indexOf(p);
      const norm = getNormalVector(pts, idx);
      escapes.push({
        id: e + 1,
        k: p.k,
        p1: { x: p.x + norm.x * -TUBE_DIST, y: p.y + norm.y * -TUBE_DIST },
        p2: { x: p.x + norm.x * TUBE_DIST, y: p.y + norm.y * TUBE_DIST },
      });
    }
    escapePassagesRef.current = escapes;
  };

  const getNormalVector = (
    pts: { x: number; y: number; k: number; meters: number }[],
    i: number
  ) => {
    const p0 = pts[Math.max(0, i - 1)];
    const p2 = pts[Math.min(pts.length - 1, i + 1)];
    const dx = p2.x - p0.x;
    const dy = p2.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: -dy / len, y: dx / len };
  };

  // 繪製路徑
  const drawOffsetPath = (
    ctx: CanvasRenderingContext2D,
    pts: { x: number; y: number; k: number; meters: number }[],
    offsetMeters: number,
    lineWidth: number,
    strokeStyle: string,
    isDashed = false,
    dashArray = [4, 6]
  ) => {
    ctx.beginPath();
    pts.forEach((p, i) => {
      const norm = getNormalVector(pts, i);
      const x = p.x + norm.x * offsetMeters;
      const y = p.y + norm.y * offsetMeters;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    if (isDashed) {
      ctx.setLineDash(dashArray);
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke();
  };

  const drawScaleInvariant = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    curScale: number,
    callback: () => void
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1 / curScale, 1 / curScale);
    callback();
    ctx.restore();
  };

  // 取得特定切片速度顏色
  const getSpeedColor = (speedKmh: number) => {
    if (speedKmh >= 80) return "rgba(16, 185, 129, 0.85)"; // 綠色 80+
    if (speedKmh >= 60) return "rgba(245, 158, 11, 0.85)"; // 黃橘 60-80
    return "rgba(239, 68, 68, 0.9)"; // 紅色 <60
  };

  // 平移視角至特定里程
  const goToK = useCallback((targetK: number) => {
    if (routePointsRef.current.length === 0) {
      generateHsuehshanRoute();
    }
    const pts = routePointsRef.current;
    if (pts.length === 0) return;
    const targetPoint = pts.find((p) => Math.abs(p.k - targetK) < 0.2) || pts[0];
    const canvas = canvasRef.current;
    if (targetPoint && canvas) {
      const curScale = 2.4;
      setScale(curScale);
      setOffsetX(canvas.width / 2 - targetPoint.x * curScale);
      setOffsetY(canvas.height / 2 - targetPoint.y * curScale);
    }
  }, []);

  // 元件掛載時初始化隧道路線與視角
  useEffect(() => {
    generateHsuehshanRoute();
    if (currentDirection === "S") {
      goToK(15.2);
    } else {
      goToK(28.1);
    }
  }, []);

  // 當方向改變時自動切換視角 (南下至 15.2K 北口起點，北上至 28.1K 南口起點)
  useEffect(() => {
    if (currentDirection === "S") {
      goToK(15.2);
    } else {
      goToK(28.1);
    }
  }, [currentDirection, goToK]);

  // CCTV 播放計時器 (30 秒自動停止以達省電與主動監看連續)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlayingVideo) {
      interval = setInterval(() => {
        setVideoTimer((prev) => {
          if (prev <= 1) {
            setIsPlayingVideo(false); // 30 秒自動停止
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setVideoTimer(30);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlayingVideo]);

  // 每分鐘自動更新 CCTV 靜態封面 (降低耗電量，同時主動掌握最新截圖)
  useEffect(() => {
    const snapshotInterval = setInterval(() => {
      setSnapshotTimestamp(Date.now());
    }, 60000); // 每 60 秒更新一次靜態影像時間戳
    return () => clearInterval(snapshotInterval);
  }, []);

  // 主重繪 Canvas 函式
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
    canvas.height = canvas.parentElement?.clientHeight || 600;

    // 清空背景：現代清爽白底 GIS 風格
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    let pts = routePointsRef.current;
    if (pts.length === 0) {
      generateHsuehshanRoute();
      pts = routePointsRef.current;
    }
    if (pts.length === 0) {
      ctx.restore();
      return;
    }

    // 1. 淺灰背景網格 (每 500m)
    ctx.strokeStyle = "rgba(100, 116, 139, 0.08)";
    ctx.lineWidth = 1 / scale;
    ctx.beginPath();
    for (let i = -10000; i <= 30000; i += 500) {
      ctx.moveTo(i, -10000);
      ctx.lineTo(i, 30000);
      ctx.moveTo(-10000, i);
      ctx.lineTo(30000, i);
    }
    ctx.stroke();

    // 2. 繪製 36 處逃生橫坑
    if (showEscapes) {
      escapePassagesRef.current.forEach((esc) => {
        ctx.beginPath();
        ctx.moveTo(esc.p1.x, esc.p1.y);
        ctx.lineTo(esc.p2.x, esc.p2.y);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(14, 165, 233, 0.5)";
        ctx.setLineDash([]);
        ctx.stroke();

        drawScaleInvariant(
          ctx,
          (esc.p1.x + esc.p2.x) / 2,
          (esc.p1.y + esc.p2.y) / 2,
          scale,
          () => {
            ctx.fillStyle = "rgba(2, 132, 199, 0.8)";
            ctx.font = "bold 9px monospace";
            ctx.textAlign = "center";
            ctx.fillText(`E${esc.id}`, 0, 0);
          }
        );
      });
    }

    // 3. 繪製半透明隧道結構外殼
    if (tunnelOpacity > 0) {
      // 左管 (南下)
      drawOffsetPath(
        ctx,
        pts,
        -TUBE_DIST,
        12,
        `rgba(203, 213, 225, ${tunnelOpacity})`
      );
      // 右管 (北上)
      drawOffsetPath(
        ctx,
        pts,
        TUBE_DIST,
        12,
        `rgba(203, 213, 225, ${tunnelOpacity})`
      );
    }

    // 4. 繪製深色柏油路面
    drawOffsetPath(ctx, pts, -TUBE_DIST, 8, "#1e293b"); // 左管南下
    drawOffsetPath(ctx, pts, TUBE_DIST, 8, "#1e293b"); // 右管北上

    // 5. 繪製 20 微元車速熱區帶 (內外雙車道獨立標示，確保北上與南下的內外側皆完整標上速度顏色)
    if (showSpeedHeatmap && estimatorOutput) {
      const segs = estimatorOutput.estimated_state.segments;
      const laneComp = estimatorOutput.estimated_state.laneComparison;
      const l1Ratio = laneComp && laneComp.lane1 && laneComp.lane1.equivalentTravelSpeedKmh > 0
        ? laneComp.lane1.equivalentTravelSpeedKmh / Math.max(1, estimatorOutput.estimated_state.equivalentTravelSpeedKmh)
        : 1;
      const l2Ratio = laneComp && laneComp.lane2 && laneComp.lane2.equivalentTravelSpeedKmh > 0
        ? laneComp.lane2.equivalentTravelSpeedKmh / Math.max(1, estimatorOutput.estimated_state.equivalentTravelSpeedKmh)
        : 1;

      segs.forEach((seg) => {
        const segStartM = (seg.startMileageKm - START_K) * 1000;
        const segEndM = (seg.endMileageKm - START_K) * 1000;
        const baseSpeed = seg.estimatedSegmentSpeedKmh;

        const lane1Speed = Math.max(20, Math.min(100, baseSpeed * l1Ratio));
        const lane2Speed = Math.max(20, Math.min(100, baseSpeed * l2Ratio));

        const colorL1 = getSpeedColor(lane1Speed);
        const colorL2 = getSpeedColor(lane2Speed);

        const relevantPts = pts.filter(
          (p) => p.meters >= segStartM && p.meters <= segEndM
        );
        if (relevantPts.length > 1) {
          // 南下: 內側 -14.25, 外側 -17.75
          // 北上: 內側 +14.25, 外側 +17.75
          const isSouth = currentDirection === "S";
          const offsetL1 = isSouth ? -14.25 : 14.25;
          const offsetL2 = isSouth ? -17.75 : 17.75;

          // 繪製內側車道熱區
          ctx.beginPath();
          relevantPts.forEach((p, i) => {
            const norm = getNormalVector(pts, pts.indexOf(p));
            const x = p.x + norm.x * offsetL1;
            const y = p.y + norm.y * offsetL1;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.lineWidth = 3.6;
          ctx.strokeStyle = colorL1;
          ctx.setLineDash([]);
          ctx.stroke();

          // 繪製外側車道熱區 (確保北上與南下外側車道皆有完整顏色標示)
          ctx.beginPath();
          relevantPts.forEach((p, i) => {
            const norm = getNormalVector(pts, pts.indexOf(p));
            const x = p.x + norm.x * offsetL2;
            const y = p.y + norm.y * offsetL2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.lineWidth = 3.6;
          ctx.strokeStyle = colorL2;
          ctx.setLineDash([]);
          ctx.stroke();
        }
      });
    }

    // 6. 繪製兩側路面邊線 (黃線/白線)
    drawOffsetPath(ctx, pts, -TUBE_DIST - 3.75, 0.3, "#f59e0b");
    drawOffsetPath(ctx, pts, -TUBE_DIST + 3.75, 0.3, "#ffffff");
    drawOffsetPath(ctx, pts, TUBE_DIST - 3.75, 0.3, "#ffffff");
    drawOffsetPath(ctx, pts, TUBE_DIST + 3.75, 0.3, "#f59e0b");

    // 7. 繪製兩車道中央【雙白實線】 (嚴禁變換車道)
    drawOffsetPath(ctx, pts, -TUBE_DIST - 0.2, 0.25, "#ffffff");
    drawOffsetPath(ctx, pts, -TUBE_DIST + 0.2, 0.25, "#ffffff");
    drawOffsetPath(ctx, pts, TUBE_DIST - 0.2, 0.25, "#ffffff");
    drawOffsetPath(ctx, pts, TUBE_DIST + 0.2, 0.25, "#ffffff");

    // 8. 標示【推薦行駛車道光芒】 (連續實線導引)
    if (estimatorOutput) {
      const recLane = fasterLaneId; // 1:內側, 2:外側
      let recOffset = -14.25;
      if (currentDirection === "S") {
        recOffset = recLane === 1 ? -14.25 : -17.75;
      } else {
        recOffset = recLane === 1 ? 14.25 : 17.75;
      }

      ctx.beginPath();
      pts.forEach((p, i) => {
        const norm = getNormalVector(pts, i);
        const x = p.x + norm.x * recOffset;
        const y = p.y + norm.y * recOffset;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = "rgba(16, 185, 129, 0.9)";
      ctx.setLineDash([]); // 連續實線，非虛線
      ctx.stroke();
    }

    // 9. 繪製里程牌 (每 1 公里)
    pts.forEach((p, idx) => {
      if (Math.abs(p.k - Math.round(p.k)) < STEP_METERS / 2000) {
        const norm = getNormalVector(pts, idx);
        const signX = p.x + norm.x * 28;
        const signY = p.y + norm.y * 28;

        drawScaleInvariant(ctx, signX, signY, scale, () => {
          ctx.fillStyle = "#065f46";
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("5", 0, 1);

          ctx.fillStyle = "#334155";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(`${Math.round(p.k)}k`, 13, 1);
        });
      }
    });

    // 10. 繪製 CCTV 攝影機圖示與【道路實體連線】
    if (showCctv) {
      CCTV_CAMERAS.forEach((cam) => {
        const mTarget = (cam.mileage - START_K) * 1000;
        const p = pts.find((pt) => pt.meters >= mTarget);
        if (p) {
          const idx = pts.indexOf(p);
          const norm = getNormalVector(pts, idx);
          const roadOffset = cam.direction === "S" ? -TUBE_DIST : TUBE_DIST;
          const roadX = p.x + norm.x * roadOffset;
          const roadY = p.y + norm.y * roadOffset;

          const camOffset = cam.direction === "S" ? -TUBE_DIST - 8 : TUBE_DIST + 8;
          const camX = p.x + norm.x * camOffset;
          const camY = p.y + norm.y * camOffset;

          // 繪製與路面的垂直銜接實體連線
          ctx.beginPath();
          ctx.moveTo(roadX, roadY);
          ctx.lineTo(camX, camY);
          ctx.strokeStyle = cam.id === selectedCam?.id ? "#0284c7" : "rgba(2, 132, 199, 0.7)";
          ctx.lineWidth = cam.id === selectedCam?.id ? 2.5 : 1.5;
          ctx.setLineDash([]);
          ctx.stroke();

          // 繪製路面錨點
          ctx.beginPath();
          ctx.arc(roadX, roadY, 2, 0, Math.PI * 2);
          ctx.fillStyle = "#0284c7";
          ctx.fill();

          drawScaleInvariant(ctx, camX, camY, scale, () => {
            const isSelected = selectedCam?.id === cam.id;
            // 攝影機底圓
            ctx.fillStyle = isSelected ? "#0369a1" : "#0284c7";
            ctx.beginPath();
            ctx.arc(0, 0, isSelected ? 12 : 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = isSelected ? 2 : 1.5;
            ctx.stroke();

            // 攝影機符號
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 9px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("📹", 0, 1);

            // 攝影機標籤
            ctx.fillStyle = isSelected ? "#0369a1" : "#0f172a";
            ctx.font = isSelected ? "bold 10px sans-serif" : "bold 9px sans-serif";
            ctx.fillText(cam.title, 0, 16);
          });
        }
      });
    }

    // 11. 繪製突發路況事件警示 (14K ~ 29K 區間)
    if (liveEvents && liveEvents.length > 0) {
      liveEvents.forEach((ev) => {
        const eventM = (ev.startKm - START_K) * 1000;
        const p = pts.find((pt) => pt.meters >= eventM);
        if (p) {
          const idx = pts.indexOf(p);
          const norm = getNormalVector(pts, idx);
          const evOffset = ev.direction === "S" ? -TUBE_DIST : TUBE_DIST;
          const evX = p.x + norm.x * evOffset;
          const evY = p.y + norm.y * evOffset;

          drawScaleInvariant(ctx, evX, evY, scale, () => {
            ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#dc2626";
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 11px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("⚠️", 0, 1);

            ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
            ctx.beginPath();
            ctx.roundRect(-50, -38, 100, 22, 5);
            ctx.fill();
            ctx.fillStyle = "#fef08a";
            ctx.font = "bold 9px sans-serif";
            ctx.fillText(`即時事件: ${ev.startKm.toFixed(1)}K`, 0, -27);
          });
        }
      });
    }

    // 12. 繪製使用者 GPS 即時車輛位置
    if (userLocation && userLocation.inTunnel && userLocation.currentK !== null) {
      const userM = (userLocation.currentK - START_K) * 1000;
      const p = pts.find((pt) => pt.meters >= userM);
      if (p) {
        const idx = pts.indexOf(p);
        const norm = getNormalVector(pts, idx);

        const isRecLane1 = userLocation.recommendedLane === 1;
        let carOffset = -14.25;
        if (userLocation.estimatedDirection === "S") {
          carOffset = isRecLane1 ? -14.25 : -17.75;
        } else {
          carOffset = isRecLane1 ? 14.25 : 17.75;
        }

        const carX = p.x + norm.x * carOffset;
        const carY = p.y + norm.y * carOffset;

        drawScaleInvariant(ctx, carX, carY, scale, () => {
          ctx.fillStyle = "rgba(16, 185, 129, 0.35)";
          ctx.beginPath();
          ctx.arc(0, 0, 24, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#10b981";
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🚗", 0, 1);

          ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
          ctx.beginPath();
          ctx.roundRect(-60, -42, 120, 24, 6);
          ctx.fill();
          ctx.fillStyle = "#34d399";
          ctx.font = "bold 9px sans-serif";
          ctx.fillText(
            `您在此: ${userLocation.currentK.toFixed(1)}K (${isRecLane1 ? "內側" : "外側"})`,
            0,
            -30
          );
        });
      }
    }

    // 13. 繪製隧道口標記
    drawPortal(ctx, pts[0], "雪山隧道北口", "坪林 (15.2K)", true);
    drawPortal(ctx, pts[pts.length - 1], "雪山隧道南口", "頭城 (28.1K)", false);

    ctx.restore();
  };

  const drawPortal = (
    ctx: CanvasRenderingContext2D,
    p: { x: number; y: number; k: number; meters: number },
    title: string,
    sub: string,
    isNorth: boolean
  ) => {
    drawScaleInvariant(ctx, p.x, p.y, scale, () => {
      ctx.fillStyle = "#cbd5e1";
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-65, -12, 130, 24, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.strokeStyle = isNorth ? "#10b981" : "#f59e0b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-75, -55, 150, 36, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sub, 0, -42);

      ctx.fillStyle = "#64748b";
      ctx.font = "10px sans-serif";
      ctx.fillText(title, 0, -26);
    });
  };

  // 監聽畫布點擊與觸控檢測 CCTV
  const checkCameraHit = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const clickY = clientY - rect.top;

      const pts = routePointsRef.current;
      if (pts.length === 0) return;

      // 在螢幕像素空間中檢測各 CCTV 攝影機與點擊點的距離
      let closestCam: CctvCamera | null = null;
      let minPixelDist = 36; // 36px 手指觸控容許半徑

      CCTV_CAMERAS.forEach((cam) => {
        const mTarget = (cam.mileage - START_K) * 1000;
        const p = pts.find((pt) => pt.meters >= mTarget);
        if (p) {
          const idx = pts.indexOf(p);
          const norm = getNormalVector(pts, idx);
          const camOffset = cam.direction === "S" ? -TUBE_DIST - 8 : TUBE_DIST + 8;
          const camWorldX = p.x + norm.x * camOffset;
          const camWorldY = p.y + norm.y * camOffset;

          // 轉換為螢幕像素座標
          const screenCamX = camWorldX * scale + offsetX;
          const screenCamY = camWorldY * scale + offsetY;

          const dist = Math.hypot(clickX - screenCamX, clickY - screenCamY);
          if (dist < minPixelDist) {
            minPixelDist = dist;
            closestCam = cam;
          }
        }
      });

      if (closestCam) {
        setSelectedCam(closestCam);
        setIsPlayingVideo(false);
        setVideoTimer(30);
        if (onSelectCamera) onSelectCamera(closestCam);
      }
    },
    [scale, offsetX, offsetY, onSelectCamera]
  );

  // 監聽原生 Touch 事件以支援流暢的雙指縮放 (Pinch-to-zoom) 與單指拖曳平移 (Pan)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let touchMode: "none" | "pan" | "pinch" = "none";
    let startDist = 0;
    let startScale = scale;
    let lastX = 0;
    let lastY = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let rafId: number | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      touchStartTime = Date.now();

      if (e.touches.length === 1) {
        touchMode = "pan";
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
        touchStartX = lastX;
        touchStartY = lastY;
      } else if (e.touches.length === 2) {
        touchMode = "pinch";
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        startDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        startScale = scale;
        lastX = (t1.clientX + t2.clientX) / 2;
        lastY = (t1.clientY + t2.clientY) / 2;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        if (touchMode === "pan" && e.touches.length === 1) {
          const currentX = e.touches[0].clientX;
          const currentY = e.touches[0].clientY;
          const dx = currentX - lastX;
          const dy = currentY - lastY;
          setOffsetX((prev) => prev + dx);
          setOffsetY((prev) => prev + dy);
          lastX = currentX;
          lastY = currentY;
        } else if (touchMode === "pinch" && e.touches.length === 2) {
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
          const currentMidX = (t1.clientX + t2.clientX) / 2;
          const currentMidY = (t1.clientY + t2.clientY) / 2;

          if (startDist > 0) {
            const factor = currentDist / startDist;
            const newScale = Math.max(0.4, Math.min(10, startScale * factor));
            setScale(newScale);
            setOffsetX((prev) => prev + (currentMidX - lastX));
            setOffsetY((prev) => prev + (currentMidY - lastY));
            lastX = currentMidX;
            lastY = currentMidY;
          }
        }
      });
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchDuration = Date.now() - touchStartTime;
      const moveDist = Math.hypot(lastX - touchStartX, lastY - touchStartY);

      // 若手指觸控時間短且無位移，判定為 Tap 點擊
      if (touchMode === "pan" && touchDuration < 350 && moveDist < 12) {
        checkCameraHit(lastX, lastY);
      }

      if (e.touches.length === 0) {
        touchMode = "none";
      } else if (e.touches.length === 1) {
        touchMode = "pan";
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      }
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
    canvas.addEventListener("touchcancel", handleTouchEnd, { passive: false });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [scale, checkCameraHit]);

  // 平滑 rAF 渲染 Canvas
  const rAfRenderRef = useRef<number | null>(null);
  useEffect(() => {
    if (rAfRenderRef.current) cancelAnimationFrame(rAfRenderRef.current);
    rAfRenderRef.current = requestAnimationFrame(() => {
      renderCanvas();
    });
    return () => {
      if (rAfRenderRef.current) cancelAnimationFrame(rAfRenderRef.current);
    };
  }, [
    scale,
    offsetX,
    offsetY,
    tunnelOpacity,
    showEscapes,
    showCctv,
    showSpeedHeatmap,
    estimatorOutput,
    currentDirection,
    liveEvents,
    userLocation,
    selectedCam,
  ]);

  // 滑鼠點擊檢測 CCTV
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    checkCameraHit(e.clientX, e.clientY);
  };

  return (
    <div className="relative w-full h-[380px] sm:h-[500px] md:h-[600px] rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-xl flex select-none">
      {/* 畫布 Canvas：支援滑鼠滾輪/拖曳與手機雙指捏合縮放 (Pinch-to-zoom) / 單指拖曳 */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseDown={(e) => {
          isDraggingRef.current = true;
          dragStartRef.current = { x: e.clientX - offsetX, y: e.clientY - offsetY };
        }}
        onMouseMove={(e) => {
          if (isDraggingRef.current) {
            setOffsetX(e.clientX - dragStartRef.current.x);
            setOffsetY(e.clientY - dragStartRef.current.y);
          }
        }}
        onMouseUp={() => (isDraggingRef.current = false)}
        onMouseLeave={() => (isDraggingRef.current = false)}
        onWheel={(e) => {
          e.preventDefault();
          const zoomFactor = Math.exp(-e.deltaY * 0.0015);
          setScale((prev) => Math.max(0.3, Math.min(10, prev * zoomFactor)));
        }}
        className="w-full h-full cursor-grab active:cursor-grabbing block touch-none"
      />

      {/* 頂部精簡狀態浮水印提示 (手勢操作提示，無遮擋按鈕) */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
        <div className="bg-slate-900/85 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-slate-700/80 shadow-md text-white text-[10px] sm:text-[11px] font-medium flex items-center gap-1.5 sm:gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold">雪隧 13km GIS</span>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-slate-300 text-[10px] hidden sm:inline">
            雙指縮放・單指拖曳・滾輪平移
          </span>
        </div>
      </div>

      {/* 右上角：精巧指北標記與縮放快捷鍵 (+ / - / 重置) */}
      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
        <div className="bg-white/90 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-slate-200 shadow-md flex items-center gap-1.5">
          <Compass className="h-4 w-4 text-rose-500" />
          <span className="text-slate-800 font-black text-xs">N</span>
        </div>

        {/* 手機/電腦便捷縮放按鈕 */}
        <div className="flex flex-col bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-md overflow-hidden p-0.5">
          <button
            onClick={() => setScale((prev) => Math.min(10, prev * 1.3))}
            className="p-2 hover:bg-slate-100 text-slate-700 font-black text-sm flex items-center justify-center cursor-pointer active:bg-slate-200"
            title="放大"
          >
            +
          </button>
          <div className="h-[1px] bg-slate-200 w-full" />
          <button
            onClick={() => setScale((prev) => Math.max(0.4, prev / 1.3))}
            className="p-2 hover:bg-slate-100 text-slate-700 font-black text-sm flex items-center justify-center cursor-pointer active:bg-slate-200"
            title="縮小"
          >
            −
          </button>
          <div className="h-[1px] bg-slate-200 w-full" />
          <button
            onClick={() => {
              setScale(2.2);
              setOffsetX(0);
              setOffsetY(0);
            }}
            className="px-1.5 py-1 hover:bg-slate-100 text-slate-600 font-bold text-[9px] flex items-center justify-center cursor-pointer active:bg-slate-200"
            title="重設視角"
          >
            重設
          </button>
        </div>
      </div>

      {/* 右下角：圖例 (手機版精簡) */}
      <div className="absolute bottom-3 right-3 z-10 bg-white/95 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-md text-[9px] sm:text-[11px] space-y-1 text-slate-600 hidden sm:block">
        <div className="font-bold text-slate-800 border-b border-slate-200 pb-1">圖例說明</div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          <span>★ 推薦車道</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
          <span>南下車道 (左管)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block"></span>
          <span>北上車道 (右管)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span>
          <span>📹 CCTV 攝影機</span>
        </div>
      </div>

      {/* 點擊 CCTV 彈出影像浮動視窗 (手機版置中自適應，防止跑出螢幕外) */}
      {selectedCam && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-auto sm:left-12 md:left-24 z-20 bg-slate-900 text-white p-3 sm:p-3.5 rounded-2xl shadow-2xl border border-slate-700 max-w-sm w-auto space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs flex items-center gap-1.5 text-emerald-400 truncate">
              <Video className="h-4 w-4 shrink-0" />
              <span className="truncate">{selectedCam.title} ({selectedCam.locationName})</span>
            </span>
            <button
              onClick={() => {
                setSelectedCam(null);
                setIsPlayingVideo(false);
              }}
              className="text-slate-400 hover:text-white text-xs cursor-pointer p-1 shrink-0 ml-2"
            >
              ✕
            </button>
          </div>

          {/* 監視器影像畫面：預設為省電靜態封面 (每分鐘自動更新)，點擊播放後倒數 30 秒 */}
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
            <img
              src={
                isPlayingVideo
                  ? `${selectedCam.url}&_t=${Date.now()}`
                  : `${selectedCam.url}&_t=${snapshotTimestamp}`
              }
              alt={selectedCam.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />

            {/* 若未播放：顯示省電封面提示與播放按鈕 */}
            {!isPlayingVideo ? (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center space-y-2">
                <span className="text-[10px] text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-700">
                  ⚡ 省電靜態截圖 (每分鐘更新)
                </span>
                <button
                  onClick={() => {
                    setIsPlayingVideo(true);
                    setVideoTimer(30);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>點擊播放 30 秒即時影像</span>
                </button>
              </div>
            ) : (
              /* 若正在播放：右上角顯示 30 秒倒數計時 */
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-slate-950/85 px-2 py-0.5 rounded-md border border-emerald-500/40 text-[10px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>連續播放中：{videoTimer}s 後暫停</span>
              </div>
            )}
          </div>

          {/* 底部控制與外部連結 */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
            {isPlayingVideo ? (
              <button
                onClick={() => setVideoTimer(30)}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[10px] cursor-pointer"
                title="延長 30 秒播放"
              >
                <RefreshCw className="h-3 w-3" />
                <span>延長播放 (+30s)</span>
              </button>
            ) : (
              <span className="text-[10px] text-slate-400">主動監看模式</span>
            )}
            <a
              href={selectedCam.url}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold text-[10px]"
            >
              開啟外部網頁原串流 <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* 底部即時 CCTV 攝影機快捷點位條 (手機版也支援滑動選取) */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-2xl border border-slate-700/80 shadow-md max-w-[calc(100%-24px)] sm:max-w-none">
        <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1 shrink-0 mr-1">
          <Video className="h-3 w-3 text-emerald-400" />
          <span className="hidden sm:inline">快捷 CCTV：</span>
        </span>
        <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-[340px] md:max-w-[420px] scrollbar-none">
          {CCTV_CAMERAS.filter((c) => c.direction === currentDirection).map((cam) => (
            <button
              key={cam.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCam(cam);
                setIsPlayingVideo(false);
                setVideoTimer(30);
                goToK(cam.mileage);
              }}
              className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-mono whitespace-nowrap transition cursor-pointer shrink-0 ${
                selectedCam?.id === cam.id
                  ? "bg-emerald-500 text-slate-950 font-bold"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {cam.mileage.toFixed(1)}K
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

