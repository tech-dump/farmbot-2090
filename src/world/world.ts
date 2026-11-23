import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { Scene } from "@babylonjs/core/scene";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import { LOCATIONS } from "../nav/locations";
import { WORLD_SIZE } from "../core/constants";
import { heightAt, LAKE_INFO, nearestRoadDistance, terrainColorAt } from "./landscape";
import { ROADS, type RoadPoint } from "./roads";
import { KijaniStructures } from "./structures";
import type { Collider } from "./collision";

interface SampledPoint {
  x: number;
  z: number;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function samplePolyline(points: readonly RoadPoint[], spacing: number): SampledPoint[] {
  const sampled: SampledPoint[] = [{ x: points[0]![0], z: points[0]![1] }];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    const dx = current[0] - previous[0];
    const dz = current[1] - previous[1];
    const length = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.ceil(length / spacing));
    for (let step = 1; step <= steps; step += 1) {
      sampled.push({
        x: previous[0] + (dx * step) / steps,
        z: previous[1] + (dz * step) / steps,
      });
    }
  }
  return sampled;
}

function isBlocked(x: number, z: number, margin: number): boolean {
  if (nearestRoadDistance(x, z) < margin) {
    return true;
  }
  for (const location of LOCATIONS) {
    if (Math.hypot(x - location.x, z - location.z) < location.flatten * 0.52) {
      return true;
    }
  }
  if (Math.hypot(x - LAKE_INFO.x, z - LAKE_INFO.z) < LAKE_INFO.shore) {
    return true;
  }
  const inFarmField = x > -252 && x < -176 && z > 154 && z < 208;
  return inFarmField;
}

export class World {
  readonly colliders: Collider[];
  readonly shadowCasters: Mesh[];
  private readonly structures: KijaniStructures;

  constructor(scene: Scene) {
    this.structures = new KijaniStructures(scene);
    this.structures.buildAll();

    this.buildTerrain(scene);
    this.buildRoads(scene);
    this.buildLake(scene);
    this.buildMountains(scene);
    this.buildVegetation(scene);

    this.colliders = this.structures.colliders;
    this.shadowCasters = this.structures.shadowCasters;
  }

  update(dt: number): void {
    for (const part of this.structures.animated) {
      part.node.rotation.z += part.speed * dt;
    }
  }

  private buildTerrain(scene: Scene): void {
    const subdivisions = 200;
    const ground = MeshBuilder.CreateGround(
      "kijani-terrain",
      { width: WORLD_SIZE, height: WORLD_SIZE, subdivisions, updatable: true },
      scene,
    );

    const positions = ground.getVerticesData(VertexBuffer.PositionKind);
    const indices = ground.getIndices();
    if (!positions || !indices) {
      throw new Error("Terrain geometry is missing position data.");
    }

    const colors = new Float32Array((positions.length / 3) * 4);
    for (let vertex = 0; vertex < positions.length; vertex += 3) {
      const x = positions[vertex]!;
      const z = positions[vertex + 2]!;
      const height = heightAt(x, z);
      positions[vertex + 1] = height;
      const color = terrainColorAt(x, z, height);
      const colorIndex = (vertex / 3) * 4;
      colors[colorIndex] = color.r;
      colors[colorIndex + 1] = color.g;
      colors[colorIndex + 2] = color.b;
      colors[colorIndex + 3] = 1;
    }

    ground.setVerticesData(VertexBuffer.PositionKind, positions, false);
    ground.setVerticesData(VertexBuffer.ColorKind, colors, false, 4);

    const normals = new Float32Array(positions.length);
    VertexData.ComputeNormals(positions, indices, normals);
    ground.setVerticesData(VertexBuffer.NormalKind, normals, false);
    ground.refreshBoundingInfo();

    const material = new StandardMaterial("terrain-material", scene);
    material.diffuseColor = Color3.White();
    material.specularColor = Color3.Black();
    ground.material = material;
    ground.useVertexColors = true;
    ground.receiveShadows = true;
    ground.isPickable = false;
  }

  private buildRoads(scene: Scene): void {
    for (const road of ROADS) {
      const sampled = samplePolyline(road.points, 5);
      this.buildRibbon(
        scene,
        `road-${road.id}`,
        sampled,
        road.width,
        road.surface === "asphalt" ? this.structures.palette.asphalt : this.structures.palette.dirt,
        0.1,
      );
      if (road.surface === "asphalt") {
        this.buildRibbon(scene, `road-line-${road.id}`, sampled, 0.45, this.structures.palette.line, 0.16);
      }
    }
  }

  private buildRibbon(
    scene: Scene,
    name: string,
    sampled: SampledPoint[],
    width: number,
    material: StandardMaterial,
    yOffset: number,
  ): void {
    const left: Vector3[] = [];
    const right: Vector3[] = [];
    for (let index = 0; index < sampled.length; index += 1) {
      const current = sampled[index]!;
      const previous = sampled[Math.max(0, index - 1)]!;
      const next = sampled[Math.min(sampled.length - 1, index + 1)]!;
      const tx = next.x - previous.x;
      const tz = next.z - previous.z;
      const length = Math.max(0.0001, Math.hypot(tx, tz));
      const nx = -tz / length;
      const nz = tx / length;
      const half = width * 0.5;
      const lx = current.x + nx * half;
      const lz = current.z + nz * half;
      const rx = current.x - nx * half;
      const rz = current.z - nz * half;
      left.push(new Vector3(lx, heightAt(lx, lz) + yOffset, lz));
      right.push(new Vector3(rx, heightAt(rx, rz) + yOffset, rz));
    }

    const ribbon = MeshBuilder.CreateRibbon(
      name,
      {
        pathArray: [left, right],
        closeArray: false,
        closePath: false,
        sideOrientation: Mesh.DOUBLESIDE,
        updatable: false,
      },
      scene,
    );
    ribbon.material = material;
    ribbon.receiveShadows = true;
    ribbon.isPickable = false;
  }

  private buildLake(scene: Scene): void {
    const lake = MeshBuilder.CreateDisc(
      "old-waterworks-lake",
      { radius: LAKE_INFO.radius * 0.94, tessellation: 72 },
      scene,
    );
    lake.rotation.x = Math.PI / 2;
    lake.position.set(LAKE_INFO.x, LAKE_INFO.level, LAKE_INFO.z);
    lake.material = this.structures.palette.water;
    lake.receiveShadows = false;
    lake.isPickable = false;
  }

  private buildMountains(scene: Scene): void {
    const rock = new StandardMaterial("mountain-rock", scene);
    rock.diffuseColor = Color3.FromHexString("#5e574c");
    rock.specularColor = Color3.Black();
    const random = mulberry32(0x5eed);
    for (let index = 0; index < 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2 + 0.25;
      const radius = 520 + random() * 45;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const height = 55 + random() * 55;
      const base = heightAt(x, z) - 6;
      const peak = MeshBuilder.CreateCylinder(
        "distant-peak",
        { height, diameterTop: 0, diameterBottom: 150 + random() * 90, tessellation: 5 },
        scene,
      );
      peak.position.set(x, base + height * 0.5, z);
      peak.rotation.y = random() * Math.PI;
      peak.material = rock;
      peak.receiveShadows = false;
      peak.isPickable = false;
    }
  }

  private buildVegetation(scene: Scene): void {
    const random = mulberry32(0xfa4b2090);
    const trunk = MeshBuilder.CreateCylinder(
      "tree-trunk",
      { height: 1, diameterTop: 0.3, diameterBottom: 0.55, tessellation: 5 },
      scene,
    );
    const canopy = MeshBuilder.CreateSphere("tree-canopy", { diameter: 2, segments: 5 }, scene);
    const dryCanopy = MeshBuilder.CreateSphere("tree-canopy-dry", { diameter: 2, segments: 4 }, scene);
    const rockMesh = MeshBuilder.CreatePolyhedron("rock", { type: 2, size: 1 }, scene);
    const shrub = MeshBuilder.CreateSphere("shrub", { diameter: 2, segments: 4 }, scene);
    const cropGreen = MeshBuilder.CreateCylinder(
      "crop-green",
      { height: 1.1, diameterTop: 0, diameterBottom: 0.45, tessellation: 4 },
      scene,
    );
    const cropGold = MeshBuilder.CreateCylinder(
      "crop-gold",
      { height: 1.2, diameterTop: 0, diameterBottom: 0.5, tessellation: 4 },
      scene,
    );

    trunk.material = this.structures.palette.trunk;
    canopy.material = this.structures.palette.leaf;
    dryCanopy.material = this.structures.palette.leafDry;
    rockMesh.material = this.mountainRockMaterial(scene);
    shrub.material = this.structures.palette.leafDry;
    cropGreen.material = this.structures.palette.cropGreen;
    cropGold.material = this.structures.palette.cropGold;

    for (const mesh of [trunk, canopy, dryCanopy, rockMesh, shrub, cropGreen, cropGold]) {
      mesh.receiveShadows = true;
      mesh.isPickable = false;
    }

    const trunkMatrices: number[] = [];
    const canopyMatrices: number[] = [];
    const dryMatrices: number[] = [];
    const trees: Array<{ x: number; z: number; height: number; size: number; yaw: number; dry: boolean }> = [];

    for (let attempt = 0; attempt < 900 && trees.length < 320; attempt += 1) {
      const x = (random() - 0.5) * 1120;
      const z = (random() - 0.5) * 1120;
      if (isBlocked(x, z, 10)) {
        continue;
      }
      const dryChance = Math.hypot(x - 380, z - 220) < 320 ? 0.7 : 0.12;
      trees.push({
        x,
        z,
        height: 3 + random() * 3.4,
        size: 2 + random() * 2.4,
        yaw: random() * Math.PI * 2,
        dry: random() < dryChance,
      });
    }

    for (const tree of trees) {
      const ground = heightAt(tree.x, tree.z);
      const trunkMatrix = Matrix.Compose(
        new Vector3(1, tree.height, 1),
        Quaternion.RotationYawPitchRoll(tree.yaw, 0, 0),
        new Vector3(tree.x, ground + tree.height * 0.5, tree.z),
      );
      trunkMatrix.copyToArray(trunkMatrices, trunkMatrices.length);
      const canopyMatrix = Matrix.Compose(
        new Vector3(tree.size, tree.size * 0.42, tree.size),
        Quaternion.RotationYawPitchRoll(tree.yaw, 0, 0),
        new Vector3(tree.x, ground + tree.height + tree.size * 0.18, tree.z),
      );
      if (tree.dry) {
        canopyMatrix.copyToArray(dryMatrices, dryMatrices.length);
      } else {
        canopyMatrix.copyToArray(canopyMatrices, canopyMatrices.length);
      }
    }

    trunk.thinInstanceSetBuffer("matrix", new Float32Array(trunkMatrices), 16, true);
    canopy.thinInstanceSetBuffer("matrix", new Float32Array(canopyMatrices), 16, true);
    dryCanopy.thinInstanceSetBuffer("matrix", new Float32Array(dryMatrices), 16, true);
    trunk.thinInstanceRefreshBoundingInfo(true);
    canopy.thinInstanceRefreshBoundingInfo(true);
    dryCanopy.thinInstanceRefreshBoundingInfo(true);

    const rockMatrices: number[] = [];
    for (let attempt = 0; attempt < 900 && rockMatrices.length < 340 * 16; attempt += 1) {
      const x = (random() - 0.5) * 1150;
      const z = (random() - 0.5) * 1150;
      if (isBlocked(x, z, 4)) {
        continue;
      }
      const scale = 0.4 + random() * 1.9;
      const matrix = Matrix.Compose(
        new Vector3(scale, scale * (0.5 + random() * 0.5), scale),
        Quaternion.RotationYawPitchRoll(random() * Math.PI * 2, random() * 0.5, 0),
        new Vector3(x, heightAt(x, z) + scale * 0.1, z),
      );
      matrix.copyToArray(rockMatrices, rockMatrices.length);
    }
    rockMesh.thinInstanceSetBuffer("matrix", new Float32Array(rockMatrices), 16, true);
    rockMesh.thinInstanceRefreshBoundingInfo(true);

    const shrubMatrices: number[] = [];
    for (let attempt = 0; attempt < 600 && shrubMatrices.length < 260 * 16; attempt += 1) {
      const x = (random() - 0.5) * 1100;
      const z = (random() - 0.5) * 1100;
      if (isBlocked(x, z, 5)) {
        continue;
      }
      const scale = 0.4 + random() * 0.8;
      const matrix = Matrix.Compose(
        new Vector3(scale, scale * 0.6, scale),
        Quaternion.RotationYawPitchRoll(random() * Math.PI * 2, 0, 0),
        new Vector3(x, heightAt(x, z) + scale * 0.2, z),
      );
      matrix.copyToArray(shrubMatrices, shrubMatrices.length);
    }
    shrub.thinInstanceSetBuffer("matrix", new Float32Array(shrubMatrices), 16, true);
    shrub.thinInstanceRefreshBoundingInfo(true);

    const greenMatrices: number[] = [];
    const goldMatrices: number[] = [];
    for (let row = 0; row < 6; row += 1) {
      const rowZ = 160 + row * 7;
      for (let column = 0; column < 46; column += 1) {
        const x = -248 + column * 1.45;
        const z = rowZ + (random() - 0.5) * 0.8;
        const scale = 0.7 + random() * 0.5;
        const matrix = Matrix.Compose(
          new Vector3(scale, scale, scale),
          Quaternion.RotationYawPitchRoll(random() * 0.4, 0, 0),
          new Vector3(x, heightAt(x, z) + 0.55 * scale, z),
        );
        if (row % 3 === 0) {
          matrix.copyToArray(goldMatrices, goldMatrices.length);
        } else {
          matrix.copyToArray(greenMatrices, greenMatrices.length);
        }
      }
    }
    cropGreen.thinInstanceSetBuffer("matrix", new Float32Array(greenMatrices), 16, true);
    cropGold.thinInstanceSetBuffer("matrix", new Float32Array(goldMatrices), 16, true);
    cropGreen.thinInstanceRefreshBoundingInfo(true);
    cropGold.thinInstanceRefreshBoundingInfo(true);
  }

  private mountainRockMaterial(scene: Scene): StandardMaterial {
    const material = new StandardMaterial("rock-material", scene);
    material.diffuseColor = Color3.FromHexString("#6a6155");
    material.specularColor = Color3.Black();
    return material;
  }
}
