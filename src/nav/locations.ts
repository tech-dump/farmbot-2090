export type LocationKind =
  | "farm"
  | "village"
  | "market"
  | "research"
  | "hq"
  | "highway"
  | "water"
  | "solar"
  | "plains"
  | "service";

export interface LocationDef {
  id: string;
  name: string;
  short: string;
  x: number;
  z: number;
  kind: LocationKind;
  blurb: string;
  /** Radius used to flatten the terrain so the site is buildable. */
  flatten: number;
  /** Radius within which the site is considered discovered. */
  discovery: number;
}

export const LOCATIONS: LocationDef[] = [
  {
    id: "farm",
    name: "Kijani Family Farm",
    short: "Kijani Farm",
    x: -260,
    z: 190,
    kind: "farm",
    blurb: "Amani's family farm. The irrigation lines are dry and the tractor has not moved in years.",
    flatten: 105,
    discovery: 70,
  },
  {
    id: "village",
    name: "Mavuno Village",
    short: "Mavuno",
    x: -60,
    z: 60,
    kind: "village",
    blurb: "The settlement that grew around the old cooperative. People here remember when water was reliable.",
    flatten: 100,
    discovery: 70,
  },
  {
    id: "service",
    name: "Riftway Fuel & Garage",
    short: "Garage",
    x: -120,
    z: 120,
    kind: "service",
    blurb: "Juma's workshop. The only place in the basin that can still coax a dead engine back to life.",
    flatten: 70,
    discovery: 55,
  },
  {
    id: "market",
    name: "Greenline Market",
    short: "Greenline",
    x: 80,
    z: 20,
    kind: "market",
    blurb: "The basin's trading hub. Prices are up, stock is down, and nobody will say why.",
    flatten: 85,
    discovery: 65,
  },
  {
    id: "research",
    name: "Agricultural Research Centre",
    short: "Research Centre",
    x: 220,
    z: 80,
    kind: "research",
    blurb: "Dr. Sifa's lab. Soil samples, sensor logs, and a growing pile of questions about ROOT.",
    flatten: 90,
    discovery: 70,
  },
  {
    id: "hq",
    name: "TerraNova Regional HQ",
    short: "TerraNova HQ",
    x: 400,
    z: -20,
    kind: "hq",
    blurb: "Glass, shade, and controlled water. The regional office that decides who gets to farm.",
    flatten: 95,
    discovery: 75,
  },
  {
    id: "highway",
    name: "Riftway Highway",
    short: "Riftway Hwy",
    x: 0,
    z: -140,
    kind: "highway",
    blurb: "The old supply artery. Convoys still run it, but fewer every season.",
    flatten: 60,
    discovery: 55,
  },
  {
    id: "waterworks",
    name: "Old Waterworks",
    short: "Waterworks",
    x: -380,
    z: -250,
    kind: "water",
    blurb: "The pumping station that used to feed half the basin. Its lake is lower than anyone remembers.",
    flatten: 90,
    discovery: 70,
  },
  {
    id: "solar",
    name: "Sunridge Solar Farm",
    short: "Sunridge",
    x: 250,
    z: -300,
    kind: "solar",
    blurb: "Panels as far as the eye can see. Enough power for the whole basin, if it were shared fairly.",
    flatten: 105,
    discovery: 80,
  },
  {
    id: "plains",
    name: "Red Dust Plains",
    short: "Red Dust",
    x: 380,
    z: 220,
    kind: "plains",
    blurb: "Abandoned homesteads and dead thorn trees. The dust here swallows everything eventually.",
    flatten: 125,
    discovery: 90,
  },
];

export const LOCATION_BY_ID: ReadonlyMap<string, LocationDef> = new Map(
  LOCATIONS.map((location) => [location.id, location]),
);

export function locationAt(id: string): LocationDef {
  const found = LOCATION_BY_ID.get(id);
  if (!found) {
    throw new Error(`Unknown location id: ${id}`);
  }
  return found;
}
