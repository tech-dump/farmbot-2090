import './style.css';
import { Game } from './core/game';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing #app root element');

try {
  const game = new Game(root);
  game.start();
} catch (error) {
  console.error('Failed to start FARM BOT 2090:', error);
  root.innerHTML = `
    <div class="fatal-screen" role="alert">
      <p class="eyebrow">SYSTEM FAILURE</p>
      <h1>VISUAL FEED OFFLINE</h1>
      <p>
        This game needs WebGL 2. Enable hardware acceleration in your browser
        settings, update your graphics driver, or try a current desktop version
        of Chrome, Edge, Firefox or Safari.
      </p>
    </div>
  `;
}
