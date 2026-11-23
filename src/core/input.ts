type LockHandler = (locked: boolean) => void;

/**
 * Keyboard and mouse state. Pointer lock is the pause source of truth in a
 * normal session; the automated QA mode (?test=1) accepts input without it
 * because headless browsers refuse pointer lock.
 */
export class Input {
  locked = false;
  onLockChange: LockHandler | null = null;
  onLockError: (() => void) | null = null;
  onKeyDown: ((code: string) => void) | null = null;

  private readonly canvas: HTMLCanvasElement;
  private readonly testMode: boolean;
  private readonly keys = new Set<string>();
  private readonly pressed = new Set<string>();
  private mouseDX = 0;
  private mouseDY = 0;

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code === "Tab" || event.code === "Space" || event.code === "KeyM") {
      event.preventDefault();
    }
    if (!event.repeat) {
      this.pressed.add(event.code);
      this.onKeyDown?.(event.code);
    }
    this.keys.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (!this.locked && !this.testMode) {
      return;
    }
    this.mouseDX += event.movementX;
    this.mouseDY += event.movementY;
  };

  private readonly handleLockChange = (): void => {
    const locked = document.pointerLockElement === this.canvas;
    if (locked === this.locked) {
      return;
    }
    this.locked = locked;
    if (!locked) {
      this.keys.clear();
      this.mouseDX = 0;
      this.mouseDY = 0;
    }
    this.onLockChange?.(locked);
  };

  private readonly handleBlur = (): void => {
    this.keys.clear();
  };

  constructor(canvas: HTMLCanvasElement, testMode: boolean) {
    this.canvas = canvas;
    this.testMode = testMode;
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("pointerlockchange", this.handleLockChange);
    document.addEventListener("pointerlockerror", this.handleLockError);
    window.addEventListener("blur", this.handleBlur);
  }

  private readonly handleLockError = (): void => {
    this.onLockError?.();
  };

  requestLock(): void {
    if (this.testMode) {
      this.locked = true;
      this.onLockChange?.(true);
      return;
    }
    const result = this.canvas.requestPointerLock() as Promise<void> | undefined;
    if (result && typeof result.catch === "function") {
      result.catch(() => this.onLockError?.());
    }
  }

  releaseLock(): void {
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  consumePress(code: string): boolean {
    if (!this.pressed.has(code)) {
      return false;
    }
    this.pressed.delete(code);
    return true;
  }

  consumeMouseDelta(): { x: number; y: number } {
    const delta = { x: this.mouseDX, y: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return delta;
  }

  clearMouseDelta(): void {
    this.mouseDX = 0;
    this.mouseDY = 0;
  }

  endFrame(): void {
    this.pressed.clear();
  }
}
