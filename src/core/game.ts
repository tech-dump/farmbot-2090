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
import { Player, SPAWN } from "../player/player";
import { World } from "../world/world";
import { Vehicle, VehicleManager } from "../vehicles/vehicles";
import { Gps } from "../nav/gps";
import { LOCATION_BY_ID, LOCATIONS } from "../nav/locations";
import { heightAt } from "../world/landscape";
import { Hud } from "../ui/hud";
import { Minimap } from "../ui/minimap";
import { WorldMap } from "../ui/worldmap";
import { CampaignScreen } from "../ui/campaignScreen";
import { MissionBoard } from "../ui/missionBoard";
import { MissionManager } from "../missions/missionManager";
import { createHumanoid, animateHumanoid, type HumanoidRig } from "../characters/humanoid";
import { Characters } from "../characters/characters";
import { Veyari, CRASH_SITE } from "../characters/aliens";
import { Corrupted } from "../characters/robots";
import {
  CRASH_LINES,
  DIALOGUES,
  INTRO_LINES,
  type CinematicLine,
  type DialogueChoice,
  type DialogueDef,
} from "../story/dialogue";
import {
  DIFFICULTIES,
  MOODS,
  createCampaign,
  difficultyOf,
  moodOf,
  readSave,
  saveGame,
  clearSave,
  type CampaignState,
  type DifficultyId,
  type MoodId,
  type SaveData,
} from "../story/campaign";
import type { MissionDef } from "../missions/missions";
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

interface DialogueSession {
  def: DialogueDef;
  nodeIndex: number;
  phase: "lines" | "choices" | "reply";
}

interface CinematicSession {
  lines: CinematicLine[];
  index: number;
  skippable: boolean;
  onDone: () => void;
}

interface TestApi {
  state: () => Record<string, unknown>;
  teleport: (x: number, z: number) => void;
  setWaypoint: (x: number, z: number, label?: string) => void;
  setWaypointToLocation: (id: string) => boolean;
  discoverAll: () => void;
  openMap: () => void;
  closeMap: () => void;
  enterNearest: () => string | null;
  campaign: () => Record<string, unknown>;
  missions: () => Array<Record<string, unknown>>;
  newCampaign: (mood: string, difficulty: string) => boolean;
  activateMission: (id: string) => boolean;
  mission: () => Record<string, unknown> | null;
  expireMission: () => boolean;
  interact: () => boolean;
  save: () => boolean;
  load: () => boolean;
  clearSave: () => void;
  openBoard: () => void;
  closeBoard: () => void;
  cameraMode: () => string;
  setCameraMode: (mode: string) => void;
  characters: () => Array<Record<string, unknown>>;
  robots: () => Array<Record<string, unknown>>;
  aliens: () => Record<string, unknown>;
  flags: () => Record<string, boolean>;
  setFlag: (name: string, value: boolean) => void;
  openDialogue: (id: string) => boolean;
  dialogue: () => Record<string, unknown> | null;
  dialogueAdvance: () => void;
  dialogueChoose: (index: number) => void;
  cinematic: () => Record<string, unknown> | null;
  skipCinematic: () => void;
  playIntro: () => void;
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
  private readonly campaignSetup: CampaignScreen;
  private readonly board: MissionBoard;
  private readonly missions: MissionManager;
  private readonly characters: Characters;
  private readonly aliens: Veyari;
  private readonly robots: Corrupted;
  private readonly amani: HumanoidRig;
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

  private campaign: CampaignState = createCampaign("heroic", "normal");
  private activeVehicle: Vehicle | null = null;
  private started = false;
  private paused = true;
  private mapOpen = false;
  private boardOpen = false;
  private thirdPerson = true;
  private dialogueSession: DialogueSession | null = null;
  private cinematicSession: CinematicSession | null = null;
  private chapterTimer: number | null = null;
  private cinematicTime = 0;
  private frameCount = 0;
  private readonly robotAlerts = new Map<string, number>();
  private hour = START_HOUR;
  private hasEnteredVehicle = false;
  private nearestLocationName = "Kijani Basin";
  private mapAccumulator = 0;
  private saveAccumulator = 0;
  private moodTint = Color3.FromHexString("#ffcf8a");
  private moodTintStrength = 0.18;
  private moodFogScale = 0.95;
  private moodExposure = 1.12;

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

    this.characters = new Characters(this.scene);
    this.aliens = new Veyari(this.scene);
    this.robots = new Corrupted(this.scene);
    this.amani = createHumanoid(
      this.scene,
      {
        skin: "#6b4128",
        shirt: "#3f6b58",
        trousers: "#3b3f45",
        shoes: "#1b1815",
        hair: "#16110e",
        accent: "#e5b34e",
        backpack: true,
        scale: 1.02,
      },
    );
    this.amani.root.position.set(SPAWN.x, heightAt(SPAWN.x, SPAWN.z), SPAWN.z);
    for (const caster of [
      ...this.characters.casters,
      ...this.aliens.casters,
      ...this.robots.casters,
      ...this.amani.casters,
    ]) {
      shadow.addShadowCaster(caster, true);
    }

    this.player = new Player();
    this.player.applyCamera(this.camera, 0.016, this.thirdPerson);

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
    this.campaignSetup = new CampaignScreen(root);
    this.board = new MissionBoard(root);
    this.missions = new MissionManager(this.campaign, {
      onObjective: (def: MissionDef, index: number) => {
        const objective = def.objectives[index];
        this.gps.setWaypoint(objective.x, objective.z, objective.label, this.currentPoint());
        this.hud.toast(`${def.title} · ${objective.label}`, 3800);
        this.saveProgress();
      },
      onComplete: (def: MissionDef, credits: number, trust: number) => {
        this.gps.clear();
        this.hud.setCompass(null, 0, null);
        this.hud.setMission(null);
        this.hud.setObjective(`Contract complete · ${def.title}. Press J to choose the next one.`);
        this.hud.setStanding(this.campaign.credits, this.campaign.trust, moodOf(this.campaign.mood).name);
        this.hud.toast(
          `Contract complete · ${def.title} · +${credits} CR${trust > 0 ? ` · +${trust} trust` : ""}`,
          5200,
        );
        this.saveProgress();
      },
      onFail: (def: MissionDef, reason: string) => {
        this.gps.clear();
        this.hud.setCompass(null, 0, null);
        this.hud.setMission(null);
        this.hud.setObjective(`Contract failed · ${def.title}. Press J to retry.`);
        this.hud.setStanding(this.campaign.credits, this.campaign.trust, moodOf(this.campaign.mood).name);
        this.hud.toast(`Contract failed · ${reason}`, 5200);
        this.saveProgress();
      },
    });
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

    this.hud.onNewCampaign = () => this.openCampaignSetup();
    this.hud.onContinue = () => this.continueFromSave();
    this.hud.onResume = () => this.resume();
    this.hud.onMissions = () => this.openBoard();
    this.hud.onDifficultyChange = (difficulty) => this.changeDifficulty(difficulty);
    this.hud.onDialogueChoice = (index) => this.chooseDialogue(index);

    this.campaignSetup.onBegin = (mood, difficulty) => this.startCampaign(mood, difficulty);
    this.campaignSetup.onBack = () => this.closeCampaignSetup();

    this.board.onActivate = (id) => {
      this.activateMission(id);
    };
    this.board.onPostpone = () => this.postponeMission();
    this.board.onClose = () => this.closeBoard();

    this.refreshCampaignHud();
    this.hud.setContinueVisible(readSave() !== null);
    this.applyMoodPalette();

    window.addEventListener("beforeunload", () => this.saveProgress());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this.saveProgress();
      }
    });

    canvas.addEventListener("click", () => {
      if (
        this.started &&
        !this.mapOpen &&
        !this.boardOpen &&
        !this.paused &&
        !this.input.locked &&
        !this.dialogueSession &&
        !this.cinematicSession
      ) {
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
    this.frameCount += 1;
    const dt = Math.min(0.05, this.engine.getDeltaTime() / 1000);
    if (this.campaignSetup.isOpen || this.boardOpen) {
      this.scene.render();
      this.input.endFrame();
      return;
    }
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
      if (this.dialogueSession || this.cinematicSession) {
        this.updatePresentation(dt);
      } else {
        this.update(dt);
      }
    }
    this.scene.render();
    this.input.endFrame();
  };

  private openCampaignSetup(): void {
    if (this.started) {
      return;
    }
    this.hud.showStart(false);
    this.campaignSetup.show();
  }

  private closeCampaignSetup(): void {
    this.campaignSetup.hide();
    this.hud.setContinueVisible(readSave() !== null);
    this.hud.showStart(true);
  }

  private startCampaign(mood: MoodId, difficulty: DifficultyId): void {
    Object.assign(this.campaign, createCampaign(mood, difficulty));
    this.missions.postpone();
    this.gps.clear();
    this.hud.setCompass(null, 0, null);
    this.hud.setMission(null);
    this.campaignSetup.hide();
    this.board.hide();
    this.boardOpen = false;
    this.mapOpen = false;
    this.worldMap.setVisible(false);
    this.hud.showStart(false);
    this.hud.showPause(false);
    this.hud.setHudVisible(true);
    this.hud.setLocation("Kijani Family Farm");
    this.activeVehicle = null;
    this.hasEnteredVehicle = false;
    this.hour = START_HOUR;
    this.discovered.clear();
    this.discovered.add("farm");
    this.discovered.add("village");
    this.discovered.add("service");
    for (const vehicle of this.vehicles.vehicles) {
      vehicle.reset();
    }
    this.robots.reset();
    this.dialogueSession = null;
    this.cinematicSession = null;
    this.hud.closeDialogue();
    this.hud.showCinematic(false);
    this.hud.hideChapter();
    this.thirdPerson = true;
    this.amani.root.setEnabled(true);
    this.player.placeAt(SPAWN.x, SPAWN.z);
    this.player.yaw = SPAWN.yaw;
    this.player.applyCamera(this.camera, 0.016, this.thirdPerson);
    this.hud.setSpeed(null);
    this.started = true;
    this.paused = false;
    this.refreshCampaignHud();
    this.applyMoodPalette();
    this.updateEnvironment();
    this.hud.setObjective("Open the mission board with J and accept a contract.");
    this.saveProgress();
    this.hud.setContinueVisible(true);
    this.input.requestLock();
    const moodDef = moodOf(mood);
    this.hud.toast(`${moodDef.name} · ${moodDef.briefing[0]}`, 7000);
    if (!this.testMode) {
      this.playIntro();
    }
  }

  private continueFromSave(): void {
    const save = readSave();
    if (!save) {
      this.hud.setContinueVisible(false);
      this.hud.toast("No saved campaign found in this browser");
      return;
    }
    Object.assign(this.campaign, save.campaign);
    this.campaignSetup.hide();
    this.hud.showStart(false);
    this.hud.showPause(false);
    this.hud.setHudVisible(true);
    this.missions.postpone();
    this.board.hide();
    this.boardOpen = false;
    this.discovered.clear();
    for (const id of save.world.discovered) {
      this.discovered.add(id);
    }
    this.hour = save.world.hour;
    this.activeVehicle = null;
    for (const vehicle of this.vehicles.vehicles) {
      vehicle.reset();
    }
    this.robots.reset();
    this.dialogueSession = null;
    this.cinematicSession = null;
    this.hud.closeDialogue();
    this.hud.showCinematic(false);
    this.hud.hideChapter();
    const savedVehicle =
      save.world.driving === null
        ? undefined
        : this.vehicles.vehicles.find((vehicle) => vehicle.id === save.world.driving);
    if (savedVehicle) {
      savedVehicle.placeAt(save.world.x, save.world.z, save.world.yaw);
      savedVehicle.occupied = true;
      this.activeVehicle = savedVehicle;
      savedVehicle.applyChaseCamera(this.camera, 0, true);
      this.hud.setSpeed(0, savedVehicle.name);
    } else {
      this.player.placeAt(save.world.x, save.world.z);
      this.player.yaw = save.world.yaw;
      this.player.applyCamera(this.camera, 0.016, this.thirdPerson);
      this.hud.setSpeed(null);
    }
    this.started = true;
    this.paused = false;
    this.refreshCampaignHud();
    this.applyMoodPalette();
    if (save.mission) {
      this.missions.restore(save.mission);
      this.hud.setMission(this.missions.track());
    } else {
      this.hud.setMission(null);
      this.hud.setObjective("Press J to browse the mission board.");
    }
    this.updateEnvironment();
    this.input.requestLock();
    this.hud.toast(`Campaign resumed · saved ${new Date(save.savedAt).toLocaleString()}`);
  }

  private changeDifficulty(difficulty: string): void {
    const match = DIFFICULTIES.find((entry) => entry.id === difficulty);
    if (!match) {
      return;
    }
    this.campaign.difficulty = match.id;
    this.refreshCampaignHud();
    this.saveProgress();
    this.hud.toast(`Difficulty set to ${match.name} · applies to new timers and repairs`);
  }

  private openBoard(): void {
    if (this.boardOpen || !this.started || this.campaignSetup.isOpen) {
      return;
    }
    this.boardOpen = true;
    if (this.mapOpen) {
      this.mapOpen = false;
      this.worldMap.setVisible(false);
    }
    this.hud.showPrompt(null);
    this.hud.showPause(false);
    this.paused = true;
    this.input.releaseLock();
    this.input.clearMouseDelta();
    this.board.show(this.missions.views(this.campaign.mood), this.campaign, this.missions.activeMission?.id ?? null);
  }

  private closeBoard(): void {
    if (!this.boardOpen) {
      return;
    }
    this.boardOpen = false;
    this.board.hide();
    this.input.clearMouseDelta();
    if (this.testMode) {
      this.paused = false;
    } else {
      this.input.requestLock();
    }
  }

  private activateMission(id: string): boolean {
    if (!this.missions.activate(id, this.campaign.mood)) {
      this.hud.toast("That contract is not available right now");
      return false;
    }
    this.refreshCampaignHud();
    this.hud.setMission(this.missions.track());
    this.saveProgress();
    if (this.boardOpen) {
      this.closeBoard();
    }
    return true;
  }

  private postponeMission(): void {
    if (!this.missions.activeMission) {
      return;
    }
    this.missions.postpone();
    this.gps.clear();
    this.hud.setCompass(null, 0, null);
    this.hud.setMission(null);
    this.hud.setObjective("No active contract. Press J to browse the mission board.");
    this.saveProgress();
    this.hud.toast("Contract postponed · returns to the board");
    if (this.boardOpen) {
      this.closeBoard();
    }
  }

  private toggleCamera(): void {
    if (this.activeVehicle) {
      this.hud.toast("Exit the vehicle to change camera");
      return;
    }
    this.thirdPerson = !this.thirdPerson;
    this.amani.root.setEnabled(this.thirdPerson);
    this.hud.toast(this.thirdPerson ? "Third-person camera · V to switch" : "First-person camera · V to switch");
  }

  private handleInteract(): void {
    const point = this.player.position;
    const completed = this.missions.interact(point.x, point.z);
    if (completed) {
      return;
    }
    const npc = this.characters.nearest(point.x, point.z, 3.6);
    if (npc) {
      this.openDialogue(npc.def.dialogue);
      return;
    }
    const alien = this.aliens.nearest(point.x, point.z, 4.2);
    if (alien) {
      this.openDialogue(alien.id);
      return;
    }
    const vehicle = this.vehicles.nearest(point, 7);
    if (vehicle) {
      this.enterVehicle(vehicle);
    }
  }

  private availableChoices(def: DialogueDef): DialogueChoice[] {
    const views = this.missions.views(this.campaign.mood);
    return def.choices.filter((choice) => {
      if (!choice.mission) {
        return true;
      }
      const view = views.find((entry) => entry.def.id === choice.mission);
      return view !== undefined && (view.status === "available" || view.status === "failed");
    });
  }

  private openDialogue(id: string): void {
    const def = DIALOGUES[id];
    if (!def) {
      return;
    }
    this.dialogueSession = { def, nodeIndex: 0, phase: "lines" };
    this.hud.showPrompt(null);
    this.hud.showDialogueChoices([]);
    this.hud.openDialogue(def.speaker, def.role);
    this.hud.setDialogue(def.nodes[0], "E · continue");
    this.input.clearMouseDelta();
  }

  private advanceDialogue(): void {
    const session = this.dialogueSession;
    if (!session) {
      return;
    }
    if (session.phase === "reply") {
      this.closeDialogue();
      return;
    }
    if (session.phase === "choices") {
      return;
    }
    session.nodeIndex += 1;
    if (session.nodeIndex < session.def.nodes.length) {
      this.hud.setDialogue(session.def.nodes[session.nodeIndex], "E · continue");
      return;
    }
    const choices = this.availableChoices(session.def);
    if (choices.length === 0) {
      this.closeDialogue();
      return;
    }
    session.phase = "choices";
    this.hud.setDialogue("What do you say?", "1–3 · choose · click an option");
    this.hud.showDialogueChoices(choices.map((choice) => choice.label));
  }

  private chooseDialogue(index: number): void {
    const session = this.dialogueSession;
    if (!session || session.phase !== "choices") {
      return;
    }
    const choice = this.availableChoices(session.def)[index];
    if (!choice) {
      return;
    }
    if (choice.trust) {
      this.campaign.trust = Math.max(0, this.campaign.trust + choice.trust);
    }
    if (choice.credits) {
      this.campaign.credits += choice.credits;
    }
    if (choice.flag) {
      this.campaign.flags[choice.flag] = true;
    }
    session.phase = "reply";
    this.hud.setDialogue(choice.reply, "E · close");
    this.hud.showDialogueChoices([]);
    if (choice.mission) {
      this.activateMission(choice.mission);
    }
    this.refreshCampaignHud();
    this.saveProgress();
  }

  private closeDialogue(): void {
    if (!this.dialogueSession) {
      return;
    }
    this.dialogueSession = null;
    this.hud.closeDialogue();
    this.input.clearMouseDelta();
    if (!this.testMode) {
      this.input.requestLock();
    }
  }

  private playIntro(): void {
    this.hud.showChapter("ACT I · HOMECOMING", "Back to Kijani");
    this.startCinematic(INTRO_LINES, () => {
      this.campaign.flags["intro-seen"] = true;
      this.hud.hideChapter();
      this.hud.toast("Act I · Press J to open the mission board", 6000);
      this.saveProgress();
    });
    if (this.chapterTimer !== null) {
      window.clearTimeout(this.chapterTimer);
    }
    this.chapterTimer = window.setTimeout(() => {
      this.chapterTimer = null;
      this.hud.hideChapter();
    }, 2600);
  }

  private startCinematic(lines: CinematicLine[], onDone: () => void): void {
    if (lines.length === 0) {
      onDone();
      return;
    }
    this.cinematicSession = { lines, index: 0, skippable: true, onDone };
    this.cinematicTime = 0;
    this.hud.showPrompt(null);
    this.hud.showCinematic(true);
    this.hud.setCinematic(lines[0].speaker, lines[0].text);
    this.input.clearMouseDelta();
  }

  private advanceCinematic(): void {
    const session = this.cinematicSession;
    if (!session) {
      return;
    }
    session.index += 1;
    if (session.index >= session.lines.length) {
      this.endCinematic(false);
      return;
    }
    const line = session.lines[session.index];
    this.hud.setCinematic(line.speaker, line.text);
  }

  private endCinematic(skipped: boolean): void {
    const session = this.cinematicSession;
    if (!session) {
      return;
    }
    this.cinematicSession = null;
    this.hud.showCinematic(false);
    this.hud.hideChapter();
    if (this.chapterTimer !== null) {
      window.clearTimeout(this.chapterTimer);
      this.chapterTimer = null;
    }
    this.input.clearMouseDelta();
    session.onDone();
    if (!this.testMode) {
      this.input.requestLock();
    }
    if (skipped) {
      this.saveProgress();
    }
  }

  private updateActors(dt: number): void {
    const point = this.currentPoint();
    this.characters.update(dt, point.x, point.z, !this.activeVehicle);
    this.aliens.update(dt, point.x, point.z);
    this.robots.update(dt, point.x, point.z, (robot) => {
      const now = performance.now();
      const last = this.robotAlerts.get(robot.def.id) ?? 0;
      if (now - last < 15000) {
        return;
      }
      this.robotAlerts.set(robot.def.id, now);
      this.hud.toast(`Corrupted unit alert · ${robot.def.name} has you in view`, 4600);
    });

    if (this.activeVehicle) {
      this.amani.root.setEnabled(false);
      return;
    }
    const feet = this.player.position;
    this.amani.root.setEnabled(this.thirdPerson);
    this.amani.root.position.set(feet.x, feet.y, feet.z);
    this.amani.root.rotation.y = this.player.yaw;
    animateHumanoid(this.amani, dt, this.player.speed, this.player.sprinting, this.player.grounded);

    if (!this.campaign.flags["crash-seen"] && Math.hypot(feet.x - CRASH_SITE.x, feet.z - CRASH_SITE.z) < 34) {
      this.campaign.flags["crash-seen"] = true;
      this.startCinematic(CRASH_LINES, () => {
        this.hud.toast("Something is waiting at the crash site · press E near Iri", 5200);
        this.saveProgress();
      });
    }
  }

  private updatePresentation(dt: number): void {
    if (!this.cinematicSession) {
      return;
    }
    this.cinematicTime += dt;
    const x = this.player.position.x;
    const z = this.player.position.z;
    const baseY = heightAt(x, z);
    const angle = this.player.yaw + Math.PI + this.cinematicTime * 0.06;
    const radius = 7.5;
    const cameraX = x + Math.sin(angle) * radius;
    const cameraZ = z + Math.cos(angle) * radius;
    this.camera.position.set(cameraX, Math.max(baseY + 2.6, heightAt(cameraX, cameraZ) + 1.6), cameraZ);
    this.camera.setTarget(new Vector3(x, baseY + 1.35, z));
  }

  private refreshCampaignHud(): void {
    const mood = moodOf(this.campaign.mood);
    const difficulty = difficultyOf(this.campaign.difficulty);
    this.hud.setStanding(this.campaign.credits, this.campaign.trust, mood.name);
    this.hud.setCampaignInfo(
      `${mood.name} · ${difficulty.name} difficulty · ${this.campaign.credits} credits · ${this.campaign.trust} trust`,
    );
    this.hud.setDifficultyOptions(
      DIFFICULTIES.map((entry) => ({ id: entry.id, label: entry.name })),
      this.campaign.difficulty,
      false,
    );
  }

  private applyMoodPalette(): void {
    const mood = moodOf(this.campaign.mood);
    this.moodTint = Color3.FromHexString(mood.tint);
    this.moodTintStrength = mood.tintStrength;
    this.moodFogScale = mood.fogScale;
    this.moodExposure = mood.exposure;
  }

  private saveProgress(): void {
    if (!this.started) {
      return;
    }
    const point = this.currentPoint();
    const data: SaveData = {
      version: 1,
      savedAt: new Date().toISOString(),
      campaign: this.campaign,
      world: {
        hour: this.hour,
        x: point.x,
        z: point.z,
        yaw: this.activeVehicle ? this.activeVehicle.yaw : this.player.yaw,
        discovered: Array.from(this.discovered),
        driving: this.activeVehicle?.id ?? null,
      },
      mission: this.missions.serialize(),
    };
    saveGame(data);
  }

  private resume(): void {
    this.paused = false;
    this.hud.showPause(false);
    this.input.requestLock();
  }

  private handleLockChange(locked: boolean): void {
    if (!this.started || this.campaignSetup.isOpen || this.boardOpen) {
      return;
    }
    if (locked) {
      this.paused = false;
      this.hud.showPause(false);
      return;
    }
    if (!this.mapOpen) {
      this.paused = true;
      this.refreshCampaignHud();
      this.hud.showPause(true);
      this.hud.setPauseNote("Esc releases the mouse. Click RESUME to continue.");
    }
  }

  private handleActionKey(code: string): void {
    if (this.campaignSetup.isOpen) {
      if (code === "Escape") {
        this.closeCampaignSetup();
      }
      return;
    }
    if (this.dialogueSession) {
      if (code === "KeyE" || code === "Space" || code === "Enter") {
        this.advanceDialogue();
      } else if (this.dialogueSession.phase === "choices" && code.startsWith("Digit")) {
        const index = Number(code.slice(5)) - 1;
        if (index >= 0) {
          this.chooseDialogue(index);
        }
      } else if (code === "Escape") {
        this.closeDialogue();
      }
      return;
    }
    if (this.cinematicSession) {
      if (code === "KeyE" || code === "Space" || code === "Enter") {
        this.advanceCinematic();
      } else if (code === "Escape" && this.cinematicSession.skippable) {
        this.endCinematic(true);
      }
      return;
    }
    if (!this.started) {
      return;
    }
    if (code === "KeyV" && !this.mapOpen && !this.boardOpen && !this.paused) {
      this.toggleCamera();
      return;
    }
    if (code === "KeyJ") {
      if (this.boardOpen) {
        this.closeBoard();
      } else {
        this.openBoard();
      }
      return;
    }
    if (this.boardOpen) {
      if (code === "Escape") {
        this.closeBoard();
      }
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
    if (this.mapOpen || this.boardOpen || this.campaignSetup.isOpen) {
      return;
    }
    this.mapOpen = true;
    this.hud.showPrompt(null);
    this.hud.showPause(false);
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
    this.updateActors(dt);

    if (this.activeVehicle) {
      const vehicle = this.activeVehicle;
      vehicle.update(dt, this.input, this.world.colliders);
      vehicle.applyChaseCamera(this.camera, dt);
      this.hud.setSpeed(vehicle.speed * 3.6, vehicle.name);
      if (this.input.consumePress("KeyE")) {
        this.exitVehicle();
      }
    } else {
      this.player.update(dt, this.input, this.world.colliders);
      this.player.applyCamera(this.camera, dt, this.thirdPerson);
      this.hud.setSpeed(null);
      const point = this.player.position;
      const missionPrompt = this.missions.promptAt(point.x, point.z);
      if (missionPrompt) {
        if (missionPrompt.kind === "interact" && this.input.consumePress("KeyE")) {
          this.handleInteract();
        }
      } else {
        const npc = this.characters.nearest(point.x, point.z, 3.6);
        const alien = this.aliens.nearest(point.x, point.z, 4.2);
        if (this.input.consumePress("KeyE")) {
          if (npc || alien) {
            this.handleInteract();
          } else {
            const nearest = this.vehicles.nearest(point, 7);
            if (nearest) {
              this.enterVehicle(nearest);
            }
          }
        }
      }
    }

    if (this.dialogueSession || this.cinematicSession) {
      return;
    }

    const point = this.currentPoint();
    this.missions.update({
      x: point.x,
      z: point.z,
      driving: this.activeVehicle !== null,
      holding: this.input.isDown("KeyE"),
      dt,
    });

    if (this.activeVehicle) {
      this.hud.showPrompt(`Exit ${this.activeVehicle.name}`);
    } else {
      const prompt = this.missions.promptAt(point.x, point.z);
      if (prompt) {
        this.hud.showPrompt(
          prompt.kind === "hold"
            ? `Hold E · ${prompt.label} · ${Math.round(prompt.progress * 100)}%`
            : prompt.label,
        );
      } else {
        const npc = this.characters.nearest(point.x, point.z, 3.6);
        const alien = this.aliens.nearest(point.x, point.z, 4.2);
        if (npc) {
          this.hud.showPrompt(`Talk to ${npc.def.name}`);
        } else if (alien) {
          this.hud.showPrompt(`Speak with ${alien.name}`);
        } else {
          const nearest = this.vehicles.nearest(this.player.position, 7);
          this.hud.showPrompt(nearest ? `Drive ${nearest.name}` : null);
        }
      }
    }

    this.updateEnvironment();
    this.gps.update(dt, { x: point.x, z: point.z });
    this.updateDiscovery(point.x, point.z);
    this.updateCompass(point.x, point.z);
    this.updateObjective();
    this.hud.setMission(this.missions.track());
    this.hud.setStanding(this.campaign.credits, this.campaign.trust, moodOf(this.campaign.mood).name);
    this.minimap.draw(this.buildMapState());

    this.saveAccumulator += dt;
    if (this.saveAccumulator >= 10) {
      this.saveAccumulator = 0;
      this.saveProgress();
    }
  }

  private enterVehicle(vehicle: Vehicle): void {
    vehicle.occupied = true;
    this.activeVehicle = vehicle;
    vehicle.speed = 0;
    vehicle.applyChaseCamera(this.camera, 0, true);
    this.hud.toast(`${vehicle.name} engaged · WASD to drive · E to exit`);
    this.hud.setSpeed(0, vehicle.name);
    if (!this.missions.activeMission) {
      this.hud.setObjective("Drive the basin. J opens the mission board and sets GPS routes.");
    }
    this.hasEnteredVehicle = true;
    this.hud.showPrompt(`Exit ${vehicle.name}`);
    this.saveProgress();
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
    this.player.applyCamera(this.camera, 0.016, this.thirdPerson);
    this.amani.root.setEnabled(this.thirdPerson);
    this.hud.setSpeed(null);
    this.hud.showPrompt(null);
    if (!this.missions.activeMission) {
      this.hud.setObjective("Explore on foot. E enters nearby vehicles, J opens the mission board.");
    }
    this.hud.toast(`${vehicle.name} parked`);
    this.saveProgress();
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
    if (this.missions.activeMission) {
      return;
    }
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
    sky.copyFrom(Color3.Lerp(sky, this.moodTint, this.moodTintStrength));
    this.scene.clearColor = new Color4(sky.r, sky.g, sky.b, 1);
    this.scene.fogColor.copyFrom(sky);
    this.scene.fogDensity = lerp(0.0021, 0.0015, daylight) * this.moodFogScale;
    this.scene.imageProcessingConfiguration.exposure = this.moodExposure;

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
          boardOpen: this.boardOpen,
          campaignSetupOpen: this.campaignSetup.isOpen,
          driving: this.activeVehicle?.name ?? null,
          drivingId: this.activeVehicle?.id ?? null,
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
          mood: this.campaign.mood,
          difficulty: this.campaign.difficulty,
          credits: this.campaign.credits,
          trust: this.campaign.trust,
          completed: { ...this.campaign.completed },
          failed: { ...this.campaign.failed },
          activeMission: this.missions.activeMission?.id ?? null,
          objectiveIndex: this.missions.activeObjectiveIndex,
          missionTimer: this.missions.timer,
          savePresent: readSave() !== null,
          flags: { ...this.campaign.flags },
          cameraMode: this.thirdPerson ? "third" : "first",
          thirdPersonBody: this.amani.root.isEnabled(),
          dialogueOpen: this.dialogueSession !== null,
          cinematicOpen: this.cinematicSession !== null,
          frames: this.frameCount,
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
          this.player.applyCamera(this.camera, 0.016, this.thirdPerson);
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
      campaign: () => ({
        mood: this.campaign.mood,
        difficulty: this.campaign.difficulty,
        credits: this.campaign.credits,
        trust: this.campaign.trust,
        completed: { ...this.campaign.completed },
        failed: { ...this.campaign.failed },
        flags: { ...this.campaign.flags },
        briefingSeen: this.campaign.briefingSeen,
        activeMission: this.missions.activeMission?.id ?? null,
      }),
      missions: () =>
        this.missions.views(this.campaign.mood).map((view) => ({
          id: view.def.id,
          title: view.def.title,
          status: view.status,
          completions: view.completions,
          failures: view.failures,
          lockedBy: view.lockedBy?.id ?? null,
        })),
      newCampaign: (mood, difficulty) => {
        if (
          !MOODS.some((entry) => entry.id === mood) ||
          !DIFFICULTIES.some((entry) => entry.id === difficulty)
        ) {
          return false;
        }
        this.startCampaign(mood as MoodId, difficulty as DifficultyId);
        return true;
      },
      activateMission: (id) => this.activateMission(id),
      mission: () => {
        const def = this.missions.activeMission;
        if (!def) {
          return null;
        }
        return {
          id: def.id,
          title: def.title,
          objectiveIndex: this.missions.activeObjectiveIndex,
          objective: def.objectives[this.missions.activeObjectiveIndex].label,
          timer: this.missions.timer,
          cargo: this.missions.activeCargo(),
          track: this.missions.track(),
        };
      },
      interact: () => {
        const point = this.currentPoint();
        return this.missions.interact(point.x, point.z);
      },
      expireMission: () => {
        const active = this.missions.serialize();
        if (!active) {
          return false;
        }
        return this.missions.restore({ ...active, timer: 0.1 });
      },
      save: () => {
        this.saveProgress();
        return readSave() !== null;
      },
      load: () => {
        this.continueFromSave();
        return readSave() !== null;
      },
      clearSave: () => {
        clearSave();
        this.hud.setContinueVisible(false);
      },
      openBoard: () => this.openBoard(),
      closeBoard: () => this.closeBoard(),
      cameraMode: () => (this.thirdPerson ? "third" : "first"),
      setCameraMode: (mode) => {
        this.thirdPerson = mode !== "first";
        this.amani.root.setEnabled(this.thirdPerson && this.activeVehicle === null);
        if (this.activeVehicle) {
          this.activeVehicle.applyChaseCamera(this.camera, 0, true);
        } else {
          this.player.applyCamera(this.camera, 0.016, this.thirdPerson);
        }
      },
      characters: () =>
        this.characters.placed.map((entry) => ({
          id: entry.def.id,
          name: entry.def.name,
          role: entry.def.role,
          x: entry.def.x,
          z: entry.def.z,
          labelVisible: entry.rig.label?.isEnabled() ?? false,
        })),
      robots: () =>
        this.robots.placed.map((robot) => ({
          id: robot.def.id,
          name: robot.def.name,
          kind: robot.def.kind,
          x: robot.x,
          z: robot.z,
          state: robot.state,
          detect: robot.def.detect,
          hover: robot.def.hover ?? 0,
        })),
      aliens: () => ({
        iri: { ...this.aliens.iri },
        crash: { ...CRASH_SITE },
      }),
      flags: () => ({ ...this.campaign.flags }),
      setFlag: (name, value) => {
        if (value) {
          this.campaign.flags[name] = true;
        } else {
          delete this.campaign.flags[name];
        }
      },
      openDialogue: (id) => {
        if (!DIALOGUES[id]) {
          return false;
        }
        this.openDialogue(id);
        return true;
      },
      dialogue: () => {
        const session = this.dialogueSession;
        if (!session) {
          return null;
        }
        return {
          speaker: session.def.speaker,
          phase: session.phase,
          nodeIndex: session.nodeIndex,
          nodeCount: session.def.nodes.length,
          text: session.def.nodes[Math.min(session.nodeIndex, session.def.nodes.length - 1)],
          choices:
            session.phase === "choices"
              ? this.availableChoices(session.def).map((choice) => choice.label)
              : [],
        };
      },
      dialogueAdvance: () => this.advanceDialogue(),
      dialogueChoose: (index) => this.chooseDialogue(index),
      cinematic: () => {
        const session = this.cinematicSession;
        if (!session) {
          return null;
        }
        const line = session.lines[Math.min(session.index, session.lines.length - 1)];
        return {
          index: session.index,
          total: session.lines.length,
          speaker: line.speaker,
          text: line.text,
        };
      },
      skipCinematic: () => this.endCinematic(true),
      playIntro: () => this.playIntro(),
    };
    (window as unknown as { __farmbot: TestApi }).__farmbot = api;
    (window as unknown as { __farmbotScene: Scene }).__farmbotScene = this.scene;
  }
}
