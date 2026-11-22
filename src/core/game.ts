import * as THREE from 'three';
import { Input } from './input';
import { Player } from '../player/player';
import { World, type Interactable } from '../world/world';
import { Hud } from '../ui/hud';

/**
 * Owns the renderer, scene, update loop and pause/pointer-lock flow.
 * Stage 1 has no audio or save systems yet; those arrive in later stages
 * with human-created or licensed assets.
 */
export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly clock = new THREE.Clock();
  private readonly input: Input;
  private readonly world: World;
  private readonly player: Player;
  private readonly hud: Hud;
  private readonly raycaster = new THREE.Raycaster();
  private readonly screenCenter = new THREE.Vector2(0, 0);
  private started = false;
  private paused = true;
  private currentTarget: Interactable | null = null;

  constructor(root: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    root.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      72,
      window.innerWidth / window.innerHeight,
      0.1,
      180
    );

    this.scene.background = new THREE.Color(0x8c7f6a);
    this.scene.fog = new THREE.FogExp2(0x8c7f6a, 0.017);

    this.world = new World(this.scene);
    this.hud = new Hud(root);
    this.input = new Input(
      this.renderer.domElement,
      (locked) => this.handleLockChange(locked),
      () => this.hud.showHint('Mouse capture was blocked. Click the view to try again.')
    );
    this.player = new Player(this.camera, this.input, this.world.colliders);

    this.hud.onStart = () => {
      this.started = true;
      this.hud.showStartScreen(false);
      this.hud.showPauseScreen(false);
      this.input.requestLock();
    };
    this.hud.onResume = () => this.input.requestLock();

    this.renderer.domElement.addEventListener('click', () => {
      if (this.started && !this.input.locked) {
        this.input.requestLock();
      }
    });
    window.addEventListener('resize', () => this.handleResize());

    // Development-only QA hook. Headless browsers block pointer lock, so
    // ?test=1 starts the simulation without mouse capture for automated
    // rendering and movement checks. Normal builds are unaffected.
    if (new URLSearchParams(window.location.search).has('test')) {
      this.started = true;
      this.paused = false;
      this.hud.showStartScreen(false);
      this.hud.showPauseScreen(false);
      this.hud.setHudVisible(true);
      document.body.classList.add('pointer-locked');
    }
  }

  start(): void {
    this.clock.start();
    requestAnimationFrame(this.frame);
  }

  private frame = (): void => {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.world.update(dt);
    if (!this.paused) {
      this.player.update(dt);
      this.updateInteraction();
    }
    this.input.endFrame();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.frame);
  };

  private updateInteraction(): void {
    this.raycaster.setFromCamera(this.screenCenter, this.camera);
    this.raycaster.far = 3.8;

    const hits = this.raycaster.intersectObjects(
      this.world.interactableRoots,
      true
    );

    let target: Interactable | null = null;
    for (const hit of hits) {
      let node: THREE.Object3D | null = hit.object;
      while (node) {
        const id = node.userData.interactId as string | undefined;
        if (id) {
          target = this.world.interactables.find((item) => item.id === id) ?? null;
          break;
        }
        node = node.parent;
      }
      if (target) break;
    }

    if (target !== this.currentTarget) {
      this.currentTarget = target;
      if (target) {
        this.hud.showPrompt(target.label);
      } else {
        this.hud.hidePrompt();
      }
    }

    if (target && this.input.consumePress('KeyE')) {
      this.hud.toast(target.message);
    }
  }

  private handleLockChange(locked: boolean): void {
    document.body.classList.toggle('pointer-locked', locked);
    if (locked) {
      this.started = true;
      this.paused = false;
      this.hud.showStartScreen(false);
      this.hud.showPauseScreen(false);
      this.hud.showHint('');
      this.hud.setHudVisible(true);
      return;
    }
    if (this.started) {
      this.paused = true;
      this.currentTarget = null;
      this.hud.setHudVisible(false);
      this.hud.showPauseScreen(true);
    }
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
