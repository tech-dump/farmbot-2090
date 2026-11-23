import { Color3 } from "@babylonjs/core/Maths/math.color";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Input } from "../core/input";
import { WORLD_LIMIT } from "../core/constants";
import { approach, clamp, damp } from "../core/math";
import { heightAt } from "../world/landscape";
import { resolveCircle, type Collider } from "../world/collision";

export type VehicleKind = "tractor" | "pickup";

interface VehicleSpec {
  id: string;
  name: string;
  kind: VehicleKind;
  x: number;
  z: number;
  yaw: number;
  maxSpeed: number;
  acceleration: number;
  braking: number;
  steering: number;
}

const VEHICLE_DEFS: readonly VehicleSpec[] = [
  {
    id: "tractor",
    name: "Kijani Tractor",
    kind: "tractor",
    x: -254,
    z: 176,
    yaw: 1.5,
    maxSpeed: 13,
    acceleration: 5,
    braking: 11,
    steering: 0.85,
  },
  {
    id: "pickup",
    name: "Riftway Pickup",
    kind: "pickup",
    x: -52,
    z: 72,
    yaw: -1.4,
    maxSpeed: 26,
    acceleration: 9,
    braking: 22,
    steering: 1.15,
  },
];

export class Vehicle {
  readonly id: string;
  readonly name: string;
  readonly kind: VehicleKind;
  x: number;
  z: number;
  yaw: number;
  speed = 0;
  occupied = false;
  readonly root: TransformNode;
  readonly casters: Mesh[] = [];

  private readonly scene: Scene;
  private readonly radius: number;
  private readonly maxSpeed: number;
  private readonly acceleration: number;
  private readonly braking: number;
  private readonly steering: number;
  private steerAngle = 0;
  private pitch = 0;
  private roll = 0;
  private groundY = 0;
  private readonly cameraPosition = new Vector3();

  constructor(scene: Scene, spec: VehicleSpec) {
    this.scene = scene;
    this.id = spec.id;
    this.name = spec.name;
    this.kind = spec.kind;
    this.x = spec.x;
    this.z = spec.z;
    this.yaw = spec.yaw;
    this.maxSpeed = spec.maxSpeed;
    this.acceleration = spec.acceleration;
    this.braking = spec.braking;
    this.steering = spec.steering;
    this.radius = spec.kind === "tractor" ? 1.8 : 1.6;
    this.root = new TransformNode(`vehicle-${spec.id}`, scene);
    this.groundY = heightAt(this.x, this.z);
    this.root.position.set(this.x, this.groundY, this.z);
    this.root.rotation.y = this.yaw;
    this.cameraPosition.set(
      this.x - Math.sin(this.yaw) * 11,
      this.groundY + 7,
      this.z - Math.cos(this.yaw) * 11,
    );

    if (spec.kind === "tractor") {
      this.buildTractor();
    } else {
      this.buildPickup();
    }
  }

  private material(name: string, hex: string, specular = 0.18, emissive?: string): StandardMaterial {
    const mat = new StandardMaterial(`vehicle-${this.id}-${name}`, this.scene);
    mat.diffuseColor = Color3.FromHexString(hex);
    mat.specularColor = new Color3(specular, specular, specular);
    if (emissive) {
      mat.emissiveColor = Color3.FromHexString(emissive);
    }
    return mat;
  }

  private addBox(
    parent: TransformNode,
    name: string,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    mat: StandardMaterial,
  ): Mesh {
    const mesh = MeshBuilder.CreateBox(`vehicle-${this.id}-${name}`, { width, height, depth }, this.scene);
    mesh.parent = parent;
    mesh.position.set(x, y, z);
    mesh.material = mat;
    mesh.receiveShadows = true;
    this.casters.push(mesh);
    return mesh;
  }

  private addCylinder(
    parent: TransformNode,
    name: string,
    height: number,
    diameter: number,
    x: number,
    y: number,
    z: number,
    mat: StandardMaterial,
  ): Mesh {
    const mesh = MeshBuilder.CreateCylinder(
      `vehicle-${this.id}-${name}`,
      { height, diameter, tessellation: 12 },
      this.scene,
    );
    mesh.parent = parent;
    mesh.position.set(x, y, z);
    mesh.rotation.z = Math.PI / 2;
    mesh.material = mat;
    mesh.receiveShadows = true;
    this.casters.push(mesh);
    return mesh;
  }

  private addWheel(
    parent: TransformNode,
    name: string,
    x: number,
    y: number,
    z: number,
    diameter: number,
    width: number,
    mat: StandardMaterial,
    steerable: boolean,
  ): void {
    const pivot = new TransformNode(`vehicle-${this.id}-${name}-pivot`, this.scene);
    pivot.parent = parent;
    pivot.position.set(x, y, z);
    const wheel = this.addCylinder(pivot, name, width, diameter, 0, 0, 0, mat);
    wheel.rotation.z = Math.PI / 2;
    if (steerable) {
      this.frontPivots.push(pivot);
    }
  }

  private readonly frontPivots: TransformNode[] = [];

  private buildTractor(): void {
    const green = this.material("green", "#4f7a36", 0.25);
    const dark = this.material("dark", "#2f3330", 0.15);
    const rubber = this.material("rubber", "#1c1d1b", 0.05);
    const metal = this.material("metal", "#8a918c", 0.35);
    const glass = this.material("glass", "#263f47", 0.6);
    const lamp = this.material("lamp", "#f5d68a", 0.1, "#6b5220");

    this.addWheel(this.root, "wheel-rear-l", -1.3, 0.92, -1.15, 1.9, 0.7, rubber, false);
    this.addWheel(this.root, "wheel-rear-r", 1.3, 0.92, -1.15, 1.9, 0.7, rubber, false);
    this.addWheel(this.root, "wheel-front-l", -1.12, 0.6, 1.35, 1.2, 0.48, rubber, true);
    this.addWheel(this.root, "wheel-front-r", 1.12, 0.6, 1.35, 1.2, 0.48, rubber, true);

    this.addBox(this.root, "chassis", 2.1, 0.7, 4.1, 0, 1.05, 0, green);
    this.addBox(this.root, "hood", 1.9, 0.9, 1.7, 0, 1.62, 1.2, green);
    this.addBox(this.root, "grille", 1.5, 0.45, 0.12, 0, 1.45, 2.06, metal);
    this.addBox(this.root, "cabin", 1.8, 1.35, 1.7, 0, 2.35, -0.7, glass);
    this.addBox(this.root, "cabin-pillar-l", 0.12, 1.4, 1.7, -0.86, 2.35, -0.7, dark);
    this.addBox(this.root, "cabin-pillar-r", 0.12, 1.4, 1.7, 0.86, 2.35, -0.7, dark);
    this.addBox(this.root, "roof", 2.1, 0.16, 2, 0, 3.08, -0.7, dark);
    this.addBox(this.root, "seat", 0.7, 0.5, 0.7, 0, 1.9, -0.55, dark);
    const exhaust = MeshBuilder.CreateCylinder(
      "vehicle-tractor-exhaust",
      { height: 1.5, diameter: 0.16, tessellation: 8 },
      this.scene,
    );
    exhaust.parent = this.root;
    exhaust.position.set(0.95, 2.6, 1.4);
    exhaust.material = metal;
    this.casters.push(exhaust);

    for (const side of [-1, 1]) {
      this.addBox(this.root, "headlamp", 0.28, 0.24, 0.1, side * 0.62, 1.72, 2.07, lamp);
    }
  }

  private buildPickup(): void {
    const paint = this.material("paint", "#b9a274", 0.35);
    const dark = this.material("dark", "#33383a", 0.15);
    const rubber = this.material("rubber", "#1b1d1c", 0.05);
    const glass = this.material("glass", "#2a444c", 0.6);
    const metal = this.material("metal", "#8f9691", 0.4);
    const lamp = this.material("lamp", "#f5d68a", 0.1, "#6b5220");

    for (const [x, z] of [
      [-1.15, 1.55],
      [1.15, 1.55],
      [-1.15, -1.55],
      [1.15, -1.55],
    ] as const) {
      this.addWheel(this.root, "wheel", x, 0.7, z, 1.35, 0.5, rubber, z > 0);
    }

    this.addBox(this.root, "chassis", 2.2, 0.55, 5, 0, 0.95, 0, paint);
    this.addBox(this.root, "hood", 2.05, 0.65, 1.5, 0, 1.45, 1.65, paint);
    this.addBox(this.root, "cab", 2.05, 1.15, 2, 0, 1.95, 0.2, paint);
    this.addBox(this.root, "windshield", 1.8, 0.7, 0.1, 0, 2.2, 1.22, glass);
    this.addBox(this.root, "rear-glass", 1.8, 0.6, 0.1, 0, 2.18, -0.82, glass);
    this.addBox(this.root, "bed-floor", 2.05, 0.2, 2.3, 0, 1.35, -1.55, dark);
    this.addBox(this.root, "bed-side-l", 0.12, 0.55, 2.3, -1.02, 1.6, -1.55, paint);
    this.addBox(this.root, "bed-side-r", 0.12, 0.55, 2.3, 1.02, 1.6, -1.55, paint);
    this.addBox(this.root, "bed-tail", 2.05, 0.55, 0.12, 0, 1.6, -2.72, paint);
    this.addBox(this.root, "bumper", 2.2, 0.3, 0.24, 0, 0.8, 2.62, metal);
    for (const side of [-1, 1]) {
      this.addBox(this.root, "headlamp", 0.3, 0.22, 0.1, side * 0.7, 1.5, 2.42, lamp);
    }
  }

  update(dt: number, input: Input, colliders: readonly Collider[]): void {
    const throttle = (input.isDown("KeyW") ? 1 : 0) - (input.isDown("KeyS") ? 1 : 0);
    const steerInput = (input.isDown("KeyA") ? 1 : 0) - (input.isDown("KeyD") ? 1 : 0);
    const handbrake = input.isDown("Space");

    let target = 0;
    if (throttle > 0) {
      target = this.maxSpeed;
    } else if (throttle < 0) {
      target = this.speed > 0.6 ? 0 : -this.maxSpeed * 0.32;
    }
    const rate = throttle < 0 && this.speed > 0.6 ? this.braking : throttle !== 0 ? this.acceleration : 3.4;
    this.speed = approach(this.speed, target, rate * dt);
    if (handbrake) {
      this.speed = approach(this.speed, 0, 20 * dt);
    }

    this.steerAngle = approach(this.steerAngle, steerInput, 3.4 * dt);
    const grip = clamp(Math.abs(this.speed) / 5, 0, 1);
    const direction = this.speed >= 0 ? 1 : -1;
    this.yaw += this.steerAngle * this.steering * dt * grip * direction;

    let nextX = this.x + Math.sin(this.yaw) * this.speed * dt;
    let nextZ = this.z + Math.cos(this.yaw) * this.speed * dt;
    nextX = clamp(nextX, -WORLD_LIMIT, WORLD_LIMIT);
    nextZ = clamp(nextZ, -WORLD_LIMIT, WORLD_LIMIT);

    const resolved = resolveCircle(nextX, nextZ, this.radius, colliders);
    if (resolved.hit) {
      this.speed *= 0.25;
    }
    this.x = resolved.x;
    this.z = resolved.z;

    this.groundY = heightAt(this.x, this.z);
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);
    const front = heightAt(this.x + sinYaw * 2.1, this.z + cosYaw * 2.1);
    const back = heightAt(this.x - sinYaw * 2.1, this.z - cosYaw * 2.1);
    const right = heightAt(this.x + cosYaw * 1.2, this.z - sinYaw * 1.2);
    const left = heightAt(this.x - cosYaw * 1.2, this.z + sinYaw * 1.2);
    const targetPitch = -Math.atan2(front - back, 4.2) * 0.7;
    const targetRoll = Math.atan2(right - left, 2.4) * 0.7;
    this.pitch = damp(this.pitch, targetPitch, 8, dt);
    this.roll = damp(this.roll, targetRoll, 8, dt);

    this.root.position.set(this.x, this.groundY + 0.05, this.z);
    this.root.rotationQuaternion = Quaternion.RotationYawPitchRoll(this.yaw, 0, 0)
      .multiply(Quaternion.RotationAxis(new Vector3(1, 0, 0), this.pitch))
      .multiply(Quaternion.RotationAxis(new Vector3(0, 0, 1), this.roll));

    for (const pivot of this.frontPivots) {
      pivot.rotation.y = this.steerAngle * 0.45;
    }
  }

  applyChaseCamera(camera: FreeCamera, dt: number, snap = false): void {
    const forwardX = Math.sin(this.yaw);
    const forwardZ = Math.cos(this.yaw);
    const focus = new Vector3(this.x, this.groundY + 2.2, this.z);
    const desired = new Vector3(
      focus.x - forwardX * 11,
      focus.y + 4.6,
      focus.z - forwardZ * 11,
    );
    const groundAtCamera = heightAt(desired.x, desired.z) + 2.4;
    if (desired.y < groundAtCamera) {
      desired.y = groundAtCamera;
    }

    if (snap) {
      this.cameraPosition.copyFrom(desired);
    } else {
      const amount = 1 - Math.exp(-5.5 * dt);
      this.cameraPosition.copyFrom(Vector3.Lerp(this.cameraPosition, desired, amount));
    }

    camera.position.copyFrom(this.cameraPosition);
    camera.setTarget(new Vector3(focus.x, focus.y + 0.9, focus.z));
    const targetFov = ((this.kind === "pickup" ? 66 : 70) * Math.PI) / 180;
    camera.fov = damp(camera.fov, targetFov, 6, dt);
  }

  exitPoint(): { x: number; z: number; yaw: number } {
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);
    return {
      x: this.x + rightX * 3.2,
      z: this.z + rightZ * 3.2,
      yaw: this.yaw,
    };
  }
}

export class VehicleManager {
  readonly vehicles: Vehicle[];
  readonly casters: Mesh[] = [];

  constructor(scene: Scene) {
    this.vehicles = VEHICLE_DEFS.map((spec) => new Vehicle(scene, spec));
    for (const vehicle of this.vehicles) {
      this.casters.push(...vehicle.casters);
    }
  }

  nearest(position: { x: number; z: number }, maxDistance: number): Vehicle | null {
    let best: Vehicle | null = null;
    let bestDistance = maxDistance;
    for (const vehicle of this.vehicles) {
      if (vehicle.occupied) {
        continue;
      }
      const distance = Math.hypot(vehicle.x - position.x, vehicle.z - position.z);
      if (distance < bestDistance) {
        best = vehicle;
        bestDistance = distance;
      }
    }
    return best;
  }
}
