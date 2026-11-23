import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { heightAt } from "../world/landscape";
import { characterMaterial } from "./humanoid";
import { dampAngle } from "./characters";

export type RobotKind = "security" | "harvester" | "scout" | "heavy";
export type RobotState = "patrol" | "alert";

export interface RobotDef {
  id: string;
  name: string;
  kind: RobotKind;
  points: Array<[number, number]>;
  speed: number;
  detect: number;
  hover?: number;
}

export interface PlacedRobot {
  def: RobotDef;
  root: TransformNode;
  x: number;
  z: number;
  state: RobotState;
  yaw: number;
}

const ROBOT_DEFS: RobotDef[] = [
  {
    id: "sec-solar",
    name: "TN-SEC 04",
    kind: "security",
    points: [
      [236, -250],
      [252, -264],
      [268, -252],
    ],
    speed: 1.6,
    detect: 18,
  },
  {
    id: "harvester-field",
    name: "ROOT THRESHER",
    kind: "harvester",
    points: [
      [-205, 205],
      [-188, 196],
    ],
    speed: 1.1,
    detect: 20,
  },
  {
    id: "skyeye-research",
    name: "SKY-EYE 2",
    kind: "scout",
    points: [
      [238, 104],
      [252, 96],
      [246, 88],
    ],
    speed: 2.3,
    detect: 24,
    hover: 6,
  },
  {
    id: "sec-water",
    name: "TN-SEC 11",
    kind: "security",
    points: [
      [-352, -206],
      [-368, -214],
    ],
    speed: 1.5,
    detect: 18,
  },
  {
    id: "hauler-market",
    name: "ROOT HAULER",
    kind: "heavy",
    points: [
      [104, 44],
      [96, 34],
    ],
    speed: 0.9,
    detect: 22,
  },
  {
    id: "scout-highway",
    name: "SKY-EYE 5",
    kind: "scout",
    points: [
      [40, -160],
      [28, -172],
    ],
    speed: 2.1,
    detect: 24,
    hover: 5,
  },
];

interface RobotRuntime {
  placed: PlacedRobot;
  visor: StandardMaterial;
  targetIndex: number;
  wait: number;
  bobPhase: number;
}

function box(
  scene: Scene,
  name: string,
  parent: TransformNode,
  size: [number, number, number],
  position: [number, number, number],
  material: StandardMaterial,
  casters: Mesh[],
): Mesh {
  const mesh = MeshBuilder.CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, scene);
  mesh.parent = parent;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.material = material;
  mesh.receiveShadows = true;
  casters.push(mesh);
  return mesh;
}

export class Corrupted {
  readonly placed: PlacedRobot[] = [];
  readonly casters: Mesh[] = [];
  private readonly runtimes: RobotRuntime[] = [];

  constructor(scene: Scene) {
    const hull = characterMaterial(scene, "#3a3f45");
    const hullLight = characterMaterial(scene, "#575f66");
    const track = characterMaterial(scene, "#26292d");
    const rust = characterMaterial(scene, "#6f452b");
    const glass = characterMaterial(scene, "#20282b", { emissive: "#122f33" });
    const glow = characterMaterial(scene, "#fff0c8", { unlit: true });
    let visorIndex = 0;

    for (const def of ROBOT_DEFS) {
      const root = new TransformNode(`robot-${def.id}`, scene);
      const [startX, startZ] = def.points[0];
      root.position.set(startX, heightAt(startX, startZ), startZ);
      const visor = new StandardMaterial(`robot-visor-${visorIndex += 1}`, scene);
      visor.diffuseColor = Color3.Black();
      visor.specularColor = Color3.Black();
      visor.emissiveColor = Color3.FromHexString("#ff4a3a");
      const localCasters: Mesh[] = [];
      const part = (
        name: string,
        size: [number, number, number],
        position: [number, number, number],
        material: StandardMaterial,
      ): Mesh => box(scene, name, root, size, position, material, localCasters);

      if (def.kind === "security") {
        for (const side of [-1, 1]) {
          part("sec-leg", [0.24, 1.0, 0.32], [side * 0.3, 0.5, 0], track);
          part("sec-foot", [0.34, 0.16, 0.5], [side * 0.3, 0.08, 0.05], hull);
        }
        part("sec-torso", [0.92, 0.92, 0.62], [0, 1.4, 0], hull);
        part("sec-chest", [0.6, 0.5, 0.1], [0, 1.45, 0.34], hullLight);
        for (const side of [-1, 1]) {
          part("sec-shoulder", [0.3, 0.3, 0.42], [side * 0.6, 1.75, 0], hullLight);
          part("sec-arm", [0.16, 0.7, 0.2], [side * 0.64, 1.32, 0.05], hull);
        }
        part("sec-head", [0.48, 0.34, 0.4], [0, 2.02, 0.02], hullLight);
        const visorMesh = part("sec-visor", [0.4, 0.08, 0.03], [0, 2.04, 0.23], visor);
        visorMesh.isPickable = false;
        part("sec-antenna", [0.04, 0.4, 0.04], [0.16, 2.36, -0.06], track);
      } else if (def.kind === "harvester") {
        for (const [wx, wz] of [
          [-0.92, 0.85],
          [0.92, 0.85],
          [-0.92, -0.85],
          [0.92, -0.85],
        ] as const) {
          const wheel = MeshBuilder.CreateCylinder("harvester-wheel", { diameter: 1.0, height: 0.36, tessellation: 12 }, scene);
          wheel.parent = root;
          wheel.position.set(wx, 0.5, wz);
          wheel.rotation.z = Math.PI / 2;
          wheel.material = track;
          wheel.receiveShadows = true;
          localCasters.push(wheel);
        }
        part("harvester-body", [1.7, 0.85, 2.4], [0, 1.05, 0], hull);
        part("harvester-cab", [0.95, 0.85, 0.95], [0, 1.85, -0.55], hullLight);
        part("harvester-glass", [0.8, 0.5, 0.06], [0, 1.9, -0.06], glass);
        const drum = MeshBuilder.CreateCylinder("harvester-drum", { diameter: 0.95, height: 2.0, tessellation: 14 }, scene);
        drum.parent = root;
        drum.position.set(0, 0.65, 1.35);
        drum.rotation.z = Math.PI / 2;
        drum.material = rust;
        drum.receiveShadows = true;
        localCasters.push(drum);
        const visorMesh = part("harvester-visor", [0.6, 0.08, 0.03], [0, 1.98, -0.02], visor);
        visorMesh.isPickable = false;
        part("harvester-beacon", [0.12, 0.12, 0.12], [0, 2.4, -0.55], glow);
      } else if (def.kind === "scout") {
        const core = MeshBuilder.CreateSphere("scout-body", { diameter: 0.75, segments: 10 }, scene);
        core.parent = root;
        core.position.y = 0.2;
        core.material = hull;
        core.receiveShadows = true;
        localCasters.push(core);
        for (let arm = 0; arm < 4; arm += 1) {
          const angle = (arm / 4) * Math.PI * 2 + Math.PI / 4;
          part("scout-arm", [0.9, 0.06, 0.1], [Math.cos(angle) * 0.52, 0.2, Math.sin(angle) * 0.52], hullLight);
          const rotor = MeshBuilder.CreateCylinder("scout-rotor", { diameter: 0.5, height: 0.03, tessellation: 10 }, scene);
          rotor.parent = root;
          rotor.position.set(Math.cos(angle) * 0.95, 0.26, Math.sin(angle) * 0.95);
          rotor.material = track;
          rotor.isPickable = false;
        }
        const eye = MeshBuilder.CreateSphere("scout-eye", { diameter: 0.2, segments: 8 }, scene);
        eye.parent = root;
        eye.position.set(0, 0.18, 0.38);
        eye.material = visor;
        eye.isPickable = false;
      } else {
        for (const side of [-1, 1]) {
          part("heavy-tread", [0.7, 0.7, 3.1], [side * 1.05, 0.36, 0], track);
        }
        part("heavy-hull", [2.1, 1.3, 2.7], [0, 1.25, 0], hull);
        part("heavy-deck", [1.8, 0.25, 2.3], [0, 2.0, -0.1], hullLight);
        part("heavy-cab", [0.95, 0.7, 0.85], [0, 2.3, -0.55], hullLight);
        const visorMesh = part("heavy-visor", [0.7, 0.1, 0.04], [0, 2.34, -0.11], visor);
        visorMesh.isPickable = false;
        const crane = part("heavy-crane", [0.24, 0.24, 1.8], [0, 2.5, 0.85], rust);
        crane.rotation.x = -0.5;
        part("heavy-light", [0.16, 0.16, 0.16], [0, 2.66, 0.2], glow);
      }

      this.casters.push(...localCasters);
      const placed: PlacedRobot = {
        def,
        root,
        x: startX,
        z: startZ,
        state: "patrol",
        yaw: 0,
      };
      this.placed.push(placed);
      this.runtimes.push({ placed, visor, targetIndex: 1 % def.points.length, wait: 0, bobPhase: Math.random() * 6 });
    }
  }

  reset(): void {
    for (const runtime of this.runtimes) {
      const [x, z] = runtime.placed.def.points[0];
      runtime.placed.x = x;
      runtime.placed.z = z;
      runtime.placed.state = "patrol";
      runtime.placed.root.position.set(x, heightAt(x, z), z);
      runtime.placed.root.rotation.y = 0;
      runtime.placed.yaw = 0;
      runtime.targetIndex = 1 % runtime.placed.def.points.length;
      runtime.wait = 0;
      runtime.visor.emissiveColor = Color3.FromHexString("#ff4a3a");
    }
  }

  update(dt: number, playerX: number, playerZ: number, onAlert: (robot: PlacedRobot) => void): void {
    for (const runtime of this.runtimes) {
      const placed = runtime.placed;
      const def = placed.def;
      const distance = Math.hypot(placed.x - playerX, placed.z - playerZ);

      if (placed.state === "patrol" && distance <= def.detect) {
        placed.state = "alert";
        onAlert(placed);
      } else if (placed.state === "alert" && distance > def.detect * 1.8) {
        placed.state = "patrol";
      }

      if (placed.state === "alert") {
        const targetYaw = Math.atan2(playerX - placed.x, playerZ - placed.z);
        placed.yaw = dampAngle(placed.yaw, targetYaw, dt);
        const pulse = 0.9 + Math.sin(performance.now() * 0.012) * 0.45;
        runtime.visor.emissiveColor = new Color3(pulse, pulse * 0.18, pulse * 0.14);
      } else {
        runtime.visor.emissiveColor = Color3.FromHexString("#ff4a3a");
        const [targetX, targetZ] = def.points[runtime.targetIndex];
        const dx = targetX - placed.x;
        const dz = targetZ - placed.z;
        const targetDistance = Math.hypot(dx, dz);
        if (targetDistance < 1.2) {
          runtime.wait += dt;
          if (runtime.wait > 1.6) {
            runtime.wait = 0;
            runtime.targetIndex = (runtime.targetIndex + 1) % def.points.length;
          }
        } else {
          const step = Math.min(targetDistance, def.speed * dt);
          placed.x += (dx / targetDistance) * step;
          placed.z += (dz / targetDistance) * step;
          placed.yaw = dampAngle(placed.yaw, Math.atan2(dx, dz), dt * 2.2);
        }
      }

      const hover = def.hover ?? 0;
      const bob = hover > 0 ? Math.sin(performance.now() * 0.002 + runtime.bobPhase) * 0.25 : 0;
      placed.root.position.set(placed.x, heightAt(placed.x, placed.z) + hover + bob, placed.z);
      placed.root.rotation.y = placed.yaw;
    }
  }

  nearest(x: number, z: number, range: number): PlacedRobot | null {
    let best: PlacedRobot | null = null;
    let bestDistance = range;
    for (const placed of this.placed) {
      const distance = Math.hypot(placed.x - x, placed.z - z);
      if (distance <= bestDistance) {
        bestDistance = distance;
        best = placed;
      }
    }
    return best;
  }
}
