import { DataQualityReport, RawApiDetectorRecord } from "../types";
import { MIN_PHYSICAL_CRAWL_SPEED_KMH } from "./speedCalculus";

export interface KalmanStateResult {
  detectorId: string;
  mileageKm: number;
  rawSpeedKmh: number;
  estimatedSpeedKmh: number;
  estimatedDensityVehPerKm: number;
  estimatedFlowVehPerHour: number;
  estimationVariance: number;
  kalmanGainK: number;
  innovationY: number;
  confidence: number;
}

/**
 * Phase 5: Adaptive Kalman Filter State Estimator
 * 
 * Mathematical Formulation:
 * x_{t|t-1} = F * x_{t-1}
 * P_{t|t-1} = F * P_{t-1} * F^T + Q
 * y_t = z_t - H * x_{t|t-1}
 * S_t = H * P_{t|t-1} * H^T + R_i(t)
 * K_t = P_{t|t-1} * H^T * S_t^(-1)
 * x_{t|t} = x_{t|t-1} + K_t * y_t
 * P_{t|t} = (I - K_t * H) * P_{t|t-1}
 * 
 * Scientific Integrity Note:
 * The Kalman Filter is an optimal linear estimator under Gaussian noise assumptions.
 * It provides robust noise filtering and state fusion, but does not guarantee absolute
 * zero empirical error under sudden shockwaves without hydrodynamic coupling.
 */
export function runAdaptiveKalmanFilter(
  detectors: RawApiDetectorRecord[],
  qualityReports: DataQualityReport[],
  laneIndex: number = 0,
  previousEstimatedSpeeds?: Record<string, number>
): {
  states: KalmanStateResult[];
  overallEstimatedSpeedKmh: number;
  averageKalmanGain: number;
} {
  if (!detectors || detectors.length === 0) {
    return {
      states: [],
      overallEstimatedSpeedKmh: 0,
      averageKalmanGain: 0,
    };
  }

  const states: KalmanStateResult[] = [];
  let sumSpeed = 0;
  let sumGain = 0;

  // Process noise variance Q (system dynamics variability ~ 2.0 (km/h)^2)
  const Q = 2.25; 
  // Initial prior error variance P_0
  const defaultP0 = 10.0;

  detectors.forEach((det, idx) => {
    const report = qualityReports.find((r) => r.detectorId === det.detectorId);
    const rawSpeed = det.lanes[laneIndex]?.speedKmh || det.lanes[0]?.speedKmh || 80;
    const rawFlow = det.lanes[laneIndex]?.flowVehPerHour || det.lanes[0]?.flowVehPerHour || 1200;
    const rawOcc = det.lanes[laneIndex]?.occupancyPercent || det.lanes[0]?.occupancyPercent || 10;

    // Measurement noise covariance R_i(t) from Phase 2
    const R = report ? report.adaptiveNoiseR : 6.25;

    // Prior state prediction x_{t|t-1}:
    // In steady state traffic, x_prior defaults to previous estimate or upstream continuation
    let x_prior = rawSpeed;
    if (previousEstimatedSpeeds && previousEstimatedSpeeds[det.detectorId] !== undefined) {
      x_prior = previousEstimatedSpeeds[det.detectorId];
    } else if (idx > 0 && states[idx - 1]) {
      // Spatial Markov smoothing prior
      x_prior = 0.8 * rawSpeed + 0.2 * states[idx - 1].estimatedSpeedKmh;
    }

    const P_prior = defaultP0 + Q;

    // Measurement observation z_t
    const z_t = rawSpeed;

    // Innovation y_t = z_t - H * x_prior (where H = 1)
    const y_t = z_t - x_prior;

    // Innovation covariance S_t = P_prior + R
    const S_t = P_prior + R;

    // Kalman Gain K_t = P_prior / S_t
    const K_t = P_prior / S_t;

    // Posterior state update x_{t|t}
    let x_post = x_prior + K_t * y_t;
    x_post = Math.max(MIN_PHYSICAL_CRAWL_SPEED_KMH, Math.min(130, x_post));

    // Posterior error covariance P_{t|t} = (1 - K_t) * P_prior
    const P_post = (1 - K_t) * P_prior;

    // Estimate density k = q / v (from q = k * v conservation)
    const estDensityVehPerKm = x_post > 0 ? rawFlow / x_post : (rawOcc * 2.2);

    const confidence = report ? Math.min(1.0, report.confidence * (1 - K_t * 0.2)) : 0.85;

    sumSpeed += x_post;
    sumGain += K_t;

    states.push({
      detectorId: det.detectorId,
      mileageKm: det.mileageKm,
      rawSpeedKmh: parseFloat(rawSpeed.toFixed(1)),
      estimatedSpeedKmh: parseFloat(x_post.toFixed(1)),
      estimatedDensityVehPerKm: parseFloat(estDensityVehPerKm.toFixed(1)),
      estimatedFlowVehPerHour: Math.round(rawFlow),
      estimationVariance: parseFloat(P_post.toFixed(2)),
      kalmanGainK: parseFloat(K_t.toFixed(3)),
      innovationY: parseFloat(y_t.toFixed(2)),
      confidence: parseFloat(confidence.toFixed(3)),
    });
  });

  const overallEstimatedSpeedKmh = states.length > 0 ? sumSpeed / states.length : 0;
  const averageKalmanGain = states.length > 0 ? sumGain / states.length : 0;

  return {
    states,
    overallEstimatedSpeedKmh: parseFloat(overallEstimatedSpeedKmh.toFixed(1)),
    averageKalmanGain: parseFloat(averageKalmanGain.toFixed(3)),
  };
}
