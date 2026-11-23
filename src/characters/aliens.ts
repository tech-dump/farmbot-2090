import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { heightAt } from "../world/landscape";
import { characterMaterial } from "./humanoid";
import { dampAngle } from "./characters";

export const CRASH_SITE = { x: 432, z: 268 };

export interface AlienTalkTarget {
  id: string;
  name: string;
  x: number;
  z: number;
}

interface Hoverer {
  node: TransformNode;
  baseY: number;
  bobSpeed: number;
  bobAmount: number;
  spin: number;
  phase: number;
  orbitRadius: number;
  orbitSpeed: number;
  centerX: number;
  centerZ: number;
}

export class Veyari {
  readonly casters: Mesh[] = [];
  readonly iri: AlienTalkTarget;
  private readonly hoverers: Hoverer[] = [];
  private readonly halo: TransformNode;
  private readonly iriRoot: TransformNode;
  private time = 0;

  constructor(scene: Scene) {
    const glow = characterMaterial(scene, "#7ff0e2", { emissive: "#63e8da", unlit: true });
    const glowSoft = characterMaterial(scene, "#2f7f7c", { emissive: "#2a8f88" });
    const robe = characterMaterial(scene, "#14343b", { emissive: "#0a2026" });
    const robeLight = characterMaterial(scene, "#1d4a52", { emissive: "#103238" });
    const skin = characterMaterial(scene, "#9fd9cd");
    const shell = characterMaterial(scene, "#26333a", { emissive: "#0c1418" });
    const shellLight = characterMaterial(scene, "#3b5058");
    const wreck = characterMaterial(scene, "#2b3038");
    const wreckDark = characterMaterial(scene, "#1a1e24");
    const crack = characterMaterial(scene, "#8ff5ff", { emissive: "#6fe6f2", unlit: true });

    const register = (mesh: Mesh): Mesh => {
      this.casters.push(mesh);
      return mesh;
    };

    const ground = heightAt(CRASH_SITE.x, CRASH_SITE.z);

    // Wreck: a tilted hull, a broken ring and scattered debris.
    const scar = MeshBuilder.CreateCylinder("crash-scar", { diameter: 26, height: 0.12, tessellation: 20 }, scene);
    scar.position.set(CRASH_SITE.x, ground + 0.06, CRASH_SITE.z);
    scar.material = characterMaterial(scene, "#231d19");
    scar.receiveShadows = false;
    scar.isPickable = false;

    const hull = MeshBuilder.CreateBox("veyari-hull", { width: 11, height: 2.6, depth: 6.4 }, scene);
    hull.position.set(CRASH_SITE.x + 5, ground + 1.5, CRASH_SITE.z + 6);
    hull.rotation.set(0.14, 0.6, 0.32);
    hull.material = wreck;
    hull.receiveShadows = true;
    register(hull);
    for (let strip = 0; strip < 4; strip += 1) {
      const seam = MeshBuilder.CreateBox(`hull-seam-${strip}`, { width: 8, height: 0.08, depth: 0.12 }, scene);
      seam.parent = hull;
      seam.position.set(0, -0.9 + strip * 0.55, 3.22);
      seam.material = crack;
      seam.isPickable = false;
    }

    const ring = MeshBuilder.CreateTorus("veyari-ring", { diameter: 9, thickness: 0.28, tessellation: 28 }, scene);
    ring.position.set(CRASH_SITE.x - 5, ground + 2.4, CRASH_SITE.z + 2);
    ring.rotation.set(1.05, 0.3, 0.2);
    ring.material = shellLight;
    register(ring);

    for (const [dx, dz, size] of [
      [-9, 9, 1.6],
      [12, -4, 1.2],
      [-2, -9, 2.1],
      [8, 12, 0.9],
    ] as const) {
      const debris = MeshBuilder.CreateBox("veyari-debris", { width: size, height: size * 0.4, depth: size * 0.8 }, scene);
      debris.position.set(CRASH_SITE.x + dx, ground + size * 0.2, CRASH_SITE.z + dz);
      debris.rotation.y = dx * 0.7;
      debris.material = wreckDark;
      debris.receiveShadows = true;
      register(debris);
    }

    const beacon = MeshBuilder.CreateCylinder("crash-beacon", { diameterTop: 0.08, diameterBottom: 0.3, height: 7, tessellation: 8 }, scene);
    beacon.position.set(CRASH_SITE.x - 10, ground + 3.5, CRASH_SITE.z - 2);
    beacon.material = wreckDark;
    const beaconTip = MeshBuilder.CreateSphere("crash-beacon-tip", { diameter: 0.5, segments: 8 }, scene);
    beaconTip.position.set(CRASH_SITE.x - 10, ground + 7.1, CRASH_SITE.z - 2);
    beaconTip.material = glow;
    beaconTip.isPickable = false;

    // Iri: tall, robed, haloed diplomat.
    const iriRoot = new TransformNode("iri-root", scene);
    this.iriRoot = iriRoot;
    const iriX = CRASH_SITE.x - 9;
    const iriZ = CRASH_SITE.z - 10;
    iriRoot.position.set(iriX, heightAt(iriX, iriZ), iriZ);
    iriRoot.rotation.y = Math.atan2(CRASH_SITE.x - iriX, CRASH_SITE.z - iriZ);
    const iriBody = new TransformNode("iri-body", scene);
    iriBody.parent = iriRoot;

    const robeMesh = MeshBuilder.CreateCylinder(
      "iri-robe",
      { diameterTop: 0.42, diameterBottom: 1.2, height: 1.85, tessellation: 12 },
      scene,
    );
    robeMesh.parent = iriBody;
    robeMesh.position.y = 0.95;
    robeMesh.material = robe;
    robeMesh.receiveShadows = true;
    register(robeMesh);

    const mantle = MeshBuilder.CreateCylinder(
      "iri-mantle",
      { diameterTop: 0.5, diameterBottom: 1.0, height: 0.55, tessellation: 12 },
      scene,
    );
    mantle.parent = iriBody;
    mantle.position.y = 1.95;
    mantle.material = robeLight;
    register(mantle);

    const core = MeshBuilder.CreateSphere("iri-core", { diameter: 0.22, segments: 8 }, scene);
    core.parent = iriBody;
    core.position.set(0, 1.55, 0.42);
    core.material = glow;
    core.isPickable = false;

    const iriHead = MeshBuilder.CreateSphere("iri-head", { diameter: 0.36, segments: 10 }, scene);
    iriHead.parent = iriBody;
    iriHead.position.y = 2.32;
    iriHead.scaling.set(0.82, 1.5, 0.88);
    iriHead.material = skin;
    register(iriHead);

    for (const side of [-1, 1]) {
      const eye = MeshBuilder.CreateSphere("iri-eye", { diameter: 0.075, segments: 6 }, scene);
      eye.parent = iriBody;
      eye.position.set(side * 0.09, 2.38, 0.15);
      eye.material = glow;
      eye.isPickable = false;
      const ridge = MeshBuilder.CreateBox("iri-ridge", { width: 0.05, height: 0.3, depth: 0.1 }, scene);
      ridge.parent = iriBody;
      ridge.position.set(side * 0.19, 2.55, -0.02);
      ridge.rotation.z = side * -0.4;
      ridge.material = robeLight;
      register(ridge);

      const arm = MeshBuilder.CreateCylinder("iri-arm", { diameterTop: 0.06, diameterBottom: 0.1, height: 0.9, tessellation: 6 }, scene);
      arm.parent = iriBody;
      arm.position.set(side * 0.42, 1.72, 0.04);
      arm.rotation.z = side * 0.42;
      arm.rotation.x = -0.15;
      arm.material = skin;
      register(arm);
      for (let finger = 0; finger < 3; finger += 1) {
        const claw = MeshBuilder.CreateCylinder("iri-claw", { diameterTop: 0.015, diameterBottom: 0.04, height: 0.26, tessellation: 4 }, scene);
        claw.parent = iriBody;
        claw.position.set(side * (0.62 + finger * 0.035), 1.18, 0.16 + finger * 0.05);
        claw.rotation.z = side * 0.5;
        claw.rotation.x = 0.35;
        claw.material = skin;
        claw.isPickable = false;
      }
    }

    this.halo = new TransformNode("iri-halo-root", scene);
    this.halo.parent = iriBody;
    this.halo.position.y = 2.62;
    const haloRing = MeshBuilder.CreateTorus("iri-halo", { diameter: 0.95, thickness: 0.035, tessellation: 30 }, scene);
    haloRing.parent = this.halo;
    haloRing.rotation.x = 0.5;
    haloRing.material = glow;
    haloRing.isPickable = false;

    const baseRing = MeshBuilder.CreateTorus("iri-base", { diameter: 1.35, thickness: 0.05, tessellation: 26 }, scene);
    baseRing.parent = iriBody;
    baseRing.position.y = 0.1;
    baseRing.rotation.x = Math.PI / 2;
    baseRing.material = glowSoft;
    baseRing.isPickable = false;

    const iriHover: Hoverer = {
      node: iriRoot,
      baseY: heightAt(iriX, iriZ),
      bobSpeed: 0.8,
      bobAmount: 0.07,
      spin: 0,
      phase: 0,
      orbitRadius: 0,
      orbitSpeed: 0,
      centerX: iriX,
      centerZ: iriZ,
    };
    this.hoverers.push(iriHover);
    this.iri = { id: "iri", name: "Iri", x: iriX, z: iriZ };

    // Two scouts drift in slow orbits around the wreck.
    for (const [radius, speed, phase, height] of [
      [11, 0.22, 0, 2.4],
      [16, -0.16, 2.4, 3.2],
    ] as const) {
      const scout = new TransformNode("scout-root", scene);
      const orb = MeshBuilder.CreateSphere("scout-core", { diameter: 0.42, segments: 8 }, scene);
      orb.parent = scout;
      orb.material = glowSoft;
      orb.isPickable = false;
      register(orb);
      const shellRing = MeshBuilder.CreateTorus("scout-ring", { diameter: 0.85, thickness: 0.05, tessellation: 20 }, scene);
      shellRing.parent = scout;
      shellRing.rotation.x = 1.2;
      shellRing.material = shellLight;
      shellRing.isPickable = false;
      const eye = MeshBuilder.CreateSphere("scout-eye", { diameter: 0.12, segments: 6 }, scene);
      eye.parent = scout;
      eye.position.z = 0.24;
      eye.material = glow;
      eye.isPickable = false;
      for (let tendril = 0; tendril < 3; tendril += 1) {
        const angle = (tendril / 3) * Math.PI * 2;
        const leg = MeshBuilder.CreateCylinder("scout-tendril", { diameterTop: 0.02, diameterBottom: 0.05, height: 0.6, tessellation: 4 }, scene);
        leg.parent = scout;
        leg.position.set(Math.cos(angle) * 0.24, -0.3, Math.sin(angle) * 0.24);
        leg.rotation.set(Math.sin(angle) * 0.4, 0, Math.cos(angle) * 0.4);
        leg.material = shellLight;
        leg.isPickable = false;
      }
      this.hoverers.push({
        node: scout,
        baseY: ground + height,
        bobSpeed: 1.1,
        bobAmount: 0.18,
        spin: 0.8,
        phase,
        orbitRadius: radius,
        orbitSpeed: speed,
        centerX: CRASH_SITE.x,
        centerZ: CRASH_SITE.z,
      });
    }

    // A guardian stands watch over the wreck.
    const guardian = new TransformNode("guardian-root", scene);
    const gx = CRASH_SITE.x + 12;
    const gz = CRASH_SITE.z + 10;
    guardian.position.set(gx, heightAt(gx, gz), gz);
    guardian.rotation.y = -2.2;
    const guardBody = new TransformNode("guardian-body", scene);
    guardBody.parent = guardian;
    const shellMesh = MeshBuilder.CreateSphere("guardian-shell", { diameter: 1.9, segments: 12 }, scene);
    shellMesh.parent = guardBody;
    shellMesh.position.y = 1.25;
    shellMesh.scaling.set(1.05, 0.78, 1.18);
    shellMesh.material = shell;
    shellMesh.receiveShadows = true;
    register(shellMesh);
    for (const side of [-1, 1]) {
      const plate = MeshBuilder.CreateBox("guardian-plate", { width: 0.5, height: 0.9, depth: 1.1 }, scene);
      plate.parent = guardBody;
      plate.position.set(side * 0.72, 1.5, -0.2);
      plate.rotation.z = side * 0.35;
      plate.material = shellLight;
      register(plate);
    }
    const guardHead = MeshBuilder.CreateSphere("guardian-head", { diameter: 0.55, segments: 8 }, scene);
    guardHead.parent = guardBody;
    guardHead.position.set(0, 1.55, 0.82);
    guardHead.scaling.set(1.2, 0.8, 1);
    guardHead.material = shellLight;
    register(guardHead);
    const guardCore = MeshBuilder.CreateSphere("guardian-core", { diameter: 0.3, segments: 8 }, scene);
    guardCore.parent = guardBody;
    guardCore.position.set(0, 1.15, 0.95);
    guardCore.material = glow;
    guardCore.isPickable = false;
    for (let legIndex = 0; legIndex < 4; legIndex += 1) {
      const angle = Math.PI / 4 + (legIndex * Math.PI) / 2;
      const leg = MeshBuilder.CreateCylinder("guardian-leg", { diameterTop: 0.09, diameterBottom: 0.16, height: 1.1, tessellation: 6 }, scene);
      leg.parent = guardBody;
      leg.position.set(Math.cos(angle) * 0.85, 0.55, Math.sin(angle) * 0.85);
      leg.rotation.set(Math.sin(angle) * 0.45, 0, Math.cos(angle) * 0.45);
      leg.material = shell;
      register(leg);
    }
    for (let spike = 0; spike < 3; spike += 1) {
      const thorn = MeshBuilder.CreateCylinder("guardian-spike", { diameterTop: 0.01, diameterBottom: 0.22, height: 0.8, tessellation: 5 }, scene);
      thorn.parent = guardBody;
      thorn.position.set((spike - 1) * 0.45, 2.05, -0.5);
      thorn.rotation.x = -0.4;
      thorn.material = shellLight;
      register(thorn);
    }
  }

  update(dt: number, playerX?: number, playerZ?: number): void {
    this.time += dt;
    if (playerX !== undefined && playerZ !== undefined) {
      const distance = Math.hypot(this.iri.x - playerX, this.iri.z - playerZ);
      if (distance < 12) {
        const target = Math.atan2(playerX - this.iri.x, playerZ - this.iri.z);
        this.iriRoot.rotation.y = dampAngle(this.iriRoot.rotation.y, target, dt);
      }
    }
    for (const hoverer of this.hoverers) {
      const bob = Math.sin(this.time * hoverer.bobSpeed + hoverer.phase) * hoverer.bobAmount;
      if (hoverer.orbitRadius > 0) {
        const angle = hoverer.phase + this.time * hoverer.orbitSpeed;
        hoverer.node.position.x = hoverer.centerX + Math.cos(angle) * hoverer.orbitRadius;
        hoverer.node.position.z = hoverer.centerZ + Math.sin(angle) * hoverer.orbitRadius;
        hoverer.node.rotation.y = -angle + Math.PI / 2;
      }
      hoverer.node.position.y = hoverer.baseY + bob;
      if (hoverer.spin > 0) {
        hoverer.node.rotation.y += dt * hoverer.spin;
      }
    }
    this.halo.rotation.y += dt * 0.6;
    this.halo.rotation.z = Math.sin(this.time * 0.7) * 0.1;
  }

  nearest(x: number, z: number, range: number): AlienTalkTarget | null {
    return Math.hypot(this.iri.x - x, this.iri.z - z) <= range ? this.iri : null;
  }
}
