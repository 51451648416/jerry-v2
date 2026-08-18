import { SpeedAnalysisMetrics } from "../types";

/**
 * Phase 3: Speed Calculus, Harmonic Mean, and Inequality Analysis
 * 
 * Scientific Distinctions:
 * [MATHEMATICAL THEOREM]
 * 1. Time-Mean Speed vs Space-Mean Speed via Cauchy-Schwarz:
 *    (Σ v_i)(Σ 1/v_i) >= N^2  =>  v_TMS >= v_SMS  =>  L / v_TMS <= L / v_SMS
 *    (Using arithmetic mean TMS on variable speeds creates an underestimation bias for travel time).
 * 
 * 2. Jensen's Inequality for strictly convex f(v) = 1/v (f''(v) = 2/v^3 > 0 for v > 0):
 *    E[1/v] >= 1/E[v]  =>  E[T] = L * E[1/v] >= L / E[v]
 * 
 * [NUMERICAL STABILITY & SAFEGUARDS]
 * - Division-by-zero prevention: If speed is 0 km/h (standstill jam), we apply the physical
 *   crawling floor v_crawl = 3.6 km/h (1.0 m/s minimum creeping speed during queue discharge)
 *   with documented engineering annotation.
 */
export const MIN_PHYSICAL_CRAWL_SPEED_KMH = 3.6; // 1 m/s crawling creep

export function computeSpeedAnalysis(
  speedsKmh: number[],
  totalDistanceKm: number
): SpeedAnalysisMetrics {
  if (!speedsKmh || speedsKmh.length === 0) {
    return {
      timeMeanSpeedKmh: 0,
      spaceMeanSpeedKmh: 0,
      cauchySchwarzDiffKmh: 0,
      jensenExpectedTimeSec: 0,
      naiveTimeSec: 0,
      jensenTimeGapSec: 0,
      totalDistanceKm,
    };
  }

  const N = speedsKmh.length;
  let sumSpeed = 0;
  let sumInverseSpeed = 0;

  speedsKmh.forEach((s) => {
    // Engineering safeguard: Ensure positive speed for convex reciprocal
    const safeSpeed = Math.max(MIN_PHYSICAL_CRAWL_SPEED_KMH, s);
    sumSpeed += safeSpeed;
    sumInverseSpeed += 1 / safeSpeed;
  });

  // Time-Mean Speed (Arithmetic Mean)
  const v_TMS = sumSpeed / N;

  // Space-Mean Speed (Harmonic Mean)
  const v_SMS = N / sumInverseSpeed;

  // Cauchy-Schwarz Theorem Difference (v_TMS >= v_SMS)
  const cauchySchwarzDiffKmh = Math.max(0, v_TMS - v_SMS);

  // Naive Travel Time (L / v_TMS) in seconds
  const naiveTimeSec = v_TMS > 0 ? (totalDistanceKm / v_TMS) * 3600 : 0;

  // Jensen Expected Travel Time (L * E[1/v]) in seconds = L / v_SMS
  const jensenExpectedTimeSec = v_SMS > 0 ? (totalDistanceKm / v_SMS) * 3600 : 0;

  // Jensen Time Gap (ExpectedTime - NaiveTime >= 0)
  const jensenTimeGapSec = Math.max(0, jensenExpectedTimeSec - naiveTimeSec);

  return {
    timeMeanSpeedKmh: parseFloat(v_TMS.toFixed(2)),
    spaceMeanSpeedKmh: parseFloat(v_SMS.toFixed(2)),
    cauchySchwarzDiffKmh: parseFloat(cauchySchwarzDiffKmh.toFixed(2)),
    naiveTimeSec: Math.round(naiveTimeSec),
    jensenExpectedTimeSec: Math.round(jensenExpectedTimeSec),
    jensenTimeGapSec: Math.round(jensenTimeGapSec),
    totalDistanceKm: parseFloat(totalDistanceKm.toFixed(2)),
  };
}

/**
 * Calculates Space-Mean Speed for a sequence of speeds.
 */
export function computeHarmonicMean(speedsKmh: number[]): number {
  if (!speedsKmh || speedsKmh.length === 0) return 0;
  let sumReciprocal = 0;
  speedsKmh.forEach((s) => {
    const safeS = Math.max(MIN_PHYSICAL_CRAWL_SPEED_KMH, s);
    sumReciprocal += 1 / safeS;
  });
  return speedsKmh.length / sumReciprocal;
}
