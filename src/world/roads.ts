export type RoadPoint = readonly [x: number, z: number];

export interface RoadDef {
  id: string;
  name: string;
  width: number;
  surface: "asphalt" | "dirt";
  points: readonly RoadPoint[];
}

export const ROADS: readonly RoadDef[] = [
  {
    id: "farm-village",
    name: "Kijani Farm Road",
    width: 8,
    surface: "dirt",
    points: [
      [-260, 190],
      [-190, 165],
      [-120, 120],
      [-60, 60],
    ],
  },
  {
    id: "village-market",
    name: "Mavuno Road",
    width: 9,
    surface: "asphalt",
    points: [
      [-60, 60],
      [-10, 50],
      [30, 35],
      [60, 25],
    ],
  },
  {
    id: "market-research",
    name: "Greenline Road",
    width: 9,
    surface: "asphalt",
    points: [
      [60, 25],
      [110, 35],
      [160, 60],
      [220, 80],
    ],
  },
  {
    id: "research-hq",
    name: "TerraNova Access Road",
    width: 11,
    surface: "asphalt",
    points: [
      [220, 80],
      [280, 50],
      [340, 20],
      [400, -20],
    ],
  },
  {
    id: "village-highway",
    name: "Mavuno Connector",
    width: 11,
    surface: "asphalt",
    points: [
      [-60, 60],
      [-90, 0],
      [-120, -70],
      [-160, -140],
    ],
  },
  {
    id: "market-highway",
    name: "Greenline Connector",
    width: 11,
    surface: "asphalt",
    points: [
      [60, 25],
      [80, -30],
      [100, -90],
      [120, -140],
    ],
  },
  {
    id: "highway",
    name: "Riftway Highway",
    width: 18,
    surface: "asphalt",
    points: [
      [-520, -140],
      [-300, -140],
      [-160, -140],
      [0, -140],
      [120, -140],
      [260, -140],
      [380, -140],
      [520, -140],
    ],
  },
  {
    id: "highway-waterworks",
    name: "Waterworks Track",
    width: 8,
    surface: "dirt",
    points: [
      [-160, -140],
      [-240, -180],
      [-320, -220],
      [-380, -250],
    ],
  },
  {
    id: "highway-solar",
    name: "Sunridge Access",
    width: 8,
    surface: "dirt",
    points: [
      [120, -140],
      [160, -190],
      [210, -250],
      [250, -300],
    ],
  },
  {
    id: "market-plains",
    name: "Red Dust Track",
    width: 7,
    surface: "dirt",
    points: [
      [60, 25],
      [140, 80],
      [240, 150],
      [320, 190],
      [380, 220],
    ],
  },
];

export interface RoadSegment {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  width: number;
  roadId: string;
}

export const ROAD_SEGMENTS: readonly RoadSegment[] = ROADS.flatMap((road) =>
  road.points.slice(1).map((point, index) => {
    const previous = road.points[index]!;
    return {
      ax: previous[0],
      az: previous[1],
      bx: point[0],
      bz: point[1],
      width: road.width,
      roadId: road.id,
    };
  }),
);
