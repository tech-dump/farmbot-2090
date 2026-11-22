/**
 * DOM overlay: start screen, pause screen, objective card, interaction
 * prompt, toasts and transient hints. All text here is interface copy, not
 * final narrative or the itch.io game description.
 */
export class Hud {
  onStart: () => void = () => {};
  onResume: () => void = () => {};

  private readonly hudLayer: HTMLDivElement;
  private readonly startScreen: HTMLDivElement;
  private readonly pauseScreen: HTMLDivElement;
  private readonly prompt: HTMLDivElement;
  private readonly promptLabel: HTMLSpanElement;
  private readonly toastElement: HTMLDivElement;
  private readonly hintElement: HTMLDivElement;
  private toastTimer: number | undefined;
  private hintTimer: number | undefined;

  constructor(private readonly root: HTMLElement) {
    this.root.insertAdjacentHTML(
      'beforeend',
      `
      <div class="hud-layer" hidden>
        <div class="objective-panel">
          <span class="tag">PROTOTYPE // STAGE 1</span>
          <h2>THE FORGOTTEN FARM</h2>
          <p>Explore the site and check the remaining systems.</p>
        </div>
        <div class="crosshair" aria-hidden="true"></div>
        <div class="interact-prompt" hidden>
          <kbd>E</kbd>
          <span class="interact-label"></span>
        </div>
        <div class="toast" role="status" aria-live="polite" hidden></div>
        <div class="controls-hint">
          <span><kbd>W A S D</kbd> move</span>
          <span><kbd>Shift</kbd> sprint</span>
          <span><kbd>Space</kbd> jump</span>
          <span><kbd>E</kbd> inspect</span>
          <span><kbd>Esc</kbd> pause</span>
        </div>
        <div class="frame-tag">FARM-01 // VISUAL FEED</div>
      </div>
      <div class="hint" role="status" hidden></div>
      <div class="overlay start-overlay">
        <div class="panel">
          <p class="eyebrow">HACK CLUB HARVEST 2026 // PROTOTYPE</p>
          <h1>FARM BOT 2090</h1>
          <p class="subtitle">THE LAST SEED</p>
          <div class="divider"></div>
          <p class="blurb">
            Stage 1 build. Movement and environment only, using placeholder
            geometry. Farming, restoration and audio arrive in later stages.
          </p>
          <div class="controls-grid">
            <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>Move</span></div>
            <div><kbd>Mouse</kbd><span>Look</span></div>
            <div><kbd>Shift</kbd><span>Sprint</span></div>
            <div><kbd>Space</kbd><span>Jump</span></div>
            <div><kbd>E</kbd><span>Inspect</span></div>
            <div><kbd>Esc</kbd><span>Pause</span></div>
          </div>
          <button class="btn" id="start-btn" type="button">ENGAGE</button>
          <p class="footnote">
            Clicking captures the mouse. Press Esc to release it.
          </p>
        </div>
      </div>
      <div class="overlay pause-overlay" hidden>
        <div class="panel panel-small">
          <p class="eyebrow">SYSTEMS PAUSED</p>
          <h2>RESUME FEED</h2>
          <button class="btn" id="resume-btn" type="button">RESUME</button>
          <p class="footnote">Esc releases the mouse. Click resume to continue.</p>
        </div>
      </div>
      `
    );

    this.hudLayer = this.query<HTMLDivElement>('.hud-layer');
    this.startScreen = this.query<HTMLDivElement>('.start-overlay');
    this.pauseScreen = this.query<HTMLDivElement>('.pause-overlay');
    this.prompt = this.query<HTMLDivElement>('.interact-prompt');
    this.promptLabel = this.query<HTMLSpanElement>('.interact-label');
    this.toastElement = this.query<HTMLDivElement>('.toast');
    this.hintElement = this.query<HTMLDivElement>('.hint');

    this.query<HTMLButtonElement>('#start-btn').addEventListener('click', () =>
      this.onStart()
    );
    this.query<HTMLButtonElement>('#resume-btn').addEventListener('click', () =>
      this.onResume()
    );
  }

  showStartScreen(visible: boolean): void {
    this.startScreen.hidden = !visible;
  }

  showPauseScreen(visible: boolean): void {
    this.pauseScreen.hidden = !visible;
  }

  setHudVisible(visible: boolean): void {
    this.hudLayer.hidden = !visible;
    if (!visible) this.hidePrompt();
  }

  showPrompt(label: string): void {
    this.promptLabel.textContent = label;
    this.prompt.hidden = false;
  }

  hidePrompt(): void {
    this.prompt.hidden = true;
  }

  toast(message: string): void {
    this.toastElement.textContent = message;
    this.toastElement.hidden = false;
    if (this.toastTimer !== undefined) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastElement.hidden = true;
    }, 4500);
  }

  showHint(message: string): void {
    if (!message) {
      this.hintElement.hidden = true;
      return;
    }
    this.hintElement.textContent = message;
    this.hintElement.hidden = false;
    if (this.hintTimer !== undefined) window.clearTimeout(this.hintTimer);
    this.hintTimer = window.setTimeout(() => {
      this.hintElement.hidden = true;
    }, 5000);
  }

  private query<T extends HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`HUD element not found: ${selector}`);
    return element;
  }
}
