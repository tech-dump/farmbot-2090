import './style.css';
import { Game } from './core/game';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing #app root element');
const root: HTMLDivElement = app;

function showFatal(detail: string): void {
  root.innerHTML = `
    <div class="fatal-screen" role="alert">
      <p class="eyebrow">SYSTEM FAILURE</p>
      <h1>VISUAL FEED OFFLINE</h1>
      <p>
        FARM BOT 2090 needs WebGL 2. Enable hardware acceleration in your
        browser settings, update your graphics driver, or try a current
        desktop version of Chrome, Edge or Firefox.
      </p>
      <p class="fatal-hint">
        Embedded browser previews (such as the one inside a code editor or
        agent app) often disable WebGL. Open this address in a normal browser
        tab instead:
        <span class="fatal-url" data-current-url></span>
      </p>
      <p class="fatal-detail" data-error-detail></p>
    </div>
  `;
  const urlLabel = root.querySelector<HTMLElement>('[data-current-url]');
  if (urlLabel) urlLabel.textContent = window.location.href;
  const errorLabel = root.querySelector<HTMLElement>('[data-error-detail]');
  if (errorLabel) errorLabel.textContent = detail;
}

try {
  const probe = document.createElement('canvas');
  if (!probe.getContext('webgl2')) {
    throw new Error('WebGL 2 context could not be created');
  }
  const game = new Game(root);
  console.info('FARM BOT 2090 ready', game);
} catch (error) {
  console.error('Failed to start FARM BOT 2090:', error);
  showFatal(error instanceof Error ? error.message : String(error));
}
