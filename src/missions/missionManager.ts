import { difficultyOf, type ActiveMissionSave, type CampaignState, type MoodId } from "../story/campaign";
import { LOCATION_BY_ID } from "../nav/locations";
import { MISSION_BY_ID, MISSIONS, type MissionDef } from "./missions";

export type MissionStatus = "available" | "active" | "completed" | "failed";

export interface MissionView {
  def: MissionDef;
  status: MissionStatus;
  completions: number;
  failures: number;
  lockedBy: MissionDef | null;
  locationName: string;
}

export interface MissionPrompt {
  kind: "interact" | "hold";
  label: string;
  progress: number;
  distance: number;
}

export interface MissionTrack {
  kicker: string;
  title: string;
  objective: string;
  timer: string | null;
}

export interface MissionCallbacks {
  onObjective: (def: MissionDef, objectiveIndex: number) => void;
  onComplete: (def: MissionDef, credits: number, trust: number) => void;
  onFail: (def: MissionDef, reason: string) => void;
}

interface ActiveMission {
  def: MissionDef;
  objectiveIndex: number;
  holdProgress: number;
  timer: number | null;
  cargo: boolean;
}

export interface MissionContext {
  x: number;
  z: number;
  driving: boolean;
  holding: boolean;
  dt: number;
}

function formatTimer(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export class MissionManager {
  private readonly campaign: CampaignState;
  private readonly callbacks: MissionCallbacks;
  private active: ActiveMission | null = null;

  constructor(campaign: CampaignState, callbacks: MissionCallbacks) {
    this.campaign = campaign;
    this.callbacks = callbacks;
  }

  get activeMission(): MissionDef | null {
    return this.active?.def ?? null;
  }

  get activeObjectiveIndex(): number {
    return this.active?.objectiveIndex ?? 0;
  }

  get timer(): number | null {
    return this.active?.timer ?? null;
  }

  views(mood: MoodId): MissionView[] {
    const views: MissionView[] = [];
    for (const def of MISSIONS) {
      if (def.moods && !def.moods.includes(mood)) {
        continue;
      }
      let lockedBy: MissionDef | null = null;
      for (const requiredId of def.requires ?? []) {
        if ((this.campaign.completed[requiredId] ?? 0) === 0) {
          lockedBy = MISSION_BY_ID.get(requiredId) ?? null;
          break;
        }
      }
      const completions = this.campaign.completed[def.id] ?? 0;
      const failures = this.campaign.failed[def.id] ?? 0;
      const status: MissionStatus =
        this.active?.def.id === def.id
          ? "active"
          : completions > 0
            ? "completed"
            : failures > 0
              ? "failed"
              : "available";
      views.push({
        def,
        status,
        completions,
        failures,
        lockedBy,
        locationName: LOCATION_BY_ID.get(def.locationId)?.name ?? def.locationId,
      });
    }
    return views;
  }

  activate(id: string, mood: MoodId): boolean {
    const def = MISSION_BY_ID.get(id);
    if (!def) {
      return false;
    }
    if (def.moods && !def.moods.includes(mood)) {
      return false;
    }
    for (const requiredId of def.requires ?? []) {
      if ((this.campaign.completed[requiredId] ?? 0) === 0) {
        return false;
      }
    }
    const difficulty = difficultyOf(this.campaign.difficulty);
    this.active = {
      def,
      objectiveIndex: 0,
      holdProgress: 0,
      timer: def.timeLimitSec ? def.timeLimitSec * difficulty.timerScale : null,
      cargo: def.startsLoaded === true,
    };
    this.callbacks.onObjective(def, 0);
    return true;
  }

  postpone(): void {
    this.active = null;
  }

  update(context: MissionContext): void {
    const active = this.active;
    if (!active) {
      return;
    }
    if (active.timer !== null) {
      active.timer -= context.dt;
      if (active.timer <= 0) {
        this.fail("The window closed before the job was done.");
        return;
      }
    }

    const objective = active.def.objectives[active.objectiveIndex];
    const distance = Math.hypot(objective.x - context.x, objective.z - context.z);
    const inRange = distance <= objective.radius;

    if (objective.kind === "reach" && inRange) {
      this.advance();
      return;
    }
    if (objective.kind === "deliver") {
      const haulsCargo = active.def.objectives.some((step) => step.loadsCargo === true);
      const cargoReady = !haulsCargo || active.cargo;
      if (inRange && context.driving && cargoReady) {
        this.advance();
      }
      return;
    }
    if (objective.kind === "hold") {
      if (!inRange) {
        active.holdProgress = 0;
        return;
      }
      if (!context.holding) {
        return;
      }
      const duration = (objective.holdSeconds ?? 5) * difficultyOf(this.campaign.difficulty).repairScale;
      active.holdProgress = Math.min(1, active.holdProgress + context.dt / duration);
      if (active.holdProgress >= 1) {
        this.advance();
      }
    }
  }

  interact(x: number, z: number): boolean {
    const active = this.active;
    if (!active) {
      return false;
    }
    const objective = active.def.objectives[active.objectiveIndex];
    if (objective.kind !== "interact") {
      return false;
    }
    if (Math.hypot(objective.x - x, objective.z - z) > objective.radius) {
      return false;
    }
    this.advance();
    return true;
  }

  promptAt(x: number, z: number): MissionPrompt | null {
    const active = this.active;
    if (!active) {
      return null;
    }
    const objective = active.def.objectives[active.objectiveIndex];
    if (objective.kind !== "interact" && objective.kind !== "hold") {
      return null;
    }
    const distance = Math.hypot(objective.x - x, objective.z - z);
    if (distance > objective.radius) {
      return null;
    }
    return {
      kind: objective.kind,
      label: objective.label,
      progress: active.holdProgress,
      distance,
    };
  }

  objectiveDistance(x: number, z: number): number | null {
    const active = this.active;
    if (!active) {
      return null;
    }
    const objective = active.def.objectives[active.objectiveIndex];
    return Math.hypot(objective.x - x, objective.z - z);
  }

  track(): MissionTrack | null {
    const active = this.active;
    if (!active) {
      return null;
    }
    const objective = active.def.objectives[active.objectiveIndex];
    const difficulty = difficultyOf(this.campaign.difficulty);
    const step = `${active.def.objectives.length > 1 ? `${active.objectiveIndex + 1}/${active.def.objectives.length} · ` : ""}${objective.label}`;
    let objectiveText = step;
    if (objective.kind === "hold" && active.holdProgress > 0) {
      objectiveText = `${step} · ${Math.round(active.holdProgress * 100)}%`;
    } else if (difficulty.guidance) {
      objectiveText = `${step}. ${objective.hint}`;
    }
    return {
      kicker: active.def.act,
      title: active.def.title,
      objective: objectiveText,
      timer: active.timer !== null ? formatTimer(active.timer) : null,
    };
  }

  activeCargo(): boolean {
    return this.active?.cargo ?? false;
  }

  serialize(): ActiveMissionSave | null {
    if (!this.active) {
      return null;
    }
    return {
      id: this.active.def.id,
      objectiveIndex: this.active.objectiveIndex,
      holdProgress: this.active.holdProgress,
      timer: this.active.timer,
      cargo: this.active.cargo,
    };
  }

  restore(save: ActiveMissionSave): boolean {
    const def = MISSION_BY_ID.get(save.id);
    if (!def) {
      return false;
    }
    const objectiveIndex = Math.min(save.objectiveIndex, def.objectives.length - 1);
    this.active = {
      def,
      objectiveIndex,
      holdProgress: Math.min(1, Math.max(0, save.holdProgress)),
      timer: save.timer,
      cargo: save.cargo,
    };
    this.callbacks.onObjective(def, objectiveIndex);
    return true;
  }

  private advance(): void {
    const active = this.active;
    if (!active) {
      return;
    }
    const finished = active.def.objectives[active.objectiveIndex];
    if (finished.loadsCargo) {
      active.cargo = true;
    }
    active.holdProgress = 0;
    active.objectiveIndex += 1;
    if (active.objectiveIndex >= active.def.objectives.length) {
      this.complete();
      return;
    }
    this.callbacks.onObjective(active.def, active.objectiveIndex);
  }

  private complete(): void {
    const active = this.active;
    if (!active) {
      return;
    }
    const difficulty = difficultyOf(this.campaign.difficulty);
    const firstClear = (this.campaign.completed[active.def.id] ?? 0) === 0;
    const credits = Math.max(1, Math.round(active.def.reward.credits * difficulty.rewardScale * (firstClear ? 1 : 0.25)));
    const trust = firstClear ? Math.max(1, Math.round(active.def.reward.trust * difficulty.trustScale)) : 0;
    this.campaign.credits += credits;
    this.campaign.trust += trust;
    this.campaign.completed[active.def.id] = (this.campaign.completed[active.def.id] ?? 0) + 1;
    this.active = null;
    this.callbacks.onComplete(active.def, credits, trust);
  }

  private fail(reason: string): void {
    const active = this.active;
    if (!active) {
      return;
    }
    this.campaign.failed[active.def.id] = (this.campaign.failed[active.def.id] ?? 0) + 1;
    this.campaign.trust = Math.max(0, this.campaign.trust - 1);
    this.active = null;
    this.callbacks.onFail(active.def, reason);
  }
}
