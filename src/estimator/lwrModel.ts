import { RawApiDetectorRecord, TrafficConservationStatus } from "../types";

/**
 * Phase 6: Traffic Flow Conservation and LWR Model
 * 
 * Lighthill-Whitham-Richards (LWR) Model:
 * ∂k/∂t + ∂q(k)/∂x = 0
 * 
 * Greenshields Fundamental Diagram:
 * v(k) = v_f * (1 - k / k_j)
 * q(k) = v_f * k * (1 - k / k_j)
 * 
 * Tunnel Baseline Parameters for N5 Hsuehshan Tunnel:
 * - Free-flow speed v_f = 90.0 km/h
 * - Jam density k_j = 135 veh/km/lane (~ 270 veh/km for 2 lanes)
 * - Maximum capacity q_max = (v_f * k_j) / 4 ~ 3037.5 veh/hr
 * 
 * Shockwave Speed:
 * w = Δq / Δk
 */

export const FREEWAY_5_TUNNEL_VF = 90.0; // km/h
export const FREEWAY_5_TUNNEL_KJ = 270.0; // veh/km total (2 lanes)
export const FREEWAY_5_TUNNEL_CAPACITY = (FREEWAY_5_TUNNEL_VF * FREEWAY_5_TUNNEL_KJ) / 4; // ~ 6075 veh/hr total or 3037/direction

export function checkTrafficConservation(
  detectors: RawApiDetectorRecord[]
): TrafficConservationStatus {
  if (!detectors || detectors.length < 2) {
    return {
      isConserved: true,
      massDiscrepancyVehPerHour: 0,
      estimatedShockwaveSpeedKmh: 0,
      bottleneckLocationKm: null,
      fundamentalDiagram: {
        model: "Greenshields",
        freeFlowSpeedKmh: FREEWAY_5_TUNNEL_VF,
        jamDensityVehPerKm: FREEWAY_5_TUNNEL_KJ,
        capacityVehPerHour: Math.round(FREEWAY_5_TUNNEL_CAPACITY),
      },
    };
  }

  let maxFluxDiscrepancy = 0;
  let bottleneckKm: number | null = null;
  let shockwaveSpeedKmh = 0;

  for (let i = 0; i < detectors.length - 1; i++) {
    const up = detectors[i];
    const down = detectors[i + 1];

    const qUp = up.lanes.reduce((sum, l) => sum + l.flowVehPerHour, 0);
    const qDown = down.lanes.reduce((sum, l) => sum + l.flowVehPerHour, 0);

    const vUp = Math.max(5, up.lanes.reduce((sum, l) => sum + l.speedKmh, 0) / (up.lanes.length || 1));
    const vDown = Math.max(5, down.lanes.reduce((sum, l) => sum + l.speedKmh, 0) / (down.lanes.length || 1));

    const kUp = qUp / vUp;
    const kDown = qDown / vDown;

    const deltaQ = qDown - qUp;
    const deltaK = kDown - kUp;
    const deltaX = Math.abs(down.mileageKm - up.mileageKm);

    // Spatial rate of flow change: |Δq / Δx|
    const fluxDiscrepancy = deltaX > 0 ? Math.abs(deltaQ / deltaX) : 0;
    if (fluxDiscrepancy > maxFluxDiscrepancy) {
      maxFluxDiscrepancy = fluxDiscrepancy;
      // If speed drops significantly downstream with high density, mark bottleneck
      if (vDown < vUp - 15 && kDown > 50) {
        bottleneckKm = down.mileageKm;
        if (Math.abs(deltaK) > 5) {
          shockwaveSpeedKmh = deltaQ / deltaK; // Rankine-Hugoniot jump condition
        }
      }
    }
  }

  // If flux discrepancy is within physical accumulation limits (< 400 veh/hr/km), considered conserved
  const isConserved = maxFluxDiscrepancy < 450;

  return {
    isConserved,
    massDiscrepancyVehPerHour: Math.round(maxFluxDiscrepancy),
    estimatedShockwaveSpeedKmh: parseFloat(shockwaveSpeedKmh.toFixed(1)),
    bottleneckLocationKm: bottleneckKm,
    fundamentalDiagram: {
      model: "Greenshields",
      freeFlowSpeedKmh: FREEWAY_5_TUNNEL_VF,
      jamDensityVehPerKm: FREEWAY_5_TUNNEL_KJ,
      capacityVehPerHour: Math.round(FREEWAY_5_TUNNEL_CAPACITY),
    },
  };
}
