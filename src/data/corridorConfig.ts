import { Direction, CorridorInterchange } from "../types";

export const CORRIDOR_INTERCHANGES: CorridorInterchange[] = [
  { name: "南港系統交流道", mileageKm: 0.0, label: "0.0K 南港系統 (接國3/台北端)", shortName: "南港系統 (0K)" },
  { name: "石碇交流道", mileageKm: 4.0, label: "4.0K 石碇交流道 (106乙線)", shortName: "石碇 (4K)" },
  { name: "坪林交流道", mileageKm: 15.0, label: "15.0K 坪林行控專用道 (台9線/雪隧北口)", shortName: "坪林 (15K)" },
  { name: "頭城/礁溪交流道", mileageKm: 30.0, label: "30.0K 頭城/礁溪交流道 (台9線/台2庚)", shortName: "頭城/礁溪 (30K)" },
  { name: "宜蘭交流道", mileageKm: 38.0, label: "38.0K 宜蘭交流道 (縣道191/192)", shortName: "宜蘭 (38K)" },
  { name: "羅東交流道", mileageKm: 46.0, label: "46.0K 羅東/五結交流道 (縣道196/台7丙)", shortName: "羅東 (46K)" },
  { name: "蘇澳交流道", mileageKm: 54.0, label: "54.0K 蘇澳端 (接台9線蘇花改起點)", shortName: "蘇澳端 (54K)" },
];

export interface BaseCorridorSegmentConfig {
  id: string;
  name: string;
  fromKm: number;
  toKm: number;
  lengthKm: number;
  isTunnelSection: boolean;
  speedLimitKmh: number;
  description: string;
}

export const FREEWAY_5_CORRIDOR_SEGMENTS_SOUTH: BaseCorridorSegmentConfig[] = [
  {
    id: "SEG-S-01",
    name: "南港系統 ↔ 石碇",
    fromKm: 0.0,
    toKm: 4.0,
    lengthKm: 4.0,
    isTunnelSection: false,
    speedLimitKmh: 80,
    description: "台北盆地出口高架銜接段，車流匯入熱點",
  },
  {
    id: "SEG-S-02",
    name: "石碇 ↔ 坪林",
    fromKm: 4.0,
    toKm: 15.0,
    lengthKm: 11.0,
    isTunnelSection: true,
    speedLimitKmh: 80,
    description: "山區丘陵蜿蜒路段，包含彭山隧道 (長約 3.8 km)",
  },
  {
    id: "SEG-S-03",
    name: "坪林 ↔ 頭城/礁溪 (雪山隧道核心段)",
    fromKm: 15.0,
    toKm: 30.0,
    lengthKm: 15.0,
    isTunnelSection: true,
    speedLimitKmh: 90,
    description: "世界第十三長公路隧道 (12.93 km)，連續雙白實線嚴禁變換車道",
  },
  {
    id: "SEG-S-04",
    name: "頭城/礁溪 ↔ 宜蘭",
    fromKm: 30.0,
    toKm: 38.0,
    lengthKm: 8.0,
    isTunnelSection: false,
    speedLimitKmh: 90,
    description: "出雪隧後進入蘭陽平原北段高架，礁溪溫泉車流匯流區",
  },
  {
    id: "SEG-S-05",
    name: "宜蘭 ↔ 羅東",
    fromKm: 38.0,
    toKm: 46.0,
    lengthKm: 8.0,
    isTunnelSection: false,
    speedLimitKmh: 90,
    description: "蘭陽平原中段核心都會生活圈高架段",
  },
  {
    id: "SEG-S-06",
    name: "羅東 ↔ 蘇澳",
    fromKm: 46.0,
    toKm: 54.0,
    lengthKm: 8.0,
    isTunnelSection: false,
    speedLimitKmh: 90,
    description: "國道5號南端終點段，直通蘇花改與蘇澳港",
  },
];

export const FREEWAY_5_CORRIDOR_SEGMENTS_NORTH: BaseCorridorSegmentConfig[] = [
  {
    id: "SEG-N-06",
    name: "蘇澳 ↔ 羅東",
    fromKm: 54.0,
    toKm: 46.0,
    lengthKm: 8.0,
    isTunnelSection: false,
    speedLimitKmh: 90,
    description: "蘇澳北上起點段，蘇花改回堵主線觀察區",
  },
  {
    id: "SEG-N-05",
    name: "羅東 ↔ 宜蘭",
    fromKm: 46.0,
    toKm: 38.0,
    lengthKm: 8.0,
    isTunnelSection: false,
    speedLimitKmh: 90,
    description: "北上主線各匝道匯入排隊段",
  },
  {
    id: "SEG-N-04",
    name: "宜蘭 ↔ 頭城/礁溪",
    fromKm: 38.0,
    toKm: 30.0,
    lengthKm: 8.0,
    isTunnelSection: false,
    speedLimitKmh: 90,
    description: "北上進入雪隧前最後平原段，假日匝道儀控長隊列區",
  },
  {
    id: "SEG-N-03",
    name: "頭城/礁溪 ↔ 坪林 (雪山隧道核心段)",
    fromKm: 30.0,
    toKm: 15.0,
    lengthKm: 15.0,
    isTunnelSection: true,
    speedLimitKmh: 90,
    description: "雪山隧道北向核心 (12.93 km)，頭城洞口上坡減速瓶頸",
  },
  {
    id: "SEG-N-02",
    name: "坪林 ↔ 石碇",
    fromKm: 15.0,
    toKm: 4.0,
    lengthKm: 11.0,
    isTunnelSection: true,
    speedLimitKmh: 80,
    description: "彭山隧道北向連續彎道與山區下坡段",
  },
  {
    id: "SEG-N-01",
    name: "石碇 ↔ 南港系統",
    fromKm: 4.0,
    toKm: 0.0,
    lengthKm: 4.0,
    isTunnelSection: false,
    speedLimitKmh: 80,
    description: "國3南港系統匯入環東大道與國道3號主線分流處",
  },
];
