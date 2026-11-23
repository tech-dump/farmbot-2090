export interface MusicState {
  started: boolean;
  failed: boolean;
  src: string;
  readyState: number;
  duration: number;
  currentTime: number;
  paused: boolean;
  muted: boolean;
  volume: number;
}

/**
 * Looping campaign soundtrack. Audio is a licensed CC BY 4.0 track served
 * from public/audio; see docs/ASSETS_AND_CREDITS.md for attribution.
 */
export class MusicPlayer {
  private readonly element: HTMLAudioElement;
  private started = false;
  private failed = false;

  constructor() {
    this.element = new Audio(new URL("audio/stand-up.mp3", document.baseURI).href);
    this.element.loop = true;
    this.element.preload = "auto";
    this.element.volume = 0.35;
    this.element.addEventListener("error", () => {
      this.failed = true;
    });
  }

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    const result = this.element.play();
    if (result) {
      void result.catch(() => {
        // Browser refused the gesture-less play; another start() retries.
        this.started = false;
      });
    }
  }

  toggleMuted(): boolean {
    this.element.muted = !this.element.muted;
    return this.element.muted;
  }

  isMuted(): boolean {
    return this.element.muted;
  }

  state(): MusicState {
    return {
      started: this.started,
      failed: this.failed,
      src: this.element.src,
      readyState: this.element.readyState,
      duration: Number.isFinite(this.element.duration) ? this.element.duration : 0,
      currentTime: this.element.currentTime,
      paused: this.element.paused,
      muted: this.element.muted,
      volume: this.element.volume,
    };
  }
}
