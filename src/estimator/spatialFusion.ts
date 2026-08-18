import { RawApiDetectorRecord } from "../types";
import { MIN_PHYSICAL_CRAWL_SPEED_KMH } from "./speedCalculus";

export interface RoadSegmentSlice {
  segmentIndex: number;
  startMileageKm: number;
  endMileageKm: number;
  lengthKm: number;
  upstreamDetectorId: string;
  downstreamDetectorId: string;
  interpolatedSpeedKmh: number;
  segmentTravelTimeSec: number;
  cumulativeArrivalSec: number;
}

/**
 * Phase 4: Multi-Detector Spatial Trajectory & Dynamic Trajectory Integration
 * 
 * Rather than assuming a static road-wide average speed, the trajectory
 * tracks a vehicle advancing along successive slices:
 * T_0 = 0
 * T_i = T_{i-1} + Δx_i / v_i(t_0 + T_{i-1})
 * T_total = Σ [Δx_i / v_i(t_0 + T_{i-1})]
 */
export function computeSpatialTrajectory(
  detectors: RawApiDetectorRecord[],
  laneIndex: number = 0 // 0 for Lane 1, 1 for Lane 2, or -1 for detector-average
): {
  segments: RoadSegmentSlice[];
  totalTravelTimeSec: number;
  totalDistanceKm: number;
  trajectorySpaceMeanSpeedKmh: number;
} {
  if (!detectors || detectors.length < 2) {
    return {
      segments: [],
      totalTravelTimeSec: 0,
      totalDistanceKm: 0,
      trajectorySpaceMeanSpeedKmh: 0,
    };
  }

  const segments: RoadSegmentSlice[] = [];
  let cumulativeTimeSec = 0;
  let totalDistanceKm = 0;

  for (let i = 0; i < detectors.length - 1; i++) {
    const upstream = detectors[i];
    const downstream = detectors[i + 1];

    const lenKm = Math.abs(downstream.mileageKm - upstream.mileageKm);
    totalDistanceKm += lenKm;

    // Get upstream and downstream speeds for the target lane
    let vUp = 80;
    let vDown = 80;

    if (laneIndex >= 0) {
      vUp = upstream.lanes[laneIndex]?.speedKmh || upstream.lanes[0]?.speedKmh || 80;
      vDown = downstream.lanes[laneIndex]?.speedKmh || downstream.lanes[0]?.speedKmh || 80;
    } else {
      // Average across all lanes on detector
      const uSum = upstream.lanes.reduce((acc, l) => acc + l.speedKmh, 0);
      const dSum = downstream.lanes.reduce((acc, l) => acc + l.speedKmh, 0);
      vUp = upstream.lanes.length > 0 ? uSum / upstream.lanes.length : 80;
      vDown = downstream.lanes.length > 0 ? dSum / downstream.lanes.length : 80;
    }

    // Midpoint harmonic interpolation across segment slice
    const safeUp = Math.max(MIN_PHYSICAL_CRAWL_SPEED_KMH, vUp);
    const safeDown = Math.max(MIN_PHYSICAL_CRAWL_SPEED_KMH, vDown);
    // Harmonic mean for speed transition across spatial slice:
    const segHarmonicSpeed = 2 / (1 / safeUp + 1 / safeDown);

    // Segment travel time Δt = Δx / v_seg
    const segTimeSec = (lenKm / segHarmonicSpeed) * 3600;
    cumulativeTimeSec += segTimeSec;

    segments.push({
      segmentIndex: i + 1,
      startMileageKm: upstream.mileageKm,
      endMileageKm: downstream.mileageKm,
      lengthKm: parseFloat(lenKm.toFixed(3)),
      upstreamDetectorId: upstream.detectorId,
      downstreamDetectorId: downstream.detectorId,
      interpolatedSpeedKmh: parseFloat(segHarmonicSpeed.toFixed(1)),
      segmentTravelTimeSec: Math.round(segTimeSec),
      cumulativeArrivalSec: Math.round(cumulativeTimeSec),
    });
  }

  const trajectorySpaceMeanSpeedKmh =
    cumulativeTimeSec > 0 ? (totalDistanceKm / (cumulativeTimeSec / 3600)) : 0;

  return {
    segments,
    totalTravelTimeSec: Math.round(cumulativeTimeSec),
    totalDistanceKm: parseFloat(totalDistanceKm.toFixed(2)),
    trajectorySpaceMeanSpeedKmh: parseFloat(trajectorySpaceMeanSpeedKmh.toFixed(2)),
  };
}
