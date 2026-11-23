import { Color3 } from "@babylonjs/core/Maths/math.color";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { clamp } from "../core/math";

export interface HumanoidOptions {
  skin: string;
  shirt: string;
  trousers: string;
  shoes: string;
  hair?: string;
  accent?: string;
  hat?: "cap" | "wide" | "wrap" | "none";
  scarf?: boolean;
  backpack?: boolean;
  scale?: number;
}

export interface HumanoidRig {
  root: TransformNode;
  body: TransformNode;
  head: TransformNode;
  torso: Mesh;
  armPivots: [TransformNode, TransformNode];
  elbowPivots: [TransformNode, TransformNode];
  hipPivots: [TransformNode, TransformNode];
  kneePivots: [TransformNode, TransformNode];
  casters: Mesh[];
  label: Mesh | null;
  phase: number;
  time: number;
  baseBodyY: number;
  scale: number;
}

const materialCache = new WeakMap<Scene, Map<string, StandardMaterial>>();

export function characterMaterial(
  scene: Scene,
  hex: string,
  options: { emissive?: string; emissiveIntensity?: number; alpha?: number; unlit?: boolean } = {},
): StandardMaterial {
  const key = `${hex}|${options.emissive ?? ""}|${options.emissiveIntensity ?? ""}|${options.alpha ?? ""}|${options.unlit ? 1 : 0}`;
  let cache = materialCache.get(scene);
  if (!cache) {
    cache = new Map();
    materialCache.set(scene, cache);
  }
  const existing = cache.get(key);
  if (existing) {
    return existing;
  }
  const material = new StandardMaterial(`char-mat-${cache.size}`, scene);
  material.diffuseColor = Color3.FromHexString(hex);
  material.specularColor = new Color3(0.08, 0.08, 0.08);
  if (options.emissive) {
    material.emissiveColor = Color3.FromHexString(options.emissive);
    if (options.emissiveIntensity !== undefined) {
      material.emissiveColor.scaleInPlace(options.emissiveIntensity);
    }
  }
  if (options.alpha !== undefined) {
    material.alpha = options.alpha;
  }
  if (options.unlit) {
    material.disableLighting = true;
    material.diffuseColor = Color3.Black();
  }
  cache.set(key, material);
  return material;
}

export function createNameplate(scene: Scene, text: string, width = 2.6, y = 2.2): Mesh {
  const texture = new DynamicTexture(`label-${text}`, { width: 512, height: 128 }, scene, false);
  texture.hasAlpha = true;
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;
  context.clearRect(0, 0, 512, 128);
  context.font = "600 44px 'Segoe UI', Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = 10;
  context.strokeStyle = "rgba(8, 10, 8, 0.85)";
  context.strokeText(text.toUpperCase(), 256, 66);
  context.fillStyle = "#f4edda";
  context.fillText(text.toUpperCase(), 256, 66);
  texture.update();

  const material = new StandardMaterial(`label-mat-${text}`, scene);
  material.diffuseTexture = texture;
  material.opacityTexture = texture;
  material.emissiveColor = Color3.FromHexString("#ffffff");
  material.diffuseColor = Color3.Black();
  material.disableLighting = true;
  material.backFaceCulling = false;
  material.fogEnabled = false;

  const plate = MeshBuilder.CreatePlane(`label-${text}`, { width, height: width / 4 }, scene);
  plate.material = material;
  plate.billboardMode = Mesh.BILLBOARDMODE_ALL;
  plate.isPickable = false;
  plate.position.y = y;
  return plate;
}

function part(
  scene: Scene,
  name: string,
  parent: TransformNode,
  size: [number, number, number],
  position: [number, number, number],
  material: StandardMaterial,
): Mesh {
  const mesh = MeshBuilder.CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, scene);
  mesh.parent = parent;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.material = material;
  mesh.receiveShadows = true;
  return mesh;
}

/**
 * Builds a stylised human with a real body, articulated limbs and clothing.
 * Local forward is +Z so a root rotation of atan2(dx, dz) faces movement,
 * matching the vehicles.
 */
export function createHumanoid(scene: Scene, options: HumanoidOptions, labelText?: string): HumanoidRig {
  const scale = options.scale ?? 1;
  const skin = characterMaterial(scene, options.skin);
  const shirt = characterMaterial(scene, options.shirt);
  const trousers = characterMaterial(scene, options.trousers);
  const shoes = characterMaterial(scene, options.shoes);
  const hair = characterMaterial(scene, options.hair ?? "#191512");
  const accent = characterMaterial(scene, options.accent ?? options.shirt);
  const dark = characterMaterial(scene, "#1a1d1b");
  const eye = characterMaterial(scene, "#101010", { unlit: true });

  const root = new TransformNode(`human-${labelText ?? "body"}-root`, scene);
  root.scaling.setAll(scale);
  const body = new TransformNode(`human-${labelText ?? "body"}-body`, scene);
  body.parent = root;

  const casters: Mesh[] = [];
  const register = (mesh: Mesh): Mesh => {
    casters.push(mesh);
    return mesh;
  };

  register(part(scene, "hips", body, [0.44, 0.28, 0.27], [0, 0.98, 0], trousers));
  const torso = register(part(scene, "torso", body, [0.5, 0.56, 0.3], [0, 1.33, 0], shirt));
  register(part(scene, "chest-strip", body, [0.1, 0.5, 0.02], [0, 1.34, 0.16], accent));
  register(part(scene, "neck", body, [0.13, 0.14, 0.13], [0, 1.66, 0], skin));
  register(part(scene, "belt", body, [0.46, 0.07, 0.29], [0, 1.07, 0], dark));
  if (options.backpack) {
    register(part(scene, "pack", body, [0.34, 0.4, 0.18], [0, 1.36, -0.23], accent));
    register(part(scene, "pack-strap", body, [0.06, 0.5, 0.02], [0.16, 1.36, 0.155], dark));
    register(part(scene, "pack-strap", body, [0.06, 0.5, 0.02], [-0.16, 1.36, 0.155], dark));
  }

  const head = new TransformNode("head", scene);
  head.parent = body;
  head.position.set(0, 1.8, 0);
  const skull = MeshBuilder.CreateSphere("head-skull", { diameter: 0.34, segments: 10 }, scene);
  skull.parent = head;
  skull.scaling.set(0.92, 1.08, 0.94);
  skull.material = skin;
  skull.receiveShadows = true;
  register(skull);
  register(part(scene, "hair-cap", head, [0.34, 0.14, 0.35], [0, 0.13, -0.015], hair));
  register(part(scene, "hair-back", head, [0.28, 0.24, 0.1], [0, 0.02, -0.16], hair));
  register(part(scene, "eye", head, [0.05, 0.045, 0.02], [0.075, 0.03, 0.16], eye));
  register(part(scene, "eye", head, [0.05, 0.045, 0.02], [-0.075, 0.03, 0.16], eye));
  register(part(scene, "brow", head, [0.26, 0.03, 0.03], [0, 0.09, 0.15], hair));
  if (options.hat === "cap") {
    register(part(scene, "cap", head, [0.36, 0.12, 0.36], [0, 0.21, 0], accent));
    register(part(scene, "cap-brim", head, [0.3, 0.03, 0.2], [0, 0.16, 0.22], accent));
  } else if (options.hat === "wide") {
    register(
      (() => {
        const brim = MeshBuilder.CreateCylinder("hat-brim", { diameter: 0.72, height: 0.04, tessellation: 14 }, scene);
        brim.parent = head;
        brim.position.set(0, 0.2, 0);
        brim.material = accent;
        brim.receiveShadows = true;
        return brim;
      })(),
    );
    register(
      (() => {
        const crown = MeshBuilder.CreateCylinder("hat-crown", { diameterTop: 0.3, diameterBottom: 0.38, height: 0.18, tessellation: 14 }, scene);
        crown.parent = head;
        crown.position.set(0, 0.3, 0);
        crown.material = accent;
        crown.receiveShadows = true;
        return crown;
      })(),
    );
  } else if (options.hat === "wrap") {
    register(part(scene, "head-wrap", head, [0.4, 0.16, 0.4], [0, 0.19, 0], accent));
    register(part(scene, "wrap-tail", head, [0.1, 0.3, 0.1], [0.18, 0.02, -0.12], accent));
  }
  if (options.scarf) {
    register(part(scene, "scarf", body, [0.4, 0.1, 0.34], [0, 1.62, 0], accent));
    register(part(scene, "scarf-tail", body, [0.12, 0.34, 0.05], [0.1, 1.46, 0.2], accent));
  }

  const armPivots: [TransformNode, TransformNode] = [
    new TransformNode("arm-L", scene),
    new TransformNode("arm-R", scene),
  ];
  const elbowPivots: [TransformNode, TransformNode] = [
    new TransformNode("elbow-L", scene),
    new TransformNode("elbow-R", scene),
  ];
  for (let side = 0; side < 2; side += 1) {
    const sign = side === 0 ? -1 : 1;
    const shoulder = armPivots[side];
    shoulder.parent = body;
    shoulder.position.set(sign * 0.32, 1.55, 0);
    register(part(scene, "shoulder", shoulder, [0.19, 0.16, 0.22], [0, -0.02, 0], shirt));
    register(part(scene, "upper-arm", shoulder, [0.13, 0.34, 0.15], [0, -0.21, 0], shirt));
    const elbow = elbowPivots[side];
    elbow.parent = shoulder;
    elbow.position.set(0, -0.4, 0);
    register(part(scene, "forearm", elbow, [0.11, 0.32, 0.13], [0, -0.16, 0], skin));
    register(part(scene, "hand", elbow, [0.12, 0.14, 0.14], [0, -0.37, 0.01], skin));
  }

  const hipPivots: [TransformNode, TransformNode] = [
    new TransformNode("hip-L", scene),
    new TransformNode("hip-R", scene),
  ];
  const kneePivots: [TransformNode, TransformNode] = [
    new TransformNode("knee-L", scene),
    new TransformNode("knee-R", scene),
  ];
  for (let side = 0; side < 2; side += 1) {
    const sign = side === 0 ? -1 : 1;
    const hip = hipPivots[side];
    hip.parent = body;
    hip.position.set(sign * 0.13, 0.88, 0);
    register(part(scene, "thigh", hip, [0.17, 0.4, 0.19], [0, -0.2, 0], trousers));
    const knee = kneePivots[side];
    knee.parent = hip;
    knee.position.set(0, -0.43, 0);
    register(part(scene, "shin", knee, [0.14, 0.38, 0.16], [0, -0.19, 0], trousers));
    register(part(scene, "boot", knee, [0.17, 0.14, 0.28], [0, -0.44, 0.05], shoes));
  }

  let label: Mesh | null = null;
  if (labelText) {
    label = createNameplate(scene, labelText);
    label.parent = root;
  }

  return {
    root,
    body,
    head,
    torso,
    armPivots,
    elbowPivots,
    hipPivots,
    kneePivots,
    casters,
    label,
    phase: 0,
    time: 0,
    baseBodyY: 0,
    scale,
  };
}

/**
 * Pose driver: walk and run cycles from ground speed, idle breathing,
 * and an airborne pose. Runs every simulated frame, not every render.
 */
export function animateHumanoid(rig: HumanoidRig, dt: number, speed: number, sprinting: boolean, grounded: boolean): void {
  rig.time += dt;
  const motion = clamp(speed / 4.2, 0, 1.4);
  if (grounded && motion > 0.05) {
    rig.phase += dt * (sprinting ? 11.5 : 7.6) * Math.max(0.4, motion);
    const swing = Math.sin(rig.phase) * (sprinting ? 0.8 : 0.58) * Math.min(1, motion);
    const lift = Math.abs(Math.cos(rig.phase));
    rig.hipPivots[0].rotation.x = swing;
    rig.hipPivots[1].rotation.x = -swing;
    rig.kneePivots[0].rotation.x = Math.max(0, -Math.sin(rig.phase)) * 0.85;
    rig.kneePivots[1].rotation.x = Math.max(0, Math.sin(rig.phase)) * 0.85;
    rig.armPivots[0].rotation.x = -swing * 0.75;
    rig.armPivots[1].rotation.x = swing * 0.75;
    rig.elbowPivots[0].rotation.x = -0.15 - Math.max(0, Math.sin(rig.phase)) * 0.35;
    rig.elbowPivots[1].rotation.x = -0.15 - Math.max(0, -Math.sin(rig.phase)) * 0.35;
    rig.armPivots[0].rotation.z = -0.06;
    rig.armPivots[1].rotation.z = 0.06;
    rig.body.position.y = rig.baseBodyY + lift * 0.045 * Math.min(1, motion);
    rig.body.rotation.z = Math.sin(rig.phase) * 0.02;
  } else if (!grounded) {
    rig.hipPivots[0].rotation.x = 0.32;
    rig.hipPivots[1].rotation.x = -0.18;
    rig.kneePivots[0].rotation.x = 0.7;
    rig.kneePivots[1].rotation.x = 0.45;
    rig.armPivots[0].rotation.x = -0.5;
    rig.armPivots[1].rotation.x = -0.4;
    rig.armPivots[0].rotation.z = -0.25;
    rig.armPivots[1].rotation.z = 0.25;
    rig.body.position.y = rig.baseBodyY + 0.04;
  } else {
    const breath = Math.sin(rig.time * 1.7) * 0.5 + 0.5;
    const sway = Math.sin(rig.time * 0.9) * 0.035;
    rig.hipPivots[0].rotation.x *= 0.85;
    rig.hipPivots[1].rotation.x *= 0.85;
    rig.kneePivots[0].rotation.x *= 0.8;
    rig.kneePivots[1].rotation.x *= 0.8;
    rig.armPivots[0].rotation.x = Math.sin(rig.time * 1.2) * 0.03;
    rig.armPivots[1].rotation.x = -Math.sin(rig.time * 1.2 + 0.5) * 0.03;
    rig.armPivots[0].rotation.z = -0.05 - sway;
    rig.armPivots[1].rotation.z = 0.05 + sway;
    rig.elbowPivots[0].rotation.x = -0.12;
    rig.elbowPivots[1].rotation.x = -0.12;
    rig.head.rotation.y = Math.sin(rig.time * 0.5) * 0.12;
    rig.body.position.y = rig.baseBodyY + breath * 0.012;
    rig.body.rotation.z *= 0.9;
  }
}
