import { DataQualityReport, RawApiDetectorRecord } from "../types";

/**
 * Phase 2: Data Validation & Quality Assessment
 * Implements physical anomaly checks, spatial-temporal consistency,
 * dynamic confidence weighting, and adaptive measurement noise covariance R_i(t).
 */
export function validateDetectorData(
  records: RawApiDetectorRecord[]
): {
  reports: DataQualityReport[];
  validatedRecords: RawApiDetectorRecord[];
  overallQuality: "EXCELLENT" | "GOOD" | "DEGRADED" | "SUSPICIOUS" | "INSUFFICIENT_DATA";
} {
  if (!records || records.length === 0) {
    return {
      reports: [],
      validatedRecords: [],
      overallQuality: "INSUFFICIENT_DATA",
    };
  }

  const reports: DataQualityReport[] = [];
  const validatedRecords: RawApiDetectorRecord[] = [];

  records.forEach((record, index) => {
    let isValid = true;
    let isSuspicious = false;
    const missingFields: string[] = [];
    const anomalies: string[] = [];
    let noiseFactor = 1.0; // Base adaptive noise factor

    if (!record.detectorId) {
      missingFields.push("Missing Detector ID");
      isValid = false;
    }
    if (record.mileageKm <= 0 || isNaN(record.mileageKm)) {
      missingFields.push("Invalid Mileage");
      isValid = false;
    }

    if (!record.lanes || record.lanes.length === 0) {
      missingFields.push("Missing Lane Arrays");
      isValid = false;
    } else {
      // Validate each lane
      record.lanes.forEach((lane) => {
        // Physical bounds
        if (lane.speedKmh < 0) {
          anomalies.push(`Lane ${lane.laneId} speed < 0 (${lane.speedKmh} km/h)`);
          isValid = false;
        }
        if (lane.speedKmh > 180) {
          anomalies.push(`Lane ${lane.laneId} unphysically high speed (${lane.speedKmh} km/h)`);
          isSuspicious = true;
          noiseFactor *= 3.0;
        }
        if (lane.flowVehPerHour < 0) {
          anomalies.push(`Lane ${lane.laneId} flow < 0`);
          isValid = false;
        }
        if (lane.flowVehPerHour > 3000) {
          // Exceeds single lane freeway theoretical capacity (> 2400-2800 veh/hr/lane)
          anomalies.push(`Lane ${lane.laneId} flow exceeds lane capacity (${lane.flowVehPerHour} veh/hr)`);
          isSuspicious = true;
          noiseFactor *= 2.0;
        }
        if (lane.occupancyPercent < 0 || lane.occupancyPercent > 100) {
          anomalies.push(`Lane ${lane.laneId} invalid occupancy (${lane.occupancyPercent}%)`);
          isValid = false;
        }

        // Flow-Occupancy Consistency: High occupancy (>35%) with very high speed (>90 km/h) is physically contradictory
        if (lane.occupancyPercent > 35 && lane.speedKmh > 85) {
          anomalies.push(`Lane ${lane.laneId} physical contradiction: High Occ (${lane.occupancyPercent}%) with Free-flow Speed (${lane.speedKmh} km/h)`);
          isSuspicious = true;
          noiseFactor *= 2.5;
        }

        // Zero speed with zero occupancy but positive flow
        if (lane.speedKmh === 0 && lane.occupancyPercent === 0 && lane.flowVehPerHour > 50) {
          anomalies.push(`Lane ${lane.laneId} zero speed and zero occ with positive flow`);
          isSuspicious = true;
          noiseFactor *= 2.0;
        }
      });
    }

    // Spatial Consistency Check with Adjacent Detectors
    if (index > 0 && records[index - 1].lanes.length > 0 && record.lanes.length > 0) {
      const prevSpeed = records[index - 1].lanes[0]?.speedKmh || 80;
      const currSpeed = record.lanes[0]?.speedKmh || 80;
      const distDeltaKm = Math.abs(record.mileageKm - records[index - 1].mileageKm);

      // Sudden jump > 45 km/h over less than 1.5 km without bottleneck transition
      if (Math.abs(currSpeed - prevSpeed) > 45 && distDeltaKm < 1.5) {
        anomalies.push(`Spatial discontinuity: ΔSpeed = ${Math.abs(currSpeed - prevSpeed)} km/h over ${distDeltaKm.toFixed(1)} km`);
        isSuspicious = true;
        noiseFactor *= 2.0;
      }
    }

    // Adaptive Measurement Variance R_i(t)
    // Base R for standard inductive loop VD in traffic literature ~ 4.0 to 9.0 (km/h)^2
    const baseVariance = 6.25; // std dev = 2.5 km/h
    let adaptiveNoiseR = baseVariance * noiseFactor;
    if (!isValid) {
      adaptiveNoiseR = 100.0; // High uncertainty for invalid/interpolated data
    }

    // Confidence metric [0.0, 1.0]
    let confidence = 0.95;
    if (!isValid) {
      confidence = 0.15;
    } else if (isSuspicious) {
      confidence = Math.max(0.4, 0.95 / noiseFactor);
    }

    reports.push({
      detectorId: record.detectorId,
      isValid,
      isSuspicious,
      missingFields,
      anomalies,
      confidence: parseFloat(confidence.toFixed(3)),
      adaptiveNoiseR: parseFloat(adaptiveNoiseR.toFixed(2)),
    });

    // Sanitized record with non-destructive adjustments
    const sanitizedLanes = (record.lanes || []).map((l) => ({
      ...l,
      // Strictly avoid non-physical negatives
      speedKmh: Math.max(0, l.speedKmh),
      flowVehPerHour: Math.max(0, l.flowVehPerHour),
      occupancyPercent: Math.min(100, Math.max(0, l.occupancyPercent)),
    }));

    validatedRecords.push({
      ...record,
      lanes: sanitizedLanes,
    });
  });

  const validCount = reports.filter((r) => r.isValid && !r.isSuspicious).length;
  const validRatio = validCount / reports.length;

  let overallQuality: "EXCELLENT" | "GOOD" | "DEGRADED" | "SUSPICIOUS" | "INSUFFICIENT_DATA" = "EXCELLENT";
  if (reports.length < 3) {
    overallQuality = "INSUFFICIENT_DATA";
  } else if (validRatio >= 0.85) {
    overallQuality = "EXCELLENT";
  } else if (validRatio >= 0.65) {
    overallQuality = "GOOD";
  } else if (validRatio >= 0.4) {
    overallQuality = "DEGRADED";
  } else {
    overallQuality = "SUSPICIOUS";
  }

  return {
    reports,
    validatedRecords,
    overallQuality,
  };
}
