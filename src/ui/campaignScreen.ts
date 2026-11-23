import { DIFFICULTIES, MOODS, difficultyOf, moodOf, type DifficultyId, type MoodId } from "../story/campaign";

function required<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing campaign screen element: ${selector}`);
  }
  return element;
}

/**
 * New-campaign setup: six story moods and four difficulties. The mood is a
 * presentation and mission-selection choice; the difficulty scales timers,
 * repair work, rewards and trust. Both are stored in the campaign save.
 */
export class CampaignScreen {
  onBegin: ((mood: MoodId, difficulty: DifficultyId) => void) | null = null;
  onBack: (() => void) | null = null;

  private readonly screen: HTMLDivElement;
  private readonly moodGrid: HTMLDivElement;
  private readonly difficultyRow: HTMLDivElement;
  private readonly summary: HTMLParagraphElement;
  private selectedMood: MoodId = "heroic";
  private selectedDifficulty: DifficultyId = "normal";

  constructor(root: HTMLElement) {
    root.insertAdjacentHTML(
      "beforeend",
      `
      <div class="screen campaign-screen" hidden data-screen="campaign">
        <div class="screen-card campaign-card">
          <p class="eyebrow">NEW CAMPAIGN · KIJANI BASIN</p>
          <h2>CHOOSE YOUR STORY</h2>
          <p class="campaign-lead">
            The basin and its people stay the same. The mood changes what you notice,
            which jobs reach the board and how the world treats you.
          </p>
          <div class="mood-grid" data-campaign="moods"></div>
          <p class="eyebrow campaign-section">DIFFICULTY</p>
          <div class="difficulty-row" data-campaign="difficulties"></div>
          <p class="campaign-summary" data-campaign="summary"></p>
          <div class="campaign-actions">
            <button class="btn ghost" data-campaign="back" type="button">BACK</button>
            <button class="btn primary" data-campaign="begin" type="button">BEGIN CAMPAIGN</button>
          </div>
        </div>
      </div>
      `,
    );

    this.screen = required<HTMLDivElement>(root, '[data-screen="campaign"]');
    this.moodGrid = required<HTMLDivElement>(root, '[data-campaign="moods"]');
    this.difficultyRow = required<HTMLDivElement>(root, '[data-campaign="difficulties"]');
    this.summary = required<HTMLParagraphElement>(root, '[data-campaign="summary"]');

    for (const mood of MOODS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mood-card";
      button.dataset.mood = mood.id;
      button.style.setProperty("--mood-accent", mood.accent);
      button.innerHTML = `
        <span class="mood-name"></span>
        <span class="mood-tagline"></span>
        <span class="mood-focus"></span>
      `;
      button.querySelector(".mood-name")!.textContent = mood.name;
      button.querySelector(".mood-tagline")!.textContent = mood.tagline;
      button.querySelector(".mood-focus")!.textContent = mood.focus;
      button.addEventListener("click", () => this.pickMood(mood.id));
      this.moodGrid.appendChild(button);
    }

    for (const difficulty of DIFFICULTIES) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "difficulty-card";
      button.dataset.difficulty = difficulty.id;
      const name = document.createElement("span");
      name.className = "difficulty-name";
      name.textContent = difficulty.name;
      const tagline = document.createElement("span");
      tagline.className = "difficulty-tagline";
      tagline.textContent = difficulty.tagline;
      button.append(name, tagline);
      button.addEventListener("click", () => this.pickDifficulty(difficulty.id));
      this.difficultyRow.appendChild(button);
    }

    required<HTMLButtonElement>(root, '[data-campaign="begin"]').addEventListener("click", () => {
      this.onBegin?.(this.selectedMood, this.selectedDifficulty);
    });
    required<HTMLButtonElement>(root, '[data-campaign="back"]').addEventListener("click", () => {
      this.onBack?.();
    });

    this.pickMood(this.selectedMood);
    this.pickDifficulty(this.selectedDifficulty);
  }

  get isOpen(): boolean {
    return !this.screen.hidden;
  }

  show(): void {
    this.screen.hidden = false;
  }

  hide(): void {
    this.screen.hidden = true;
  }

  private pickMood(moodId: MoodId): void {
    this.selectedMood = moodId;
    for (const card of this.moodGrid.querySelectorAll<HTMLButtonElement>(".mood-card")) {
      const selected = card.dataset.mood === moodId;
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-pressed", selected ? "true" : "false");
    }
    this.refreshSummary();
  }

  private pickDifficulty(difficultyId: DifficultyId): void {
    this.selectedDifficulty = difficultyId;
    for (const card of this.difficultyRow.querySelectorAll<HTMLButtonElement>(".difficulty-card")) {
      const selected = card.dataset.difficulty === difficultyId;
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-pressed", selected ? "true" : "false");
    }
    this.refreshSummary();
  }

  private refreshSummary(): void {
    const mood = moodOf(this.selectedMood);
    const difficulty = difficultyOf(this.selectedDifficulty);
    this.summary.textContent = `${mood.name} · ${difficulty.name} — ${difficulty.tagline}`;
    this.summary.style.setProperty("--mood-accent", mood.accent);
  }
}
