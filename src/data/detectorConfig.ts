import { Direction, RawApiDetectorRecord } from "../types";

export interface DetectorStationConfig {
  detectorId: string;
  mileageKm: number;
  direction: Direction;
  locationName: string;
  tunnelSection: string;
}

// 國道5號 雪山 南向: 15k+203 ～ 28k+128 (全長約 12.925 km)
export const HSUEHSHAN_DETECTORS_SOUTH: DetectorStationConfig[] = [
  { detectorId: "VD-N5-S-15.203", mileageKm: 15.203, direction: "S", locationName: "國5南向 15.2K (雪山隧道南向起點 15K+203)", tunnelSection: "隧道起點區" },
  { detectorId: "VD-N5-S-18.000", mileageKm: 18.000, direction: "S", locationName: "國5南向 18.0K (雪山隧道前段)", tunnelSection: "隧道前段 A" },
  { detectorId: "VD-N5-S-19.100", mileageKm: 19.100, direction: "S", locationName: "國5南向 19.1K", tunnelSection: "隧道前段 B" },
  { detectorId: "VD-N5-S-20.200", mileageKm: 20.200, direction: "S", locationName: "國5南向 20.2K", tunnelSection: "隧道中前段 A" },
  { detectorId: "VD-N5-S-21.400", mileageKm: 21.400, direction: "S", locationName: "國5南向 21.4K", tunnelSection: "隧道中前段 B" },
  { detectorId: "VD-N5-S-22.500", mileageKm: 22.500, direction: "S", locationName: "國5南向 22.5K (避車彎段)", tunnelSection: "隧道核心中段" },
  { detectorId: "VD-N5-S-23.800", mileageKm: 23.800, direction: "S", locationName: "國5南向 23.8K", tunnelSection: "隧道中後段 A" },
  { detectorId: "VD-N5-S-25.000", mileageKm: 25.000, direction: "S", locationName: "國5南向 25.0K", tunnelSection: "隧道中後段 B" },
  { detectorId: "VD-N5-S-25.300", mileageKm: 25.300, direction: "S", locationName: "國5南向 25.3K (坡度轉換點)", tunnelSection: "隧道後段 A" },
  { detectorId: "VD-N5-S-26.200", mileageKm: 26.200, direction: "S", locationName: "國5南向 26.2K", tunnelSection: "隧道後段 B" },
  { detectorId: "VD-N5-S-28.128", mileageKm: 28.128, direction: "S", locationName: "國5南向 28.1K (雪山隧道南向終點 28K+128/頭城端)", tunnelSection: "隧道終點區" },
];

// 國道5號 雪山 北向: 15k+179 ～ 28k+134 (全長約 12.955 km)
export const HSUEHSHAN_DETECTORS_NORTH: DetectorStationConfig[] = [
  { detectorId: "VD-N5-N-28.134", mileageKm: 28.134, direction: "N", locationName: "國5北向 28.1K (雪山隧道北向起點 28K+134/頭城端)", tunnelSection: "隧道起點區" },
  { detectorId: "VD-N5-N-26.200", mileageKm: 26.200, direction: "N", locationName: "國5北向 26.2K", tunnelSection: "隧道前段 A" },
  { detectorId: "VD-N5-N-25.300", mileageKm: 25.300, direction: "N", locationName: "國5北向 25.3K", tunnelSection: "隧道前段 B" },
  { detectorId: "VD-N5-N-25.000", mileageKm: 25.000, direction: "N", locationName: "國5北向 25.0K", tunnelSection: "隧道中前段" },
  { detectorId: "VD-N5-N-23.800", mileageKm: 23.800, direction: "N", locationName: "國5北向 23.8K", tunnelSection: "隧道核心中段" },
  { detectorId: "VD-N5-N-22.500", mileageKm: 22.500, direction: "N", locationName: "國5北向 22.5K (避車彎段)", tunnelSection: "隧道核心中段" },
  { detectorId: "VD-N5-N-21.400", mileageKm: 21.400, direction: "N", locationName: "國5北向 21.4K", tunnelSection: "隧道中後段" },
  { detectorId: "VD-N5-N-20.200", mileageKm: 20.200, direction: "N", locationName: "國5北向 20.2K", tunnelSection: "隧道後段 A" },
  { detectorId: "VD-N5-N-19.100", mileageKm: 19.100, direction: "N", locationName: "國5北向 19.1K", tunnelSection: "隧道後段 B" },
  { detectorId: "VD-N5-N-18.000", mileageKm: 18.000, direction: "N", locationName: "國5北向 18.0K (雪隧出口前段)", tunnelSection: "隧道出口前段" },
  { detectorId: "VD-N5-N-15.179", mileageKm: 15.179, direction: "N", locationName: "國5北向 15.2K (雪山隧道北向終點 15K+179/坪林端)", tunnelSection: "隧道終點區" },
];

export const HSUEHSHAN_BOUNDS = {
  S: { minKm: 15.203, maxKm: 28.128, lengthKm: 12.925 },
  N: { minKm: 15.179, maxKm: 28.134, lengthKm: 12.955 },
};
