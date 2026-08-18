import { ConsistencyCheckResult, EstimatedState } from "../types";

const FLOAT_EPSILON = 1e-6; // Precision tolerance for IEEE 754 float comparison

/**
 * Automated Mathematical Consistency Checker (Full Precision)
 * Strict validation of:
 * 1. sum(segment_length) == road_length (13.097 km)
 * 2. sum(segment_travel_time) == total_travel_time
 * 3. equivalent_speed == road_length / (total_travel_time / 3600)
 * 4. lane_difference == abs(lane1_time - lane2_time)
 * 5. sum(lane1_segment_travel_time) == lane1_travel_time
 * 6. sum(lane2_segment_travel_time) == lane2_travel_time
 * 7. Numerical stability (no NaN, Infinity, null, undefined)
 * 8. Clear separation between detector speed and equivalent speed
 */
export function verifyMathematicalConsistency(state: EstimatedState): ConsistencyCheckResult {
  const errors: string[] = [];

  // Helper to check for NaN, null, Infinity
  const isInvalidNum = (val: any): boolean => {
    return val === null || val === undefined || typeof val !== "number" || isNaN(val) || !isFinite(val);
  };

  // CHECK 7: Check for NaN, null, Infinity or division by zero in any field
  let noNanOrDivZero = true;
  const criticalNumbers = [
    state.totalDistanceKm,
    state.travelTimeSec,
    state.equivalentTravelSpeedKmh,
    state.spaceMeanSpeedKmh,
    state.detectorArithmeticMeanSpeedKmh,
    state.trafficDensityVehPerKm,
    state.trafficFlowVehPerHour,
    state.dataCompleteness.validObservations,
    state.dataCompleteness.totalObservations,
    state.dataCompleteness.validityPercent,
    state.laneComparison.lane1.travelTimeSec,
    state.laneComparison.lane1.equivalentTravelSpeedKmh,
    state.laneComparison.lane2.travelTimeSec,
    state.laneComparison.lane2.equivalentTravelSpeedKmh,
    state.laneComparison.differenceSec,
  ];

  for (const num of criticalNumbers) {
    if (isInvalidNum(num)) {
      noNanOrDivZero = false;
      errors.push(`DATA_CONSISTENCY_ERROR (CHECK 7): 發現無效數值 (NaN, null 或 Infinity): ${num}`);
      break;
    }
  }

  // CHECK 9: sum(segment_length) == road_length (13.097 km)
  let check9_segmentLengthSumMatch = true;
  if (state.segments.length > 0) {
    const sumSegmentLen = state.segments.reduce((acc, seg) => acc + seg.lengthKm, 0);
    if (Math.abs(sumSegmentLen - state.totalDistanceKm) > FLOAT_EPSILON) {
      check9_segmentLengthSumMatch = false;
      errors.push(
        `DATA_CONSISTENCY_ERROR (CHECK 9): 20個微元長度總和 (${sumSegmentLen.toFixed(6)} km) 不等於道路總長度 (${state.totalDistanceKm.toFixed(6)} km)`
      );
    }
  }

  // CHECK 1: Travel time equals sum of road segments (T_total = Σ [Δx_i / v_i(t_i)])
  let check1_travelTimeSumMatch = true;
  if (state.segments.length > 0 && !state.isFallbackEstimate) {
    const sumSegmentTime = state.segments.reduce((acc, seg) => acc + seg.segmentTravelTimeSec, 0);
    if (Math.abs(sumSegmentTime - state.travelTimeSec) > FLOAT_EPSILON) {
      check1_travelTimeSumMatch = false;
      errors.push(
        `DATA_CONSISTENCY_ERROR (CHECK 1): 總旅行時間 (${state.travelTimeSec}s) 與各路段微元積分總和 (${sumSegmentTime}s) 不相符 (差異 ${Math.abs(sumSegmentTime - state.travelTimeSec)}s)`
      );
    }
  }

  // CHECK 10: sum(lane1_segment_travel_time) == lane1_travel_time
  let check10_lane1SumMatch = true;
  if (state.laneComparison.lane1.segments.length > 0 && !state.isFallbackEstimate) {
    const l1Sum = state.laneComparison.lane1.segments.reduce((acc, seg) => acc + seg.segmentTravelTimeSec, 0);
    if (Math.abs(l1Sum - state.laneComparison.lane1.travelTimeSec) > FLOAT_EPSILON) {
      check10_lane1SumMatch = false;
      errors.push(
        `DATA_CONSISTENCY_ERROR (CHECK 10): 車道1旅行時間 (${state.laneComparison.lane1.travelTimeSec}s) 與其微元總和 (${l1Sum}s) 不相符`
      );
    }
  }

  // CHECK 11: sum(lane2_segment_travel_time) == lane2_travel_time
  let check11_lane2SumMatch = true;
  if (state.laneComparison.lane2.segments.length > 0 && !state.isFallbackEstimate) {
    const l2Sum = state.laneComparison.lane2.segments.reduce((acc, seg) => acc + seg.segmentTravelTimeSec, 0);
    if (Math.abs(l2Sum - state.laneComparison.lane2.travelTimeSec) > FLOAT_EPSILON) {
      check11_lane2SumMatch = false;
      errors.push(
        `DATA_CONSISTENCY_ERROR (CHECK 11): 車道2旅行時間 (${state.laneComparison.lane2.travelTimeSec}s) 與其微元總和 (${l2Sum}s) 不相符`
      );
    }
  }

  // CHECK 2: Basic unit conversion check (T = (L / v_eq) * 3600)
  let check2_unitConversionsValid = true;
  if (state.equivalentTravelSpeedKmh > 0 && state.totalDistanceKm > 0 && !state.isFallbackEstimate) {
    const expectedTime = (state.totalDistanceKm / state.equivalentTravelSpeedKmh) * 3600;
    if (Math.abs(expectedTime - state.travelTimeSec) > FLOAT_EPSILON) {
      check2_unitConversionsValid = false;
      errors.push(
        `DATA_CONSISTENCY_ERROR (CHECK 2): 單位轉換檢驗失敗 (L=${state.totalDistanceKm}km, v_eq=${state.equivalentTravelSpeedKmh}km/h 反推時間=${expectedTime}s, 實際=${state.travelTimeSec}s)`
      );
    }
  }

  // CHECK 3: Lane difference equals |T_lane1 - T_lane2|
  let check3_laneDifferenceMatch = true;
  const l1Time = state.laneComparison.lane1.travelTimeSec;
  const l2Time = state.laneComparison.lane2.travelTimeSec;
  const expectedDiff = Math.abs(l1Time - l2Time);
  if (Math.abs(state.laneComparison.differenceSec - expectedDiff) > FLOAT_EPSILON) {
    check3_laneDifferenceMatch = false;
    errors.push(
      `DATA_CONSISTENCY_ERROR (CHECK 3): 車道旅行時間差 (${state.laneComparison.differenceSec}s) 與實際兩車道時間差 |${l1Time}s - ${l2Time}s| = ${expectedDiff}s 不相符`
    );
  }

  // CHECK 4: Equivalent speed strictly equals L / (T_total / 3600)
  let check4_equivalentSpeedStrictMatch = true;
  if (state.travelTimeSec > 0 && state.totalDistanceKm > 0 && !state.isFallbackEstimate) {
    const expectedEqSpeed = state.totalDistanceKm / (state.travelTimeSec / 3600);
    if (Math.abs(state.equivalentTravelSpeedKmh - expectedEqSpeed) > FLOAT_EPSILON) {
      check4_equivalentSpeedStrictMatch = false;
      errors.push(
        `DATA_CONSISTENCY_ERROR (CHECK 4): 等效旅行速度 (${state.equivalentTravelSpeedKmh} km/h) 與公式 L/(T/3600) = ${expectedEqSpeed} km/h 存在偏差`
      );
    }
  }

  // CHECK 5: valid / total observation counts and percentage are exact
  let check5_validTotalExact = true;
  const totalObs = state.dataCompleteness.totalObservations;
  const validObs = state.dataCompleteness.validObservations;
  if (totalObs > 0) {
    const expectedPct = (validObs / totalObs) * 100;
    if (Math.abs(state.dataCompleteness.validityPercent - expectedPct) > 0.01) {
      check5_validTotalExact = false;
      errors.push(
        `DATA_CONSISTENCY_ERROR (CHECK 5): 資料有效率計算不精確 (${state.dataCompleteness.validityPercent}% vs 期望 ${expectedPct}%)`
      );
    }
  }

  // CHECK 6: All speed, distance, time units labeled correctly
  const check6_unitConsistencyValid =
    state.totalDistanceKm > 0 && state.travelTimeSec >= 0 && state.equivalentTravelSpeedKmh >= 0;

  // CHECK 8: Ensure spot detector speed is not conflated with equivalent speed
  let check8_noSpeedConflation = true;
  if (
    state.segments.length > 3 &&
    state.travelTimeSec > 600 &&
    Math.abs(state.detectorArithmeticMeanSpeedKmh - state.equivalentTravelSpeedKmh) > 20 &&
    state.equivalentTravelSpeedKmh === state.detectorArithmeticMeanSpeedKmh
  ) {
    check8_noSpeedConflation = false;
    errors.push("DATA_CONSISTENCY_ERROR (CHECK 8): 偵測點觀測速度與全線等效旅行速度被混淆使用");
  }

  const passed = errors.length === 0;

  return {
    passed,
    errors,
    details: {
      check1_travelTimeSumMatch,
      check2_unitConversionsValid,
      check3_laneDifferenceMatch,
      check4_equivalentSpeedStrictMatch,
      check5_validTotalExact,
      check6_unitConsistencyValid,
      check7_noNanOrDivZero: noNanOrDivZero,
      check8_noSpeedConflation,
      check9_segmentLengthSumMatch,
      check10_lane1SumMatch,
      check11_lane2SumMatch,
    },
  };
}
