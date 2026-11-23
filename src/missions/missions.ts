import type { MoodId } from "../story/campaign";

export type MissionCategory = "story" | "side" | "delivery" | "repair" | "exploration";
export type ObjectiveKind = "reach" | "interact" | "hold" | "deliver";
export type StoryImportance = "main" | "supporting" | "optional";

export interface ObjectiveDef {
  kind: ObjectiveKind;
  label: string;
  hint: string;
  x: number;
  z: number;
  radius: number;
  holdSeconds?: number;
  requiresVehicle?: boolean;
  loadsCargo?: boolean;
}

export interface MissionDef {
  id: string;
  act: string;
  category: MissionCategory;
  title: string;
  giver: string;
  locationId: string;
  importance: StoryImportance;
  description: string;
  estimatedMinutes: number;
  /** Designed challenge rating from 1 (gentle) to 5 (demanding). */
  rating: number;
  moods?: MoodId[];
  requires?: string[];
  reward: { credits: number; trust: number };
  timeLimitSec?: number;
  startsLoaded?: boolean;
  objectives: ObjectiveDef[];
}

export const MISSIONS: MissionDef[] = [
  {
    id: "prologue",
    act: "ACT I · HOMECOMING",
    category: "story",
    title: "Back to Kijani",
    giver: "Mama Zuri",
    locationId: "farm",
    importance: "main",
    description:
      "Walk the family farm and see what the dry years left behind. Inspect the water tank, the barn and the old tractor pad, then report back.",
    estimatedMinutes: 4,
    rating: 1,
    reward: { credits: 120, trust: 6 },
    objectives: [
      {
        kind: "interact",
        label: "Inspect the water tank",
        hint: "The tank is behind the farmhouse, on the western side of the yard.",
        x: -284,
        z: 163,
        radius: 7,
      },
      {
        kind: "interact",
        label: "Check the barn",
        hint: "The barn stands east of the house, past the silos.",
        x: -241,
        z: 217,
        radius: 7,
      },
      {
        kind: "interact",
        label: "Read the tractor pad",
        hint: "The tractor has not moved from its pad in years.",
        x: -254,
        z: 176,
        radius: 7,
      },
    ],
  },
  {
    id: "tractor",
    act: "ACT I · HOMECOMING",
    category: "story",
    title: "A Broken Beginning",
    giver: "Juma",
    locationId: "service",
    importance: "main",
    description:
      "The Kijani Tractor still turns over, barely. Drive it to Juma's garage on the Riftway spur and hand him the keys so he can rebuild the injection line.",
    estimatedMinutes: 6,
    rating: 2,
    requires: ["prologue"],
    reward: { credits: 180, trust: 8 },
    objectives: [
      {
        kind: "deliver",
        label: "Drive the tractor to Juma's garage",
        hint: "Any vehicle works, but the tractor is parked on the farm pad.",
        x: -130,
        z: 114,
        radius: 16,
        requiresVehicle: true,
      },
      {
        kind: "interact",
        label: "Hand the keys to Juma",
        hint: "Step out of the vehicle and knock at the workshop door.",
        x: -136,
        z: 119,
        radius: 8,
      },
    ],
  },
  {
    id: "water",
    act: "ACT I · HOMECOMING",
    category: "story",
    title: "Water Has a Memory",
    giver: "Mama Zuri",
    locationId: "waterworks",
    importance: "main",
    description:
      "The old pump house still has pressure in the line. Hold the coupling shut and bring water back to the lower fields.",
    estimatedMinutes: 7,
    rating: 3,
    requires: ["tractor"],
    reward: { credits: 240, trust: 10 },
    objectives: [
      {
        kind: "hold",
        label: "Repair the pump coupling",
        hint: "Stand at the south wall of the pump house and hold E until the line holds.",
        x: -392,
        z: -230,
        radius: 9,
        holdSeconds: 6,
      },
    ],
  },
  {
    id: "descend",
    act: "ACT II · THE BROKEN NETWORK",
    category: "story",
    title: "Down the Old Shaft",
    giver: "Dr. Sifa",
    locationId: "waterworks",
    importance: "main",
    description:
      "Dr. Sifa's readings point beneath the old pumping station. Find the service shaft, hold the lift winch steady and read the core tap at the bottom.",
    estimatedMinutes: 6,
    rating: 3,
    requires: ["water"],
    reward: { credits: 260, trust: 10 },
    objectives: [
      {
        kind: "reach",
        label: "Find the service shaft",
        hint: "The shaft mouth sits past the south fence of the waterworks.",
        x: -414,
        z: -270,
        radius: 12,
      },
      {
        kind: "hold",
        label: "Hold the lift winch",
        hint: "Hold E at the winch frame until the cage settles.",
        x: -418,
        z: -276,
        radius: 8,
        holdSeconds: 5,
      },
      {
        kind: "interact",
        label: "Read the core tap",
        hint: "The tap is bolted to the shaft wall, warm to the touch.",
        x: -422,
        z: -282,
        radius: 7,
      },
    ],
  },
  {
    id: "crash-site",
    act: "ACT III · THE QUIET VISITORS",
    category: "story",
    title: "Something in the Dust",
    giver: "Dr. Sifa",
    locationId: "crash",
    importance: "main",
    description:
      "The core tap points east, to a scar in the Red Dust Plains. Walk the crash site and find whatever came down with the signal.",
    estimatedMinutes: 6,
    rating: 3,
    requires: ["descend"],
    reward: { credits: 280, trust: 10 },
    objectives: [
      {
        kind: "reach",
        label: "Cross the crash scar",
        hint: "The wreck lies east of the plains homesteads.",
        x: 432,
        z: 268,
        radius: 20,
      },
      {
        kind: "interact",
        label: "Speak with the survivor",
        hint: "The tall figure waits beside the broken ring.",
        x: 423,
        z: 258,
        radius: 7,
      },
    ],
  },
  {
    id: "iri-first-contact",
    act: "ACT III · THE QUIET VISITORS",
    category: "story",
    title: "The Envoy",
    giver: "Iri",
    locationId: "crash",
    importance: "main",
    description:
      "Iri calls itself Veyari, and it says the corrupted machines are following a song from beneath the basin. Hear it out before you decide anything.",
    estimatedMinutes: 4,
    rating: 2,
    requires: ["crash-site"],
    reward: { credits: 240, trust: 8 },
    objectives: [
      {
        kind: "interact",
        label: "Hear the envoy out",
        hint: "Approach Iri at the wreck and hold the conversation.",
        x: 423,
        z: 258,
        radius: 7,
      },
    ],
  },
  {
    id: "machine-census",
    act: "FREE ROAM · COOPERATIVE WORK",
    category: "side",
    title: "Quiet the Machines",
    giver: "Iri",
    locationId: "crash",
    importance: "optional",
    description:
      "Iri can track the corrupted units but cannot reach them without drawing the song. Walk the three patrol anchors and log their positions.",
    estimatedMinutes: 7,
    rating: 3,
    requires: ["iri-first-contact"],
    moods: ["action", "mystery", "survival"],
    reward: { credits: 190, trust: 6 },
    objectives: [
      {
        kind: "reach",
        label: "Log the Sunridge patrol",
        hint: "A security unit circles the solar control shed.",
        x: 252,
        z: -264,
        radius: 10,
      },
      {
        kind: "reach",
        label: "Log the field thresher",
        hint: "The harvester still works the Kijani west field.",
        x: -188,
        z: 196,
        radius: 10,
      },
      {
        kind: "reach",
        label: "Log the waterworks security unit",
        hint: "It walks the fence line south of the pump house.",
        x: -368,
        z: -214,
        radius: 10,
      },
    ],
  },
  {
    id: "seed-run",
    act: "FREE ROAM · COOPERATIVE WORK",
    category: "delivery",
    title: "Seed Run",
    giver: "Wanjiku",
    locationId: "market",
    importance: "supporting",
    description:
      "Load the last seed crates at the farm barn and haul them to Greenline Market before the cooperative meeting closes.",
    estimatedMinutes: 5,
    rating: 2,
    reward: { credits: 160, trust: 5 },
    timeLimitSec: 300,
    objectives: [
      {
        kind: "interact",
        label: "Load the seed crates",
        hint: "The crates are stacked at the barn door.",
        x: -241,
        z: 217,
        radius: 7,
        loadsCargo: true,
      },
      {
        kind: "deliver",
        label: "Haul the seed crates to Greenline Market",
        hint: "Any vehicle will do. Drive into the market yard.",
        x: 80,
        z: 12,
        radius: 18,
        requiresVehicle: true,
      },
    ],
  },
  {
    id: "signal-check",
    act: "ACT II · THE BROKEN NETWORK",
    category: "exploration",
    title: "Signal Check",
    giver: "Dr. Sifa",
    locationId: "research",
    importance: "supporting",
    description:
      "Three field sensors went quiet in the same week. Walk their last known positions and log what the ground looks like now.",
    estimatedMinutes: 8,
    rating: 2,
    moods: ["mystery", "exploration", "action"],
    reward: { credits: 200, trust: 6 },
    objectives: [
      {
        kind: "reach",
        label: "Survey the solar shed sensor",
        hint: "The first sensor sat beside the control shed at Sunridge.",
        x: 214,
        z: -272,
        radius: 10,
      },
      {
        kind: "reach",
        label: "Survey the Riftway gantry",
        hint: "The second sensor was bolted to the highway gantry.",
        x: 0,
        z: -150,
        radius: 10,
      },
      {
        kind: "reach",
        label: "Survey the plains wreck",
        hint: "The last signal came from the rusted truck in Red Dust Plains.",
        x: 358,
        z: 206,
        radius: 10,
      },
    ],
  },
  {
    id: "relay",
    act: "FREE ROAM · COOPERATIVE WORK",
    category: "repair",
    title: "Roadside Relay",
    giver: "Juma",
    locationId: "highway",
    importance: "optional",
    description:
      "The highway relay has been dead since the last dust storm. Hold the housing shut while the bypass resets.",
    estimatedMinutes: 3,
    rating: 2,
    moods: ["heroic", "action", "survival"],
    reward: { credits: 140, trust: 4 },
    objectives: [
      {
        kind: "hold",
        label: "Reset the relay housing",
        hint: "The relay box sits under the gantry, on the shoulder of the Riftway.",
        x: 0,
        z: -150,
        radius: 8,
        holdSeconds: 5,
      },
    ],
  },
  {
    id: "dry-signal",
    act: "ACT II · THE BROKEN NETWORK",
    category: "side",
    title: "Signal in the Dust",
    giver: "Dr. Sifa",
    locationId: "research",
    importance: "optional",
    description:
      "Dr. Sifa left a field console running overnight. Read the captured signal before the lab wipes the buffer.",
    estimatedMinutes: 2,
    rating: 1,
    moods: ["mystery", "exploration"],
    reward: { credits: 110, trust: 3 },
    objectives: [
      {
        kind: "interact",
        label: "Read the field console",
        hint: "The console is on the research centre parking slab.",
        x: 214,
        z: 82,
        radius: 8,
      },
    ],
  },
  {
    id: "dust-convoy",
    act: "FREE ROAM · COOPERATIVE WORK",
    category: "delivery",
    title: "Dust Convoy",
    giver: "Wanjiku",
    locationId: "plains",
    importance: "optional",
    description:
      "The cooperative loaded a flatbed overnight. Get the supplies into Red Dust Plains before the front closes the road.",
    estimatedMinutes: 4,
    rating: 3,
    moods: ["survival", "drama"],
    reward: { credits: 170, trust: 5 },
    timeLimitSec: 240,
    startsLoaded: true,
    objectives: [
      {
        kind: "deliver",
        label: "Deliver supplies to Red Dust Plains",
        hint: "Drive any vehicle into the plains homestead yard.",
        x: 380,
        z: 220,
        radius: 20,
        requiresVehicle: true,
      },
    ],
  },
  {
    id: "market-ledger",
    act: "ACT II · THE BROKEN NETWORK",
    category: "side",
    title: "The Quiet Ledger",
    giver: "Mama Zuri",
    locationId: "village",
    importance: "optional",
    description:
      "The cooperative keeps a paper ledger of who received water and when. Read the entries at the village hall before the next allocation.",
    estimatedMinutes: 3,
    rating: 1,
    moods: ["drama", "heroic", "exploration"],
    reward: { credits: 90, trust: 5 },
    objectives: [
      {
        kind: "interact",
        label: "Read the cooperative ledger",
        hint: "The ledger sits by the hall door in Mavuno Village.",
        x: -82,
        z: 22,
        radius: 8,
      },
    ],
  },
];

export const MISSION_BY_ID: ReadonlyMap<string, MissionDef> = new Map(
  MISSIONS.map((mission) => [mission.id, mission]),
);

export const CATEGORY_LABELS: Record<MissionCategory, string> = {
  story: "Story",
  side: "Side",
  delivery: "Delivery",
  repair: "Repair",
  exploration: "Exploration",
};
