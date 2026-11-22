type LockChangeHandler = (locked: boolean) => void;

/**
 * Keyboard + pointer-lock input. Mouse deltas are accumulated while the
 * pointer is locked and consumed once per frame by the player controller.
 */
export class Input {
  private readonly keys = new Set<string>();
  private readonly pressed = new Set<string>();
  private mouseDX = 0;
  private mouseDY = 0;
  private readonly canvas: HTMLCanvasElement;
  private readonly onLockChange: LockChangeHandler;
  private readonly onLockError: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    onLockChange: LockChangeHandler,
    onLockError: () => void
  ) {
    this.canvas = canvas;
    this.onLockChange = onLockChange;
    this.onLockError = onLockError;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    document.addEventListener('pointerlockerror', this.handlePointerLockError);
  }

  get locked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  requestLock(): void {
    if (this.locked) return;
    const result = this.canvas.requestPointerLock() as unknown;
    if (result instanceof Promise) {
      result.catch(() => this.onLockError());
    }
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  /** True once per physical key press. Cleared by endFrame(). */
  consumePress(code: string): boolean {
    if (!this.pressed.has(code)) return false;
    this.pressed.delete(code);
    return true;
  }

  consumeMouseDelta(): { dx: number; dy: number } {
    const delta = { dx: this.mouseDX, dy: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return delta;
  }

  endFrame(): void {
    this.pressed.clear();
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) return;
    this.keys.add(event.code);
    this.pressed.add(event.code);
    if (this.locked && (event.code === 'Space' || event.code.startsWith('Arrow'))) {
      event.preventDefault();
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private handleBlur = (): void => {
    this.keys.clear();
    this.pressed.clear();
  };

  private handleMouseMove = (event: MouseEvent): void => {
    if (!this.locked) return;
    this.mouseDX += event.movementX;
    this.mouseDY += event.movementY;
  };

  private handlePointerLockChange = (): void => {
    const locked = this.locked;
    this.mouseDX = 0;
    this.mouseDY = 0;
    if (!locked) this.keys.clear();
    this.onLockChange(locked);
  };

  private handlePointerLockError = (): void => {
    this.onLockError();
  };
}
