import { GroundTruthRecord, ValidationMetricsResult } from "../types";
import {
  evaluateSpeedRegimeGroundTruthBenchmarks,
  generateCalibratedGroundTruthDatabase,
} from "./delayAwareEngine";

export {
  evaluateSpeedRegimeGroundTruthBenchmarks,
  generateCalibratedGroundTruthDatabase,
};

/**
 * 完整多模型統計基準評測
 */
export function evaluateGroundTruthBenchmarks(
  records: GroundTruthRecord[]
): ValidationMetricsResult {
  const result = evaluateSpeedRegimeGroundTruthBenchmarks(records);
  return result.overallMetrics;
}

export function generateSampleGroundTruthDataset(count: number = 35): GroundTruthRecord[] {
  return generateCalibratedGroundTruthDatabase(count);
}
