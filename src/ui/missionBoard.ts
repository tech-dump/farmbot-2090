import type { MissionView } from "../missions/missionManager";
import { CATEGORY_LABELS } from "../missions/missions";
import { difficultyOf, moodOf, type CampaignState } from "../story/campaign";

function required<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing mission board element: ${selector}`);
  }
  return element;
}

const STATUS_LABEL: Record<MissionView["status"], string> = {
  available: "AVAILABLE",
  active: "ACTIVE",
  completed: "COMPLETED",
  failed: "FAILED",
};

function ratingDots(rating: number): string {
  return "●".repeat(Math.max(1, Math.min(5, rating))) + "○".repeat(Math.max(0, 5 - rating));
}

/**
 * Full-screen mission board. Lists contracts with giver, location, rating,
 * estimate, requirements and rewards; activating a mission sets the GPS
 * route and closes the board.
 */
export class MissionBoard {
  onActivate: ((id: string) => void) | null = null;
  onPostpone: (() => void) | null = null;
  onClose: (() => void) | null = null;

  private readonly screen: HTMLDivElement;
  private readonly list: HTMLUListElement;
  private readonly detail: HTMLElement;
  private readonly campaignLine: HTMLParagraphElement;
  private readonly standing: HTMLSpanElement;
  private views: MissionView[] = [];
  private campaign: CampaignState | null = null;
  private selectedId: string | null = null;

  constructor(root: HTMLElement) {
    root.insertAdjacentHTML(
      "beforeend",
      `
      <div class="screen board-screen" hidden data-screen="board">
        <div class="board-panel">
          <header class="board-header">
            <div>
              <p class="eyebrow">KIJANI BASIN // MISSION BOARD</p>
              <h2>CONTRACTS</h2>
              <p class="board-campaign" data-board="campaign"></p>
            </div>
            <button class="board-close" data-board="close" type="button" aria-label="Close mission board">×</button>
          </header>
          <div class="board-body">
            <ul class="mission-list" data-board="list"></ul>
            <section class="mission-detail" data-board="detail"></section>
          </div>
          <footer class="board-footer">
            <span data-board="standing"></span>
            <span class="board-hint">J or Esc closes · activation sets a GPS route · progress saves automatically</span>
          </footer>
        </div>
      </div>
      `,
    );

    this.screen = required<HTMLDivElement>(root, '[data-screen="board"]');
    this.list = required<HTMLUListElement>(root, '[data-board="list"]');
    this.detail = required<HTMLElement>(root, '[data-board="detail"]');
    this.campaignLine = required<HTMLParagraphElement>(root, '[data-board="campaign"]');
    this.standing = required<HTMLSpanElement>(root, '[data-board="standing"]');

    required<HTMLButtonElement>(root, '[data-board="close"]').addEventListener("click", () => this.onClose?.());
  }

  get isOpen(): boolean {
    return !this.screen.hidden;
  }

  show(views: MissionView[], campaign: CampaignState, activeId: string | null): void {
    this.views = views;
    this.campaign = campaign;
    this.selectedId = activeId ?? views.find((view) => view.status === "available")?.def.id ?? views[0]?.def.id ?? null;
    this.screen.hidden = false;
    this.render();
  }

  hide(): void {
    this.screen.hidden = true;
  }

  refresh(views: MissionView[], campaign: CampaignState, activeId: string | null): void {
    this.views = views;
    this.campaign = campaign;
    if (activeId) {
      this.selectedId = activeId;
    }
    if (!this.selectedId || !views.some((view) => view.def.id === this.selectedId)) {
      this.selectedId = activeId ?? views.find((view) => view.status === "available")?.def.id ?? views[0]?.def.id ?? null;
    }
    this.render();
  }

  private render(): void {
    const campaign = this.campaign;
    if (!campaign) {
      return;
    }
    const difficulty = difficultyOf(campaign.difficulty);
    const mood = moodOf(campaign.mood);
    this.campaignLine.textContent = `${mood.name.toUpperCase()} MOOD · ${difficulty.name.toUpperCase()} DIFFICULTY`;
    this.standing.textContent = `${campaign.credits} CREDITS · ${campaign.trust} COMMUNITY TRUST`;

    this.list.replaceChildren();
    for (const view of this.views) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mission-row";
      button.dataset.mission = view.def.id;
      if (view.def.id === this.selectedId) {
        button.classList.add("is-selected");
      }
      const top = document.createElement("span");
      top.className = "mission-row-top";
      const title = document.createElement("span");
      title.className = "mission-row-title";
      title.textContent = view.def.title;
      const status = document.createElement("span");
      const locked = view.lockedBy !== null && view.status === "available";
      status.className = `mission-status status-${locked ? "locked" : view.status}`;
      status.textContent = locked ? "LOCKED" : STATUS_LABEL[view.status];
      top.append(title, status);
      const meta = document.createElement("span");
      meta.className = "mission-row-meta";
      meta.textContent = `${CATEGORY_LABELS[view.def.category].toUpperCase()} · ${view.locationName.toUpperCase()}`;
      const reward = document.createElement("span");
      reward.className = "mission-row-reward";
      reward.textContent = `${Math.round(view.def.reward.credits * difficulty.rewardScale)} CR · +${Math.round(view.def.reward.trust * difficulty.trustScale)} TRUST`;
      button.append(top, meta, reward);
      button.addEventListener("click", () => {
        this.selectedId = view.def.id;
        this.render();
      });
      item.appendChild(button);
      this.list.appendChild(item);
    }

    this.renderDetail();
  }

  private renderDetail(): void {
    const campaign = this.campaign;
    const view = this.views.find((entry) => entry.def.id === this.selectedId);
    this.detail.replaceChildren();
    if (!campaign || !view) {
      return;
    }
    const def = view.def;
    const difficulty = difficultyOf(campaign.difficulty);
    const activeId = this.views.find((entry) => entry.status === "active")?.def.id ?? null;

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = `${def.act} · ${CATEGORY_LABELS[def.category].toUpperCase()} · ${def.importance.toUpperCase()}`;
    const title = document.createElement("h3");
    title.textContent = def.title;
    const description = document.createElement("p");
    description.className = "mission-description";
    description.textContent = def.description;

    const facts = document.createElement("dl");
    facts.className = "mission-facts";
    const addFact = (label: string, value: string): void => {
      const wrap = document.createElement("div");
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      wrap.append(dt, dd);
      facts.appendChild(wrap);
    };
    addFact("Giver", def.giver);
    addFact("Location", view.locationName);
    addFact("Challenge", `${ratingDots(def.rating)} ${def.rating}/5`);
    addFact("Estimate", `${def.estimatedMinutes} min`);
    addFact("Timer", def.timeLimitSec ? `${Math.round(def.timeLimitSec * difficulty.timerScale / 60)} min limit` : "No time limit");
    addFact("Reward", `${Math.round(def.reward.credits * difficulty.rewardScale)} CR · +${Math.round(def.reward.trust * difficulty.trustScale)} trust`);
    if (view.lockedBy) {
      addFact("Requirement", `Complete ${view.lockedBy.title}`);
    } else if (def.requires && def.requires.length > 0) {
      addFact("Requirement", "Met");
    }
    if (view.completions > 0) {
      addFact("Cleared", `${view.completions}× · replay pays 25% credits`);
    }
    if (view.failures > 0) {
      addFact("Failed", `${view.failures}×`);
    }

    const objectiveHeading = document.createElement("p");
    objectiveHeading.className = "mission-objectives-heading";
    objectiveHeading.textContent = "OBJECTIVES";
    const objectives = document.createElement("ol");
    objectives.className = "mission-objectives";
    def.objectives.forEach((objective, index) => {
      const li = document.createElement("li");
      li.textContent = objective.label;
      if (index === 0 && view.status === "active") {
        li.classList.add("is-current");
      }
      objectives.appendChild(li);
    });

    const actions = document.createElement("div");
    actions.className = "mission-actions";
    if (view.status === "active") {
      const postpone = document.createElement("button");
      postpone.type = "button";
      postpone.className = "btn ghost";
      postpone.textContent = "POSTPONE";
      postpone.addEventListener("click", () => this.onPostpone?.());
      const tracked = document.createElement("span");
      tracked.className = "mission-tracked";
      tracked.textContent = "TRACKED · follow the GPS banner";
      actions.append(postpone, tracked);
    } else if (view.lockedBy) {
      const locked = document.createElement("button");
      locked.type = "button";
      locked.className = "btn ghost";
      locked.disabled = true;
      locked.textContent = `LOCKED · ${view.lockedBy.title.toUpperCase()}`;
      actions.appendChild(locked);
    } else if (activeId) {
      const blocked = document.createElement("button");
      blocked.type = "button";
      blocked.className = "btn ghost";
      blocked.disabled = true;
      blocked.textContent = "POSTPONE THE ACTIVE MISSION FIRST";
      actions.appendChild(blocked);
    } else {
      const activate = document.createElement("button");
      activate.type = "button";
      activate.className = "btn primary";
      activate.textContent =
        view.status === "completed" ? "REPLAY MISSION" : view.status === "failed" ? "RETRY MISSION" : "ACTIVATE MISSION";
      activate.addEventListener("click", () => this.onActivate?.(def.id));
      actions.appendChild(activate);
    }

    this.detail.append(eyebrow, title, description, facts, objectiveHeading, objectives, actions);
  }
}
