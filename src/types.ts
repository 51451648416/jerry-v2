/**
 * Single Source of Truth (SSOT) Types for Hsuehshan Tunnel Traffic State Estimator
 * Strictly distinguishing four speed definitions:
 * 1. detector_arithmetic_mean_speed: Spot detector arithmetic mean across stations
 * 2. space_mean_speed: Spatial harmonic mean across detectors
 * 3. estimated_segment_speed: Model speed on specific discretized road slice v_i(t_i)
 * 4. equivalent_travel_speed: v_eq = L / (T_total / 3600) (computed from full precision T)
 */

export type Direction = "S" | "N";

export type StandardDirection = "N" | "S" | "E" | "W" | "Unknown";

export interface StandardVdMetadata {
  route: string;
  direction: StandardDirection;
  mileage_km: number;
  raw_mileage: string;
  vd_id: string;
}

export type CongestionState = "FREE_FLOW" | "TRANSITION" | "LOW_SPEED" | "INSUFFICIENT_DATA";

export type NonlinearTrafficState = "FREE_FLOW" | "CONGESTED";

export type TrafficSpeedRegime =
  | "REGIME_GT_80"
  | "REGIME_70_80"
  | "REGIME_60_70"
  | "REGIME_50_60"
  | "REGIME_LT_50";

export interface ApiLatencyMetrics {
  apiTimestamp?: string;
  receivedTimestamp?: string;
  tauApiSec: number;
  isLatencyKnown: boolean;
  statusTag: "LATENCY_KNOWN" | "LATENCY_UNKNOWN";
  latencyFormatted: string;
}

export interface DelayAwareSegmentResult {
  segmentIndex: number;
  mileageKm: number;
  trafficState: NonlinearTrafficState;
  stateLabel: string;
  isCongested: boolean;
  rawSpeedKmh: number;
  timeAlignedSpeedKmh: number;
  nonLinearEstimatedSpeedKmh: number;
  tauApiSec: number;
  isLatencyKnown: boolean;
  tauPropagationSec: number;
  spatialGradientDvDx: number;
  shockwaveSpeedW: number;
  densityVehPerKm: number;
  occupancyPercent: number;
  flowVehPerHour: number;
  segmentTravelTimeSec: number;
  cumulativeArrivalSec: number;
}

export interface SpeedRegimeBenchmarkMetric {
  regime: TrafficSpeedRegime;
  speedRangeLabel: string;
  sampleCount: number;
  maeSec: number;
  rmseSec: number;
  biasSec: number;
  p95AbsErrorSec: number;
  baselineMaeSec: number;
  nonlinearModelMaeSec: number;
  improvementSec: number;
}

export interface RawApiDetectorRecord {
  detectorId: string;
  timestamp: string;
  direction: Direction;
  mileageKm: number;
  roadSection: string;
  route?: string;
  rawMileage?: string;
  lanes: {
    laneId: number; // 1-indexed (1: Inside/Lane 1, 2: Outside/Lane 2)
    speedKmh: number;
    flowVehPerHour: number;
    occupancyPercent: number;
  }[];
  rawPayload?: any;
}

export interface DataQualityReport {
  detectorId: string;
  isValid: boolean;
  isSuspicious: boolean;
  missingFields: string[];
  anomalies: string[];
  confidence: number;
  adaptiveNoiseR: number;
}

export interface RoadSegmentSlice {
  segmentIndex: number;
  startMileageKm: number;
  endMileageKm: number;
  lengthKm: number; // Exactly 13.097 / 20 = 0.65485 km (full precision)
  upstreamDetectorId: string;
  downstreamDetectorId: string;
  estimatedSegmentSpeedKmh: number; // estimated_segment_speed v_i(t_i) (full precision)
  segmentTravelTimeSec: number; // Δx_i / v_i(t_i) * 3600 (full precision)
  cumulativeArrivalSec: number; // t_i (full precision)
}

export interface LaneState {
  laneId: number;
  laneName: string;
  detectorArithmeticMeanSpeedKmh: number; // detector_arithmetic_mean_speed
  spaceMeanSpeedKmh: number; // space_mean_speed (harmonic mean)
  travelTimeSec: number; // T_lane = Σ [Δx_i / v_lane,i(t_i)] (full precision)
  travelTimeFormatted: string; // Formatted at UI step: e.g. "87 分 51 秒"
  equivalentTravelSpeedKmh: number; // v_eq = L / (T_lane / 3600) (full precision)
  flowVehPerHour: number;
  occupancyPercent: number;
  densityVehPerKm: number;
  segments: RoadSegmentSlice[]; // 20 slices
}

export interface LaneComparison {
  lane1: LaneState;
  lane2: LaneState;
  differenceSec: number; // |T_lane1 - T_lane2| (full precision)
  fasterLaneId: number | null; // 1 (內側) or 2 (外側) or null if equal
  comparisonTitle: string; // 嚴格格式：車道交通狀態比較
  safetyNotice: string; // 嚴格格式：行車安全告示
  isSignificantDiff: boolean; // ΔT >= 60
  
  // 隧道內在線訓練之車道切換與分流決策指標 (Trained Lane Switching & Allocation State)
  trainedSwitchMarginSec?: number; // 經機器學習校準之動態車道切換時間差門檻 (秒)
  trainedLaneSelectionConfidence?: number; // 車道推薦決策信心度 (%)
  lane1SpeedBiasFactor?: number; // 內側車道偏置修正
  laneCouplingFriction?: number; // 雙車道紊流耦合係數
  
  // 極端情況雙重重算驗證機制 (Double Verification for Extreme Lane Divergence)
  doubleVerification?: DoubleVerificationState;
  isExtremeSituation?: boolean; // 若重算後雙車道速差仍 > 20 km/h，判定為極端異常路況
}

export interface ApiDirectVdTelemetry {
  detectorId: string;
  mileageKm: number;
  lane1SpeedKmh: number;
  lane2SpeedKmh: number;
  speedDeltaKmh: number;
  lane1FlowVehPerHour: number;
  lane2FlowVehPerHour: number;
  lane1OccupancyPercent: number;
  lane2OccupancyPercent: number;
  isExtremeSpot: boolean;
  statusTag: "NORMAL" | "SPEED_DIVERGENCE" | "EXTREME_SPOT";
}

export interface DoubleVerificationState {
  triggered: boolean; // 是否觸發二次驗證 (當初算兩車道速差 > 23 km/h 時觸發)
  triggerThresholdKmh: number; // 23 km/h 觸發門檻
  initialLaneDiffKmh: number; // 初次計算兩車道速差 (km/h)
  recalculatedLaneDiffKmh: number; // 重算後兩車道速差 (km/h)
  recalculatedThresholdKmh: number; // 20 km/h 極端判定門檻
  isExtremeSituation: boolean; // 若重算後仍 > 20 km/h，正式判定為極端情境
  verificationMethod: string; // 驗證重算演算法名稱
  statusText: string; // 狀態說明
  extremeExplanation?: string; // 極端情況說明
  directApiDisplay: {
    receivedTimestamp: string;
    lane1AvgApiSpeedKmh: number;
    lane2AvgApiSpeedKmh: number;
    lane1ApiFlowVehPerHour: number;
    lane2ApiFlowVehPerHour: number;
    lane1ApiOccupancyPercent: number;
    lane2ApiOccupancyPercent: number;
    totalVdStations: number;
    vdReadings: ApiDirectVdTelemetry[];
  };
}

export interface CongestionClassification {
  level: CongestionState;
  label: string;
  description: string;
  criteria: string;
}

export interface DataCompleteness {
  validObservations: number;
  totalObservations: number;
  validityPercent: number; // valid / total * 100
}

export interface ModelUncertainty {
  hasGroundTruth: boolean;
  statusText: string; // "模型不確定度：無歷史真值資料可驗證"
  description: string;
}

export interface ConsistencyCheckResult {
  passed: boolean;
  errors: string[];
  details: {
    check1_travelTimeSumMatch: boolean;
    check2_unitConversionsValid: boolean;
    check3_laneDifferenceMatch: boolean;
    check4_equivalentSpeedStrictMatch: boolean;
    check5_validTotalExact: boolean;
    check6_unitConsistencyValid: boolean;
    check7_noNanOrDivZero: boolean;
    check8_noSpeedConflation: boolean;
    check9_segmentLengthSumMatch: boolean;
    check10_lane1SumMatch: boolean;
    check11_lane2SumMatch: boolean;
  };
}

export interface RawVsModelComparison {
  rawApi: {
    lane1SpeedKmh: number;
    lane1FlowVehPerMin: number;
    lane1FlowVehPerHour: number;
    lane1OccupancyPercent: number;
    lane2SpeedKmh: number;
    lane2FlowVehPerMin: number;
    lane2FlowVehPerHour: number;
    lane2OccupancyPercent: number;
    overallSpeedKmh: number;
    observationTag: "RAW_API_OBSERVATION";
    description: string;
  };
  modelEstimate: {
    lane1EquivalentSpeedKmh: number;
    lane1TravelTimeSec: number;
    lane2EquivalentSpeedKmh: number;
    lane2TravelTimeSec: number;
    laneDifferenceSec: number;
    overallEquivalentSpeedKmh: number;
    overallTravelTimeSec: number;
    description: string;
  };
  modelAdjustment: {
    lane1DeltaKmh: number;
    lane2DeltaKmh: number;
    overallDeltaKmh: number;
    terminologyNotice: string;
  };
  trafficStateValidation: {
    speedDirectionMatch: boolean;
    flowPreservedMatch: boolean;
    occupancySpeedConsistency: boolean;
    supportsLane2Faster: boolean;
    analyticalExplanation: string;
  };
  dataPipelineSteps: {
    stepNumber: number;
    name: string;
    description: string;
  }[];
}

/**
 * Single Source of Truth: EstimatedState
 * All UI components must read ONLY from this structure.
 */
export interface EstimatedState {
  timestamp: string;
  direction: Direction;
  directionLabel: string;
  totalDistanceKm: number; // L = 13.097 km (exact)
  
  // Separation of actual detectors vs model slices:
  actualVdStationCount: number; // e.g. 19 or 20 VD stations
  modelSliceCount: number; // 20 slices (fixed)

  // Official Travel Time (T_total = Σ [Δx_i / v_i(t_i)]) in full precision:
  travelTimeSec: number;
  travelTimeFormatted: string; // "XX 分 YY 秒" (formatted at UI layer)
  isFallbackEstimate: boolean;

  // Four strictly distinguished speeds (full precision):
  equivalentTravelSpeedKmh: number; // L / (T_total / 3600)
  spaceMeanSpeedKmh: number; // Spatial harmonic mean
  detectorArithmeticMeanSpeedKmh: number; // Spot detector arithmetic mean
  detectorMeanSpeedKmh?: number; // legacy alias
  
  // Traffic flow & density
  trafficDensityVehPerKm: number;
  trafficFlowVehPerHour: number;
  
  // Congestion & Quality
  congestion: CongestionClassification;
  dataCompleteness: DataCompleteness;
  modelUncertainty: ModelUncertainty;

  // Lane specific states & comparison
  laneComparison: LaneComparison;
  
  // 極端情況雙重重算驗證機制 (Double Verification for Extreme Lane Divergence)
  doubleVerification?: DoubleVerificationState;
  isExtremeSituation?: boolean; // 若重算後雙車道速差仍 > 20 km/h，判定為極端異常路況
  estimationMethod?: "PRIMARY_TRAJECTORY_CALCULUS" | "ALTERNATIVE_ROBUST_FALLBACK";

  // RAW vs MODEL Separation & Diagnostic Info
  rawVsModel: RawVsModelComparison;

  // 20 Spatial slices
  segments: RoadSegmentSlice[];

  // Delay-Aware Nonlinear Traffic State Model Details
  apiLatency: ApiLatencyMetrics;
  nonlinearTrafficState: {
    state: NonlinearTrafficState;
    stateLabel: string;
    isCongested: boolean;
    tauPropagationSec: number;
    delayAwareDetails: DelayAwareSegmentResult[];
  };

  // Mathematical Consistency Verification
  consistencyCheck: ConsistencyCheckResult;
  
  // 0K ~ 54K Full Corridor State & Departure Recommendations
  corridorState?: CorridorEstimatedState;
  departureRecommendation?: DepartureRecommendation;
}

export interface CorridorInterchange {
  name: string;
  mileageKm: number;
  label: string;
  shortName: string;
}

export interface CorridorSegment {
  id: string;
  name: string;
  fromKm: number;
  toKm: number;
  lengthKm: number;
  direction: Direction;
  avgSpeedKmh: number;
  travelTimeSec: number;
  travelTimeFormatted: string;
  status: "FREE_FLOW" | "TRANSITION" | "CONGESTED";
  statusLabel: string;
  colorClass: string;
  detectorCount: number;
  isTunnelSection: boolean;
}

export interface CorridorEstimatedState {
  totalDistanceKm: number; // 54.0 km (0K ~ 54K)
  totalTravelTimeMinutes: number;
  totalTravelTimeFormatted: string;
  averageSpeedKmh: number;
  bottleneckSegment: string;
  bottleneckSpeedKmh: number;
  congestionRating: "FREE_FLOW" | "MODERATE" | "HEAVY_CONGESTION";
  congestionRatingLabel: string;
  segments: CorridorSegment[];
  interchanges: CorridorInterchange[];
  totalDetectorsFound: number;
}

export interface DepartureTimeSlot {
  offsetMinutes: number;
  departureTime: string; // e.g. "08:15"
  departureDateStr?: string; // e.g. "2026/08/17"
  departureLabel: string; // e.g. "預定出發 (2026/08/17 08:15)"
  estimatedTravelTimeMinutes: number;
  estimatedTravelTimeFormatted: string;
  estimatedSpeedKmh: number;
  congestionIndex: number; // 0 ~ 100
  isRecommended: boolean;
  timeSavedVsWorstMinutes: number;
  trafficTrend: "INCREASING" | "STABLE" | "DECREASING";
  advice: string;
}

export interface DepartureRecommendation {
  origin: string;
  destination: string;
  direction: Direction;
  distanceKm: number;
  currentTime: string;
  targetDateTimeStr: string; // e.g. "2026-08-17 08:30"
  targetYear: number;
  targetMonth: number;
  targetDay: number;
  targetDayOfWeek: string; // e.g. "星期六"
  isWeekend: boolean;
  holidayName?: string; // e.g. "中秋節連假", "春節疏運", "一般週末"
  recommendedSlot: DepartureTimeSlot;
  slots: DepartureTimeSlot[];
  insightSummary: string;
  temporalFactor: number; // 考慮日期與時段的壅塞倍率
  trainedSequenceDatasetCount: number; // 用於訓練模型之全序列資料集樣本總數
  matchedHistoricalSequences: {
    id: string;
    timeFormatted: string;
    direction: Direction;
    speedKmh: number;
    travelTimeFormatted: string;
    corridorRange?: string;
    corridorTravelTimeFormatted?: string;
    holidayTag?: string;
    congestionLevel: string;
    similarityScore: number;
  }[];
  sequenceModelTrainedVersion: number;
  sequenceConfidenceScore: number;
  sequenceTrainingLossMae: number;
}

export interface CapturedDatasetRecord {
  id: string;
  timestamp: string;
  unixTimestampMs?: number;
  timeFormatted: string;
  dateStr?: string; // YYYY-MM-DD
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
  dayOfWeek: string;
  isWeekend: boolean;
  holidayTag?: string;
  direction: Direction;
  totalDetectors: number;
  
  // 雪山隧道核心段 (15.1K ~ 28.3K)
  tunnelLane1SpeedKmh: number;
  tunnelLane2SpeedKmh: number;
  tunnelEqSpeedKmh: number;
  tunnelTravelTimeSec: number;
  tunnelTravelTimeFormatted: string;

  // 國道5號全線走廊段 (0K ~ 54K，南港系統-石碇-坪林-頭城-宜蘭-羅東-蘇澳)
  corridorRange?: string; // "0K-54K (南港系統-蘇澳端)"
  corridor0to50TravelTimeMin: number; // 保持向後相容
  corridor0to54TravelTimeSec?: number;
  corridor0to54TravelTimeMin?: number;
  corridorAvgSpeedKmh: number;
  corridorBottleneck?: string;
  corridorSegmentCount?: number;
  corridorSegmentsSummary?: {
    name: string;
    fromKm: number;
    toKm: number;
    lengthKm: number;
    speedKmh: number;
    travelSec: number;
    status: string;
  }[];

  recommendedLane: string;
  congestionLevel: string;
  originToDestSummary: string;
  dataCollectTime?: string;
  modelPredictions?: {
    rawApiSec: number;
    harmonicSec: number;
    spatialTrajectorySec: number;
    kalmanSec: number;
    delayAwareNonlinearSec: number;
    learnedModelSec: number;
  };
}

export interface LearnedModelParameters {
  // 全線與雪隧總體物理與統計參數 (Macro Traffic Dynamics)
  freeFlowSpeedKmh: number; // v_f (Baseline 90.0)
  criticalDensityKcVehPerLane: number; // k_c (Baseline 45.0)
  capacityQMaxVehPerLane: number; // q_max (Baseline 2025.0)
  greenshieldsExponentM: number; // m (Baseline 1.0)
  kalmanNoiseRScale: number; // R scale (Baseline 1.0)
  latencyDecayTauFactor: number; // tau factor (Baseline 1.0)
  diurnalPeakWeight: number; // Diurnal weight (Baseline 1.0)

  // 隧道內車道切換與分流決策學習參數 (Tunnel Lane Switching & Allocation Dynamics)
  laneSwitchMarginSec: number; // 車道切換收益門檻 ΔT (Baseline 18.0 秒)
  lane1SpeedBiasFactor: number; // 內側車道(Lane 1)相對阻力與流速偏差修正 (Baseline 1.02)
  laneCouplingFriction: number; // 雙車道紊流耦合阻力與跨車道剪力係數 (Baseline 0.12)
  laneChoiceSensitivity: number; // 車道選擇溫度/靈敏度係數 (Baseline 0.08)

  version: number;
  lastTrainedTimestamp: string;
  totalSamplesTrained: number;
}

export interface TrainingEpochRecord {
  epoch: number;
  trainLossMaeSec: number;
  trainLossRmseSec: number;
  trainLossMapePercent: number;
  valLossMaeSec: number;
  // 隧道內車道切換與分流學習指標
  laneSwitchAccuracyPercent?: number; // 車道推薦與切換判斷準確率 (%)
  laneDiffMaeSec?: number; // 雙車道時間差預測 MAE (秒)
}

export interface ContinuousLearningStatus {
  isTraining: boolean;
  isAutoLearningEnabled: boolean;
  currentParameters: LearnedModelParameters;
  baselineParameters: LearnedModelParameters;
  epochHistory: TrainingEpochRecord[];
  totalSamplesTrained: number;
  lastTrainedDate: string;
  baselineMaeSec: number;
  optimizedMaeSec: number;
  maeReductionPercent: number;
  // 隧道內車道切換訓練指標
  laneSwitchAccuracyPercent?: number;
  laneDiffMaeSec?: number;
  modelsComparison: {
    modelName: string;
    beforeTrainingMaeSec: number;
    afterTrainingMaeSec: number;
    accuracyGainPercent: number;
    description: string;
  }[];
}

export interface FinalEstimatorOutput {
  raw_api: {
    receivedTimestamp: string;
    totalDetectors: number;
    records: RawApiDetectorRecord[];
    rawPayload?: any;
  };
  estimated_state: EstimatedState;
  quality_reports: DataQualityReport[];
}

export interface SpeedRuleLevel {
  min: number;
  max: number;
  label: string;
  congestion: string;
  colorText: string;
  colorBg: string;
  colorBorder: string;
  badge: string;
}

export interface TdxCredentials {
  clientId: string;
  clientSecret: string;
}

export interface CctvCamera {
  id: string;
  code: string;
  direction: Direction;
  mileage: number;
  title: string;
  locationName: string;
  url: string;
}

export interface GroundTruthRecord {
  id?: string;
  tripId?: string;
  timestamp: string;
  direction: Direction;
  actualTravelTimeSec: number;
  rawApiEstimatedSec?: number;
  harmonicEstimatedSec?: number;
  spatialTrajectorySec?: number;
  kalmanFilterSec?: number;
  lwrKalmanSec?: number;
  rawApiTravelTimeSec?: number;
  harmonicTravelTimeSec?: number;
  spatialTrajectoryTimeSec?: number;
  kalmanTravelTimeSec?: number;
  lwrKalmanTravelTimeSec?: number;
  delayAwareNonlinearTimeSec?: number;
}

export interface ValidationModelMetric {
  modelKey: string;
  modelName: string;
  maeSec: number;
  rmseSec: number;
  mapePercent: number;
  meanBiasSec: number;
  medianAbsoluteErrorSec: number;
  p95AbsoluteErrorSec: number;
}

export interface ValidationMetricsResult {
  sampleSize: number;
  evaluationTimestamp?: string;
  models: ValidationModelMetric[];
  bestModelName: string;
  bestModelKey?: string;
  summaryText?: string;
  scientificIntegrityNote?: string;
}

export interface SpeedAnalysisMetrics {
  timeMeanSpeedKmh: number;
  spaceMeanSpeedKmh: number;
  cauchySchwarzDiffKmh: number;
  cauchySchwarzRatio?: number;
  isCauchySchwarzSatisfied?: boolean;
  totalDistanceKm: number;
  rawApiTravelTimeSec?: number;
  spaceMeanTravelTimeSec?: number;
  timeMeanTravelTimeSec?: number;
  timeUnderestimationSec?: number;
  timeUnderestimationPercent?: number;
  jensenExpectedTimeSec?: number;
  naiveTimeSec?: number;
  jensenTimeGapSec?: number;
}

export interface TrafficConservationStatus {
  inflowQ1?: number;
  outflowQ2?: number;
  inflowOutflowDelta?: number;
  massDiscrepancyVehPerHour?: number;
  estimatedDensityK?: number;
  isConserved: boolean;
  shockwaveSpeedKmh?: number;
  estimatedShockwaveSpeedKmh?: number;
  shockwaveDirection?: "DOWNSTREAM" | "UPSTREAM" | "STATIONARY";
  shockwaveDescription?: string;
  bottleneckLocationKm?: number | null;
  fundamentalDiagram?: {
    model: string;
    freeFlowSpeedKmh: number;
    jamDensityVehPerKm: number;
    capacityVehPerHour: number;
  };
}

export interface LaneEstimatedState {
  lane: number;
  laneName: string;
  estimatedSpeedKmh: number;
  estimatedTravelTimeSec: number;
  confidence: number;
  dataQuality: "HIGH" | "MEDIUM" | "LOW";
  spaceMeanSpeedKmh: number;
  timeMeanSpeedKmh: number;
}

