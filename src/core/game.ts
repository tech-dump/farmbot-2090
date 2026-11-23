import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Engine } from "@babylonjs/core/Engines/engine";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { Scene } from "@babylonjs/core/scene";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { Input } from "./input";
import { MINUTES_PER_SECOND, START_HOUR } from "./constants";
import { clamp, lerp, smoothstep } from "./math";
import { Player } from "../player/player";
import { World } from "../world/world";
import { Vehicle, VehicleManager } from "../vehicles/vehicles";
import { Gps } from "../nav/gps";
import { LOCATION_BY_ID, LOCATIONS } from "../nav/locations";
import { heightAt } from "../world/landscape";
import { Hud } from "../ui/hud";
import { Minimap } from "../ui/minimap";
import { WorldMap } from "../ui/worldmap";
import type { MapState } from "../ui/mapTypes";

const NIGHT_SKY = Color3.FromHexString("#0a1220");
const DAY_SKY = Color3.FromHexString("#b8c9c2");
const DUSK_SKY = Color3.FromHexString("#c98a58");
const DAY_SUN = Color3.FromHexString("#fff1d8");
const DUSK_SUN = Color3.FromHexString("#ffad6e");
const HEMI_DAY = Color3.FromHexString("#cfdcd2");
const HEMI_NIGHT = Color3.FromHexString("#5f7590");
const GROUND_DAY = Color3.FromHexString("#6a5a3e");
const GROUND_NIGHT = Color3.FromHexString("#232a33");
const MOON_COLOR = Color3.FromHexString("#b7ccf0");
const DUSK_AMBIENT = Color3.FromHexString("#bf9a76");

interface TestApi {
  state: () => Record<string, unknown>;
  teleport: (x: number, z: number) => void;
  setWaypoint: (x: number, z: number, label?: string) => void;
  setWaypointToLocation: (id: string) => boolean;
  discoverAll: () => void;
  openMap: () => void;
  closeMap: () => void;
  enterNearest: () => string | null;
}

export class Game {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly camera: FreeCamera;
  private readonly input: Input;
  private readonly world: World;
  private readonly player: Player;
  private readonly vehicles: VehicleManager;
  private readonly gps: Gps;
  private readonly hud: Hud;
  private readonly minimap: Minimap;
  private readonly worldMap: WorldMap;
  private readonly sun: DirectionalLight;
  private readonly moon: DirectionalLight;
  private readonly headlight: SpotLight;
  private readonly hemi: HemisphericLight;
  private readonly villageLight: PointLight;
  private readonly hqLight: PointLight;
  private readonly sunDisc: Mesh;
  private readonly sunGlow: Mesh;
  private readonly sunDiscMaterial: StandardMaterial;
  private readonly glowMaterial: StandardMaterial;
  private readonly testMode: boolean;
  private readonly discovered = new Set<string>(["farm", "village", "service"]);

  private activeVehicle: Vehicle | null = null;
  private started = false;
  private paused = true;
  private mapOpen = false;
  private hour = START_HOUR;
  private hasEnteredVehicle = false;
  private nearestLocationName = "Kijani Basin";
  private mapAccumulator = 0;

  constructor(root: HTMLElement) {
    this.testMode = new URLSearchParams(window.location.search).has("test");

    const canvas = document.createElement("canvas");
    canvas.className = "game-canvas";
    root.appendChild(canvas);

    this.engine = new Engine(
      canvas,
      true,
      { preserveDrawingBuffer: true, stencil: true, antialias: true, powerPreference: "high-performance" },
      true,
    );
    this.engine.setHardwareScalingLevel(1 / Math.min(2, window.devicePixelRatio || 1));

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.72, 0.78, 0.76, 1);
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.0017;
    this.scene.fogColor = new Color3(0.72, 0.78, 0.76);
    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    this.scene.imageProcessingConfiguration.exposure = 1.1;
    this.scene.imageProcessingConfiguration.contrast = 1.06;

    this.camera = new FreeCamera("player-camera", new Vector3(0, 8, 0), this.scene);
    this.camera.minZ = 0.1;
    this.camera.maxZ = 3200;
    this.camera.fov = (70 * Math.PI) / 180;
    this.scene.activeCamera = this.camera;

    this.hemi = new HemisphericLight("hemi", new Vector3(0.15, 1, 0.2), this.scene);
    this.hemi.intensity = 0.55;
    this.hemi.diffuse = HEMI_DAY.clone();
    this.hemi.groundColor = GROUND_DAY.clone();

    this.sun = new DirectionalLight("sun", new Vector3(-0.6, -1, 0.35), this.scene);
    this.sun.position = new Vector3(-220, 380, 160);
    this.sun.shadowMinZ = 1;
    this.sun.shadowMaxZ = 520;
    this.sun.orthoLeft = -180;
    this.sun.orthoRight = 180;
    this.sun.orthoTop = 180;
    this.sun.orthoBottom = -180;
    this.sun.intensity = 1.4;

    const shadow = new ShadowGenerator(2048, this.sun);
    shadow.useBlurExponentialShadowMap = true;
    shadow.blurKernel = 24;
    shadow.darkness = 0.38;
    shadow.bias = 0.0012;
    shadow.normalBias = 0.02;

    this.moon = new DirectionalLight("moon", new Vector3(0.35, -0.8, 0.45), this.scene);
    this.moon.diffuse = MOON_COLOR.clone();
    this.moon.specular = Color3.Black();
    this.moon.intensity = 0.55;

    this.headlight = new SpotLight(
      "tractor-headlight",
      new Vector3(0, 0, 0),
      new Vector3(0, 0, 1),
      1.0,
      4,
      this.scene,
    );
    this.headlight.diffuse = Color3.FromHexString("#ffe3ab");
    this.headlight.specular = Color3.Black();
    this.headlight.range = 60;
    this.headlight.intensity = 0;

    this.villageLight = new PointLight("village-light", new Vector3(-60, heightAt(-60, 60) + 8, 60), this.scene);
    this.villageLight.diffuse = Color3.FromHexString("#ffc47d");
    this.villageLight.range = 95;
    this.villageLight.intensity = 0;

    this.hqLight = new PointLight("hq-light", new Vector3(400, heightAt(400, -20) + 10, -20), this.scene);
    this.hqLight.diffuse = Color3.FromHexString("#cfe6ff");
    this.hqLight.range = 110;
    this.hqLight.intensity = 0;

    this.world = new World(this.scene);
    for (const caster of this.world.shadowCasters) {
      shadow.addShadowCaster(caster, true);
    }

    this.vehicles = new VehicleManager(this.scene);
    for (const caster of this.vehicles.casters) {
      shadow.addShadowCaster(caster, true);
    }

    this.player = new Player();
    this.player.applyCamera(this.camera, 0.016);

    this.gps = new Gps(this.scene);

    this.sunDiscMaterial = new StandardMaterial("sun-disc-material", this.scene);
    this.sunDiscMaterial.disableLighting = true;
    this.sunDiscMaterial.emissiveColor = Color3.FromHexString("#ffe6b8");
    this.sunDiscMaterial.diffuseColor = Color3.Black();
    this.sunDiscMaterial.fogEnabled = false;
    this.sunDisc = MeshBuilder.CreateSphere("sun-disc", { diameter: 70, segments: 12 }, this.scene);
    this.sunDisc.material = this.sunDiscMaterial;
    this.sunDisc.isPickable = false;
    this.sunDisc.receiveShadows = false;

    this.glowMaterial = new StandardMaterial("sun-glow-material", this.scene);
    this.glowMaterial.disableLighting = true;
    this.glowMaterial.emissiveColor = Color3.FromHexString("#ffc98f");
    this.glowMaterial.diffuseColor = Color3.Black();
    this.glowMaterial.alpha = 0.18;
    this.glowMaterial.backFaceCulling = false;
    this.glowMaterial.fogEnabled = false;
    this.sunGlow = MeshBuilder.CreateSphere("sun-glow", { diameter: 170, segments: 12 }, this.scene);
    this.sunGlow.material = this.glowMaterial;
    this.sunGlow.isPickable = false;
    this.sunGlow.receiveShadows = false;

    this.hud = new Hud(root);
    this.minimap = new Minimap(this.hud.minimapCanvas);
    this.worldMap = new WorldMap(root, {
      onWaypoint: (x, z, label) => {
        this.gps.setWaypoint(x, z, label, this.currentPoint());
        this.hud.toast(`GPS waypoint set · ${label}`);
        this.worldMap.draw(this.buildMapState());
      },
      onClose: () => this.closeMap(),
    });

    this.input = new Input(canvas, this.testMode);
    this.input.onLockChange = (locked) => this.handleLockChange(locked);
    this.input.onLockError = () => {
      this.paused = true;
      this.hud.showPause(true);
      this.hud.setPauseNote("The browser blocked mouse capture. Click RESUME to try again.");
    };
    this.input.onKeyDown = (code) => this.handleActionKey(code);

    this.hud.onEngage = () => this.engage();
    this.hud.onResume = () => this.resume();

    canvas.addEventListener("click", () => {
      if (this.started && !this.mapOpen && !this.paused && !this.input.locked) {
        this.input.requestLock();
      }
    });

    window.addEventListener("resize", () => this.engine.resize());

    for (const material of this.scene.materials) {
      if (material instanceof StandardMaterial) {
        material.maxSimultaneousLights = 6;
      }
    }

    this.updateEnvironment();
    this.engine.runRenderLoop(() => this.frame());

    if (this.testMode) {
      this.startTestMode();
    }
  }

  private frame = (): void => {
    const dt = Math.min(0.05, this.engine.getDeltaTime() / 1000);
    if (this.started && this.mapOpen) {
      this.mapAccumulator += this.engine.getDeltaTime();
      if (this.mapAccumulator >= 90) {
        this.mapAccumulator = 0;
        this.worldMap.draw(this.buildMapState());
      }
      this.input.endFrame();
      return;
    }
    if (this.started && !this.paused) {
      this.update(dt);
    }
    this.scene.render();
    this.input.endFrame();
  };

  private engage(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.hud.showStart(false);
    this.hud.showPause(false);
    this.hud.setHudVisible(true);
    this.hud.setObjective("Find the Kijani Tractor at the farm. Press E to drive.");
    this.hud.setLocation("Kijani Family Farm");
    this.paused = false;
    this.input.requestLock();
    this.hud.toast("Kijani Basin online · M opens the survey map", 4200);
  }

  private resume(): void {
    this.paused = false;
    this.hud.showPause(false);
    this.input.requestLock();
  }

  private handleLockChange(locked: boolean): void {
    if (!this.started) {
      return;
    }
    if (locked) {
      this.paused = false;
      this.hud.showPause(false);
      return;
    }
    if (!this.mapOpen) {
      this.paused = true;
      this.hud.showPause(true);
      this.hud.setPauseNote("Esc releases the mouse. Click RESUME to continue.");
    }
  }

  private handleActionKey(code: string): void {
    if (!this.started) {
      return;
    }
    if (code === "KeyM") {
      if (this.mapOpen) {
        this.closeMap();
      } else {
        this.openMap();
      }
      return;
    }
    if (code === "Escape" && this.mapOpen) {
      this.closeMap();
      return;
    }
    if (code === "KeyT" && !this.mapOpen && !this.paused) {
      this.hour = (this.hour + 2) % 24;
      this.hud.toast(`Time advanced to ${this.formatHour()}`);
    }
  }

  private openMap(): void {
    if (this.mapOpen) {
      return;
    }
    this.mapOpen = true;
    this.hud.showPrompt(null);
    this.input.releaseLock();
    this.input.clearMouseDelta();
    this.worldMap.setVisible(true);
    this.worldMap.draw(this.buildMapState());
  }

  private closeMap(): void {
    if (!this.mapOpen) {
      return;
    }
    this.mapOpen = false;
    this.input.clearMouseDelta();
    this.worldMap.setVisible(false);
    if (this.testMode) {
      this.paused = false;
    } else {
      this.input.requestLock();
    }
  }

  private update(dt: number): void {
    this.hour = (this.hour + (dt * MINUTES_PER_SECOND) / 60) % 24;
    this.world.update(dt);

    let positionX = this.player.position.x;
    let positionZ = this.player.position.z;

    if (this.activeVehicle) {
      const vehicle = this.activeVehicle;
      vehicle.update(dt, this.input, this.world.colliders);
      vehicle.applyChaseCamera(this.camera, dt);
      positionX = vehicle.x;
      positionZ = vehicle.z;
      this.hud.setSpeed(vehicle.speed * 3.6, vehicle.name);
      this.hud.showPrompt(`Exit ${vehicle.name}`);
      if (this.input.consumePress("KeyE")) {
        this.exitVehicle();
      }
    } else {
      this.player.update(dt, this.input, this.world.colliders);
      this.player.applyCamera(this.camera, dt);
      this.hud.setSpeed(null);
      const nearest = this.vehicles.nearest(this.player.position, 7);
      this.hud.showPrompt(nearest ? `Drive ${nearest.name}` : null);
      if (nearest && this.input.consumePress("KeyE")) {
        this.enterVehicle(nearest);
      }
      positionX = this.player.position.x;
      positionZ = this.player.position.z;
    }

    this.updateEnvironment();
    this.gps.update(dt, { x: positionX, z: positionZ });
    this.updateDiscovery(positionX, positionZ);
    this.updateCompass(positionX, positionZ);
    this.updateObjective();
    this.minimap.draw(this.buildMapState());
  }

  private enterVehicle(vehicle: Vehicle): void {
    vehicle.occupied = true;
    this.activeVehicle = vehicle;
    vehicle.speed = 0;
    vehicle.applyChaseCamera(this.camera, 0, true);
    this.hud.toast(`${vehicle.name} engaged · WASD to drive · E to exit`);
    this.hud.setSpeed(0, vehicle.name);
    this.hud.setObjective("Drive the basin. M opens the survey map and sets GPS routes.");
    this.hasEnteredVehicle = true;
    this.hud.showPrompt(`Exit ${vehicle.name}`);
  }

  private exitVehicle(): void {
    const vehicle = this.activeVehicle;
    if (!vehicle) {
      return;
    }
    vehicle.occupied = false;
    this.activeVehicle = null;
    const point = vehicle.exitPoint();
    this.player.placeAt(point.x, point.z);
    this.player.yaw = point.yaw;
    this.player.applyCamera(this.camera, 0.016);
    this.hud.setSpeed(null);
    this.hud.showPrompt(null);
    this.hud.setObjective("Explore on foot. E enters nearby vehicles, M opens the map.");
    this.hud.toast(`${vehicle.name} parked`);
  }

  private updateDiscovery(x: number, z: number): void {
    for (const location of LOCATIONS) {
      if (this.discovered.has(location.id)) {
        continue;
      }
      if (Math.hypot(location.x - x, location.z - z) < location.discovery) {
        this.discovered.add(location.id);
        this.hud.toast(`Location discovered · ${location.name}`);
      }
    }

    let nearest = "Kijani Basin wilds";
    let best = 90;
    for (const location of LOCATIONS) {
      const distance = Math.hypot(location.x - x, location.z - z);
      if (distance < best) {
        best = distance;
        nearest = location.name;
      }
    }
    if (nearest !== this.nearestLocationName) {
      this.nearestLocationName = nearest;
      this.hud.setLocation(nearest);
    }
  }

  private updateCompass(x: number, z: number): void {
    if (!this.gps.waypoint) {
      this.hud.setCompass(null, 0, null);
      return;
    }
    const dx = this.gps.waypoint.x - x;
    const dz = this.gps.waypoint.z - z;
    const distance = Math.hypot(dx, dz);
    const facing = this.activeVehicle ? this.activeVehicle.yaw : this.player.yaw;
    let relative = Math.atan2(dx, dz) - facing;
    while (relative > Math.PI) {
      relative -= Math.PI * 2;
    }
    while (relative < -Math.PI) {
      relative += Math.PI * 2;
    }
    this.hud.setCompass(this.gps.waypoint.label, distance, relative);

    if (distance < 16) {
      this.hud.toast(`Waypoint reached · ${this.gps.waypoint.label}`);
      this.gps.clear();
      this.hud.setCompass(null, 0, null);
    }
  }

  private updateObjective(): void {
    if (!this.hasEnteredVehicle && this.activeVehicle === null) {
      return;
    }
    if (!this.activeVehicle && this.discovered.size >= 5) {
      this.hud.setObjective("Survey Kijani Basin. M sets waypoints to unexplored sites.");
    }
  }

  private updateEnvironment(): void {
    const theta = ((this.hour - 6) / 12) * Math.PI;
    const elevation = Math.sin(theta);
    const azimuth = Math.cos(theta);
    const sunDirection = new Vector3(azimuth, Math.max(elevation, 0.12), 0.35).normalize();
    const lightDirection = sunDirection.scale(-1);
    const daylight = smoothstep(-0.06, 0.28, elevation);
    const night = 1 - daylight;

    this.moon.intensity = 0.06 + night * 0.55;

    const vehicle = this.activeVehicle;
    if (vehicle) {
      const forwardX = Math.sin(vehicle.yaw);
      const forwardZ = Math.cos(vehicle.yaw);
      this.headlight.position.set(vehicle.x + forwardX * 2.1, heightAt(vehicle.x, vehicle.z) + 1.85, vehicle.z + forwardZ * 2.1);
      this.headlight.direction.set(forwardX, -0.2, forwardZ).normalize();
      this.headlight.intensity = night * 2.4;
    } else {
      this.headlight.intensity = 0;
    }

    this.sun.direction.copyFrom(lightDirection);
    const focusX = this.activeVehicle ? this.activeVehicle.x : this.player.position.x;
    const focusZ = this.activeVehicle ? this.activeVehicle.z : this.player.position.z;
    const focusY = heightAt(focusX, focusZ);
    this.sun.position.set(focusX + sunDirection.x * 300, focusY + sunDirection.y * 300, focusZ + sunDirection.z * 300);
    this.sun.intensity = 0.06 + daylight * 1.55;

    const dusk = clamp(1 - Math.abs(elevation) / 0.32, 0, 1);
    const warmth = 1 - smoothstep(0.05, 0.55, elevation);
    this.sun.diffuse = Color3.Lerp(DAY_SUN, DUSK_SUN, warmth);
    this.hemi.intensity = 0.42 + daylight * 0.4 + dusk * 0.4;
    this.hemi.diffuse = Color3.Lerp(HEMI_NIGHT, HEMI_DAY, daylight);
    this.hemi.diffuse.copyFrom(Color3.Lerp(this.hemi.diffuse, DUSK_AMBIENT, dusk * 0.6));
    this.hemi.groundColor = Color3.Lerp(GROUND_NIGHT, GROUND_DAY, daylight);

    const sky = Color3.Lerp(NIGHT_SKY, DAY_SKY, daylight);
    sky.copyFrom(Color3.Lerp(sky, DUSK_SKY, dusk * 0.55));
    this.scene.clearColor = new Color4(sky.r, sky.g, sky.b, 1);
    this.scene.fogColor.copyFrom(sky);
    this.scene.fogDensity = lerp(0.0021, 0.0015, daylight);

    this.villageLight.intensity = night * 1.3;
    this.hqLight.intensity = night * 1.0;

    this.sunDiscMaterial.emissiveColor = Color3.Lerp(DAY_SUN, DUSK_SUN, warmth);
    this.glowMaterial.emissiveColor = this.sunDiscMaterial.emissiveColor;
    const visible = elevation > -0.06;
    this.sunDisc.setEnabled(visible);
    this.sunGlow.setEnabled(visible);
    this.sunDisc.position.copyFrom(this.camera.position).addInPlace(sunDirection.scale(1300));
    this.sunGlow.position.copyFrom(this.sunDisc.position);
    this.sunDisc.scaling.setAll(1 + dusk * 0.25);

    this.hud.setTime(this.formatHour());
  }

  private formatHour(): string {
    const hours = Math.floor(this.hour);
    const minutes = Math.floor((this.hour - hours) * 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  private currentPoint(): { x: number; z: number } {
    if (this.activeVehicle) {
      return { x: this.activeVehicle.x, z: this.activeVehicle.z };
    }
    return { x: this.player.position.x, z: this.player.position.z };
  }

  private buildMapState(): MapState {
    const point = this.currentPoint();
    return {
      playerX: point.x,
      playerZ: point.z,
      playerYaw: this.activeVehicle ? this.activeVehicle.yaw : this.player.yaw,
      vehicles: this.vehicles.vehicles.map((vehicle) => ({
        x: vehicle.x,
        z: vehicle.z,
        kind: vehicle.kind,
        active: vehicle === this.activeVehicle,
      })),
      waypoint: this.gps.waypoint,
      route: this.gps.route,
      discovered: this.discovered,
      driving: this.activeVehicle !== null,
    };
  }

  private startTestMode(): void {
    this.started = true;
    this.paused = false;
    this.hud.showStart(false);
    this.hud.showPause(false);
    this.hud.setHudVisible(true);
    this.hud.setObjective("Find the Kijani Tractor at the farm. Press E to drive.");
    this.hud.setLocation("Kijani Family Farm");

    const api: TestApi = {
      state: () => {
        const point = this.currentPoint();
        return {
          started: this.started,
          paused: this.paused,
          mapOpen: this.mapOpen,
          driving: this.activeVehicle?.name ?? null,
          x: point.x,
          z: point.z,
          y: heightAt(point.x, point.z),
          yaw: this.activeVehicle ? this.activeVehicle.yaw : this.player.yaw,
          speed: this.activeVehicle?.speed ?? this.player.speed,
          waypoint: this.gps.waypoint,
          routeLength: this.gps.routeLength,
          discovered: Array.from(this.discovered),
          hour: this.hour,
          location: this.nearestLocationName,
        };
      },
      teleport: (x, z) => {
        if (this.activeVehicle) {
          this.activeVehicle.x = x;
          this.activeVehicle.z = z;
          this.activeVehicle.speed = 0;
          this.activeVehicle.applyChaseCamera(this.camera, 0, true);
        } else {
          this.player.placeAt(x, z);
          this.player.applyCamera(this.camera, 0.016);
        }
      },
      setWaypoint: (x, z, label = "Test waypoint") => {
        this.gps.setWaypoint(x, z, label, this.currentPoint());
      },
      setWaypointToLocation: (id) => {
        const location = LOCATION_BY_ID.get(id);
        if (!location) {
          return false;
        }
        this.gps.setWaypoint(location.x, location.z, location.name, this.currentPoint());
        return true;
      },
      discoverAll: () => {
        for (const location of LOCATIONS) {
          this.discovered.add(location.id);
        }
      },
      openMap: () => this.openMap(),
      closeMap: () => this.closeMap(),
      enterNearest: () => {
        const vehicle = this.vehicles.nearest(this.player.position, 12);
        if (!vehicle) {
          return null;
        }
        this.enterVehicle(vehicle);
        return vehicle.name;
      },
    };
    (window as unknown as { __farmbot: TestApi }).__farmbot = api;
    (window as unknown as { __farmbotScene: Scene }).__farmbotScene = this.scene;
  }
}
