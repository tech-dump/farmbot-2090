export type MoodId = "heroic" | "mystery" | "action" | "survival" | "drama" | "exploration";

export interface MoodDef {
  id: MoodId;
  name: string;
  tagline: string;
  focus: string;
  accent: string;
  tint: string;
  tintStrength: number;
  fogScale: number;
  exposure: number;
  briefing: string[];
}

export const MOODS: MoodDef[] = [
  {
    id: "heroic",
    name: "Heroic Adventure",
    tagline: "Bring the water back.",
    focus: "Saving settlements, building alliances and hopeful discoveries.",
    accent: "#ffd166",
    tint: "#ffcf8a",
    tintStrength: 0.18,
    fogScale: 0.95,
    exposure: 1.12,
    briefing: [
      "Mama Zuri: Amani, the basin still remembers your family. People are ready to help if someone shows them how.",
      "Radio: Kijani Basin rescue net standing by. Give us a reason to hope.",
    ],
  },
  {
    id: "mystery",
    name: "Dark Mystery",
    tagline: "The ledger does not add up.",
    focus: "Hidden records, strange signals and unanswered questions.",
    accent: "#9fd0ff",
    tint: "#6c8fb8",
    tintStrength: 0.3,
    fogScale: 1.35,
    exposure: 1,
    briefing: [
      "Dr. Sifa: The sensors are reporting water that does not exist. Somebody is feeding ROOT the wrong numbers.",
      "Radio: Keep your head down. The people who wrote those numbers still work for TerraNova.",
    ],
  },
  {
    id: "action",
    name: "Action Adventure",
    tagline: "Every hour costs a harvest.",
    focus: "Hard drives, tight deadlines and high-stakes repairs.",
    accent: "#ff9d6b",
    tint: "#c96a4a",
    tintStrength: 0.2,
    fogScale: 0.9,
    exposure: 1.15,
    briefing: [
      "Juma: The pumps are dead and the co-op trucks are running on fumes. Move fast and keep the engine warm.",
      "Radio: TerraNova patrols are logging movement on the Riftway. Stay ahead of them.",
    ],
  },
  {
    id: "survival",
    name: "Survival Experience",
    tagline: "What you save, you carry.",
    focus: "Limited resources, exposed roads and hard choices.",
    accent: "#e0b066",
    tint: "#b48a5a",
    tintStrength: 0.25,
    fogScale: 1.5,
    exposure: 0.95,
    briefing: [
      "Mama Zuri: We have one load of seed and one working pump. Spend them carefully.",
      "Radio: Dust front moving in from the plains. Close the shutters and check your fuel.",
    ],
  },
  {
    id: "drama",
    name: "Character Drama",
    tagline: "People before pipelines.",
    focus: "Relationships, loyalty and the cost of every decision.",
    accent: "#e6a0c8",
    tint: "#b07a8a",
    tintStrength: 0.18,
    fogScale: 1.1,
    exposure: 1.05,
    briefing: [
      "Wanjiku: Everyone here has lost something to TerraNova. They will watch what you do before they trust what you say.",
      "Mama Zuri: Your father built this farm for the village, not for himself. Remember that when the offers come.",
    ],
  },
  {
    id: "exploration",
    name: "Free Exploration",
    tagline: "The basin rewards the curious.",
    focus: "Driving, discovering locations and finding hidden stories.",
    accent: "#8fe3c0",
    tint: "#7fbfa8",
    tintStrength: 0.14,
    fogScale: 0.85,
    exposure: 1.1,
    briefing: [
      "Mama Zuri: The basin is bigger than the farm. Take the truck and see what is still out there.",
      "Radio: All roads are open. Old Waterworks, Sunridge, the plains — somebody left records everywhere.",
    ],
  },
];

export type DifficultyId = "story" | "normal" | "hard" | "survival";

export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  tagline: string;
  rewardScale: number;
  trustScale: number;
  repairScale: number;
  timerScale: number;
  guidance: boolean;
}

export const DIFFICULTIES: DifficultyDef[] = [
  {
    id: "story",
    name: "Story",
    tagline: "Generous timers, strong guidance, higher rewards.",
    rewardScale: 1.3,
    trustScale: 1.2,
    repairScale: 0.75,
    timerScale: 1.4,
    guidance: true,
  },
  {
    id: "normal",
    name: "Normal",
    tagline: "Balanced timers, rewards and repairs.",
    rewardScale: 1,
    trustScale: 1,
    repairScale: 1,
    timerScale: 1,
    guidance: false,
  },
  {
    id: "hard",
    name: "Hard",
    tagline: "Tighter timers, slower repairs, lower pay.",
    rewardScale: 0.9,
    trustScale: 0.85,
    repairScale: 1.25,
    timerScale: 0.8,
    guidance: false,
  },
  {
    id: "survival",
    name: "Survival",
    tagline: "The basin gives nothing back. Every run counts.",
    rewardScale: 0.75,
    trustScale: 0.7,
    repairScale: 1.5,
    timerScale: 0.65,
    guidance: false,
  },
];

export interface CampaignState {
  mood: MoodId;
  difficulty: DifficultyId;
  credits: number;
  trust: number;
  completed: Record<string, number>;
  failed: Record<string, number>;
  briefingSeen: boolean;
}

export interface WorldSave {
  hour: number;
  x: number;
  z: number;
  yaw: number;
  discovered: string[];
  driving: string | null;
}

export interface ActiveMissionSave {
  id: string;
  objectiveIndex: number;
  holdProgress: number;
  timer: number | null;
  cargo: boolean;
}

export interface SaveData {
  version: 1;
  savedAt: string;
  campaign: CampaignState;
  world: WorldSave;
  mission: ActiveMissionSave | null;
}

export const SAVE_KEY = "farmbot2090.save.v1";

export function moodOf(id: MoodId): MoodDef {
  return MOODS.find((mood) => mood.id === id) ?? MOODS[0];
}

export function difficultyOf(id: DifficultyId): DifficultyDef {
  return DIFFICULTIES.find((difficulty) => difficulty.id === id) ?? DIFFICULTIES[1];
}

export function createCampaign(mood: MoodId, difficulty: DifficultyId): CampaignState {
  return {
    mood,
    difficulty,
    credits: 80,
    trust: 10,
    completed: {},
    failed: {},
    briefingSeen: false,
  };
}

function isMoodId(value: unknown): value is MoodId {
  return typeof value === "string" && MOODS.some((mood) => mood.id === value);
}

function isDifficultyId(value: unknown): value is DifficultyId {
  return typeof value === "string" && DIFFICULTIES.some((difficulty) => difficulty.id === value);
}

function countRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") {
    return {};
  }
  const result: Record<string, number> = {};
  for (const [key, count] of Object.entries(value as Record<string, unknown>)) {
    if (typeof count === "number" && Number.isFinite(count) && count >= 0) {
      result[key] = Math.floor(count);
    }
  }
  return result;
}

export function saveGame(data: SaveData): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function readSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (parsed.version !== 1 || !parsed.campaign || !parsed.world) {
      return null;
    }
    if (!isMoodId(parsed.campaign.mood) || !isDifficultyId(parsed.campaign.difficulty)) {
      return null;
    }
    const world = parsed.world;
    const x = typeof world.x === "number" && Number.isFinite(world.x) ? world.x : -260;
    const z = typeof world.z === "number" && Number.isFinite(world.z) ? world.z : 190;
    const yaw = typeof world.yaw === "number" && Number.isFinite(world.yaw) ? world.yaw : 0;
    const hour = typeof world.hour === "number" && Number.isFinite(world.hour) ? ((world.hour % 24) + 24) % 24 : 16;
    return {
      version: 1,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
      campaign: {
        mood: parsed.campaign.mood,
        difficulty: parsed.campaign.difficulty,
        credits: typeof parsed.campaign.credits === "number" ? Math.max(0, Math.floor(parsed.campaign.credits)) : 0,
        trust: typeof parsed.campaign.trust === "number" ? Math.max(0, Math.floor(parsed.campaign.trust)) : 0,
        completed: countRecord(parsed.campaign.completed),
        failed: countRecord(parsed.campaign.failed),
        briefingSeen: parsed.campaign.briefingSeen === true,
      },
      world: {
        hour,
        x,
        z,
        yaw,
        discovered: Array.isArray(world.discovered)
          ? world.discovered.filter((id): id is string => typeof id === "string")
          : [],
        driving: typeof world.driving === "string" ? world.driving : null,
      },
      mission: parsed.mission && typeof parsed.mission.id === "string"
        ? {
            id: parsed.mission.id,
            objectiveIndex:
              typeof parsed.mission.objectiveIndex === "number" ? Math.max(0, Math.floor(parsed.mission.objectiveIndex)) : 0,
            holdProgress: typeof parsed.mission.holdProgress === "number" ? Math.max(0, parsed.mission.holdProgress) : 0,
            timer: typeof parsed.mission.timer === "number" ? Math.max(0, parsed.mission.timer) : null,
            cargo: parsed.mission.cargo === true,
          }
        : null,
    };
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return readSave() !== null;
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be unavailable in private modes; the game keeps running.
  }
}
