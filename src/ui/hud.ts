function required<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing HUD element: ${selector}`);
  }
  return element;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * DOM overlay: start/pause screens, quest card, minimap frame, compass,
 * interaction prompt, speedometer and toasts. Interface copy only — no
 * gameplay state lives here.
 */
export class Hud {
  onNewCampaign: (() => void) | null = null;
  onContinue: (() => void) | null = null;
  onResume: (() => void) | null = null;
  onMissions: (() => void) | null = null;
  onDifficultyChange: ((difficulty: string) => void) | null = null;

  private readonly hud: HTMLDivElement;
  private readonly startScreen: HTMLDivElement;
  private readonly pauseScreen: HTMLDivElement;
  private readonly kicker: HTMLSpanElement;
  private readonly questTitle: HTMLHeadingElement;
  private readonly objective: HTMLParagraphElement;
  private readonly location: HTMLParagraphElement;
  private readonly time: HTMLSpanElement;
  private readonly missionTimer: HTMLParagraphElement;
  private readonly credits: HTMLSpanElement;
  private readonly trust: HTMLSpanElement;
  private readonly mood: HTMLSpanElement;
  private readonly campaignInfo: HTMLParagraphElement;
  private readonly difficultySelect: HTMLSelectElement;
  private readonly continueButton: HTMLButtonElement;
  private lastMissionSignature = "";
  private lastStandingSignature = "";
  private readonly compass: HTMLDivElement;
  private readonly compassArrow: HTMLDivElement;
  private readonly compassName: HTMLSpanElement;
  private readonly compassDistance: HTMLSpanElement;
  private readonly prompt: HTMLDivElement;
  private readonly promptLabel: HTMLSpanElement;
  private readonly speedo: HTMLDivElement;
  private readonly speedValue: HTMLSpanElement;
  private readonly speedName: HTMLSpanElement;
  private readonly toastElement: HTMLDivElement;
  private readonly pauseNote: HTMLParagraphElement;
  private toastTimer: number | null = null;

  readonly minimapCanvas: HTMLCanvasElement;

  constructor(root: HTMLElement) {
    root.insertAdjacentHTML(
      "beforeend",
      `
      <div class="hud" hidden>
        <section class="panel quest-panel">
          <p class="quest-kicker"><span data-hud="kicker">FREE ROAM</span><span class="quest-time" data-hud="time">16:36</span></p>
          <h1 class="quest-title" data-hud="quest-title">KIJANI BASIN</h1>
          <p class="quest-location" data-hud="location">KIJANI FAMILY FARM</p>
          <p class="quest-objective" data-hud="objective">Find the Kijani Tractor at the farm.</p>
          <p class="quest-timer" data-hud="mission-timer" hidden></p>
          <div class="standing">
            <span class="standing-chip" data-hud="credits">80 CR</span>
            <span class="standing-chip" data-hud="trust">TRUST 10</span>
            <span class="standing-chip mood" data-hud="mood">HEROIC</span>
          </div>
        </section>
        <div class="compass" data-hud="compass" hidden>
          <div class="compass-arrow" data-hud="compass-arrow">▲</div>
          <div class="compass-text">
            <span class="compass-name" data-hud="compass-name"></span>
            <span class="compass-distance" data-hud="compass-distance"></span>
          </div>
        </div>
        <div class="minimap-frame">
          <canvas class="minimap" width="440" height="440"></canvas>
          <span class="minimap-north">N</span>
        </div>
        <div class="legend-panel">
          <span><kbd>WASD</kbd> move</span>
          <span><kbd>Shift</kbd> sprint</span>
          <span><kbd>E</kbd> act</span>
          <span><kbd>J</kbd> missions</span>
          <span><kbd>M</kbd> map</span>
          <span><kbd>T</kbd> time</span>
        </div>
        <div class="prompt" data-hud="prompt" hidden>
          <kbd>E</kbd><span data-hud="prompt-label"></span>
        </div>
        <div class="speedo" data-hud="speedo" hidden>
          <span class="speed-value" data-hud="speed-value">0</span>
          <span class="speed-unit">km/h</span>
          <span class="speed-name" data-hud="speed-name"></span>
        </div>
        <div class="toast" data-hud="toast" hidden></div>
      </div>

      <div class="screen start-screen" data-screen="start">
        <div class="screen-card">
          <p class="eyebrow">KIJANI BASIN // 2090</p>
          <h1 class="game-title">FARM BOT <span>2090</span></h1>
          <p class="tagline">
            The basin is drying. The machines still listen.
            Somebody has to bring it back.
          </p>
          <ul class="feature-list">
            <li>Six story moods and four difficulty settings</li>
            <li>Mission board with timed and replayable contracts</li>
            <li>Free roam across nine locations with GPS</li>
            <li>Drivable tractor and pickup</li>
          </ul>
          <div class="controls-grid">
            <span><kbd>WASD</kbd> Move</span>
            <span><kbd>Shift</kbd> Sprint</span>
            <span><kbd>Space</kbd> Jump / handbrake</span>
            <span><kbd>E</kbd> Act / enter vehicle</span>
            <span><kbd>J</kbd> Mission board</span>
            <span><kbd>M</kbd> World map</span>
            <span><kbd>T</kbd> Advance time</span>
            <span><kbd>Esc</kbd> Pause</span>
          </div>
          <div class="start-actions">
            <button class="btn primary" data-action="new" type="button">NEW CAMPAIGN</button>
            <button class="btn ghost" data-action="continue" type="button" hidden>CONTINUE</button>
          </div>
          <p class="note start-note" data-hud="start-note">Campaign progress saves automatically in this browser.</p>
          <p class="credit">Created by Maxwell Muthuri · prototype build<br />AI assistance is disclosed in docs/AI_USAGE_LOG.md</p>
        </div>
      </div>

      <div class="screen pause-screen" hidden data-screen="pause">
        <div class="screen-card compact">
          <p class="eyebrow">SYSTEMS PAUSED</p>
          <h2>PAUSED</h2>
          <p class="note pause-campaign" data-hud="campaign-info"></p>
          <label class="pause-field">Difficulty
            <select data-hud="difficulty"></select>
          </label>
          <button class="btn primary" data-action="resume" type="button">RESUME</button>
          <button class="btn ghost" data-action="missions" type="button">MISSION BOARD</button>
          <p class="note" data-hud="pause-note">Esc releases the mouse. Click resume to continue.</p>
        </div>
      </div>
      `,
    );

    this.hud = required<HTMLDivElement>(root, ".hud");
    this.startScreen = required<HTMLDivElement>(root, '[data-screen="start"]');
    this.pauseScreen = required<HTMLDivElement>(root, '[data-screen="pause"]');
    this.kicker = required<HTMLSpanElement>(root, '[data-hud="kicker"]');
    this.questTitle = required<HTMLHeadingElement>(root, '[data-hud="quest-title"]');
    this.objective = required<HTMLParagraphElement>(root, '[data-hud="objective"]');
    this.location = required<HTMLParagraphElement>(root, '[data-hud="location"]');
    this.time = required<HTMLSpanElement>(root, '[data-hud="time"]');
    this.missionTimer = required<HTMLParagraphElement>(root, '[data-hud="mission-timer"]');
    this.credits = required<HTMLSpanElement>(root, '[data-hud="credits"]');
    this.trust = required<HTMLSpanElement>(root, '[data-hud="trust"]');
    this.mood = required<HTMLSpanElement>(root, '[data-hud="mood"]');
    this.campaignInfo = required<HTMLParagraphElement>(root, '[data-hud="campaign-info"]');
    this.difficultySelect = required<HTMLSelectElement>(root, '[data-hud="difficulty"]');
    this.continueButton = required<HTMLButtonElement>(root, '[data-action="continue"]');
    this.compass = required<HTMLDivElement>(root, '[data-hud="compass"]');
    this.compassArrow = required<HTMLDivElement>(root, '[data-hud="compass-arrow"]');
    this.compassName = required<HTMLSpanElement>(root, '[data-hud="compass-name"]');
    this.compassDistance = required<HTMLSpanElement>(root, '[data-hud="compass-distance"]');
    this.prompt = required<HTMLDivElement>(root, '[data-hud="prompt"]');
    this.promptLabel = required<HTMLSpanElement>(root, '[data-hud="prompt-label"]');
    this.speedo = required<HTMLDivElement>(root, '[data-hud="speedo"]');
    this.speedValue = required<HTMLSpanElement>(root, '[data-hud="speed-value"]');
    this.speedName = required<HTMLSpanElement>(root, '[data-hud="speed-name"]');
    this.toastElement = required<HTMLDivElement>(root, '[data-hud="toast"]');
    this.pauseNote = required<HTMLParagraphElement>(root, '[data-hud="pause-note"]');
    this.minimapCanvas = required<HTMLCanvasElement>(root, ".minimap");

    required<HTMLButtonElement>(root, '[data-action="new"]').addEventListener("click", () => {
      this.onNewCampaign?.();
    });
    this.continueButton.addEventListener("click", () => {
      this.onContinue?.();
    });
    required<HTMLButtonElement>(root, '[data-action="resume"]').addEventListener("click", () => {
      this.onResume?.();
    });
    required<HTMLButtonElement>(root, '[data-action="missions"]').addEventListener("click", () => {
      this.onMissions?.();
    });
    this.difficultySelect.addEventListener("change", () => {
      this.onDifficultyChange?.(this.difficultySelect.value);
    });
  }

  showStart(visible: boolean): void {
    this.startScreen.hidden = !visible;
  }

  showPause(visible: boolean): void {
    this.pauseScreen.hidden = !visible;
  }

  setHudVisible(visible: boolean): void {
    this.hud.hidden = !visible;
  }

  setObjective(text: string): void {
    this.objective.textContent = text;
  }

  setLocation(text: string): void {
    this.location.textContent = text.toUpperCase();
  }

  setTime(text: string): void {
    this.time.textContent = text;
  }

  setContinueVisible(visible: boolean): void {
    this.continueButton.hidden = !visible;
  }

  setStanding(credits: number, trust: number, moodName: string): void {
    const signature = `${credits}|${trust}|${moodName}`;
    if (signature === this.lastStandingSignature) {
      return;
    }
    this.lastStandingSignature = signature;
    this.credits.textContent = `${credits} CR`;
    this.trust.textContent = `TRUST ${trust}`;
    this.mood.textContent = moodName.toUpperCase();
  }

  setMission(track: { kicker: string; title: string; objective: string; timer: string | null } | null): void {
    if (!track) {
      if (this.lastMissionSignature !== "free-roam") {
        this.lastMissionSignature = "free-roam";
        this.kicker.textContent = "FREE ROAM";
        this.questTitle.textContent = "KIJANI BASIN";
        this.missionTimer.hidden = true;
      }
      return;
    }
    const signature = `${track.kicker}|${track.title}|${track.objective}|${track.timer ?? ""}`;
    if (signature === this.lastMissionSignature) {
      return;
    }
    this.lastMissionSignature = signature;
    this.kicker.textContent = track.kicker;
    this.questTitle.textContent = track.title;
    this.objective.textContent = track.objective;
    if (track.timer === null) {
      this.missionTimer.hidden = true;
      return;
    }
    this.missionTimer.hidden = false;
    this.missionTimer.textContent = `TIME LEFT · ${track.timer}`;
    const seconds = Number(track.timer.slice(0, 2)) * 60 + Number(track.timer.slice(3));
    this.missionTimer.classList.toggle("is-low", seconds <= 30);
  }

  setCampaignInfo(text: string): void {
    this.campaignInfo.textContent = text;
  }

  setDifficultyOptions(options: Array<{ id: string; label: string }>, selected: string, disabled: boolean): void {
    this.difficultySelect.replaceChildren();
    for (const option of options) {
      const element = document.createElement("option");
      element.value = option.id;
      element.textContent = option.label;
      element.selected = option.id === selected;
      this.difficultySelect.appendChild(element);
    }
    this.difficultySelect.disabled = disabled;
  }

  setCompass(label: string | null, meters: number, angle: number | null): void {
    if (label === null || angle === null) {
      this.compass.hidden = true;
      return;
    }
    this.compass.hidden = false;
    this.compassArrow.style.transform = `rotate(${angle}rad)`;
    this.compassName.textContent = label.toUpperCase();
    this.compassDistance.textContent = formatDistance(meters);
  }

  setSpeed(kmh: number | null, name = ""): void {
    if (kmh === null) {
      this.speedo.hidden = true;
      return;
    }
    this.speedo.hidden = false;
    this.speedValue.textContent = String(Math.round(Math.abs(kmh)));
    this.speedName.textContent = name.toUpperCase();
  }

  showPrompt(label: string | null): void {
    if (!label) {
      this.prompt.hidden = true;
      return;
    }
    this.prompt.hidden = false;
    this.promptLabel.textContent = label.toUpperCase();
  }

  toast(message: string, duration = 3400): void {
    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
    }
    this.toastElement.textContent = message;
    this.toastElement.hidden = false;
    this.toastElement.classList.remove("is-visible");
    void this.toastElement.offsetWidth;
    this.toastElement.classList.add("is-visible");
    this.toastTimer = window.setTimeout(() => {
      this.toastElement.classList.remove("is-visible");
      this.toastElement.hidden = true;
      this.toastTimer = null;
    }, duration);
  }

  setPauseNote(text: string): void {
    this.pauseNote.textContent = text;
  }
}
