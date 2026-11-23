import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Axis } from "@babylonjs/core/Maths/math.axis";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { heightAt } from "./landscape";
import type { Collider } from "./collision";

export interface AnimatedPart {
  node: TransformNode;
  speed: number;
}

export interface Palette {
  plaster: StandardMaterial;
  plasterWarm: StandardMaterial;
  brick: StandardMaterial;
  roof: StandardMaterial;
  metal: StandardMaterial;
  darkMetal: StandardMaterial;
  glass: StandardMaterial;
  wood: StandardMaterial;
  concrete: StandardMaterial;
  asphalt: StandardMaterial;
  dirt: StandardMaterial;
  line: StandardMaterial;
  soil: StandardMaterial;
  leaf: StandardMaterial;
  leafDry: StandardMaterial;
  trunk: StandardMaterial;
  cropGreen: StandardMaterial;
  cropGold: StandardMaterial;
  water: StandardMaterial;
  solar: StandardMaterial;
  solarFrame: StandardMaterial;
  stripeA: StandardMaterial;
  stripeB: StandardMaterial;
  accent: StandardMaterial;
  window: StandardMaterial;
  towerGlass: StandardMaterial;
  rust: StandardMaterial;
  plainsWood: StandardMaterial;
}

function material(
  scene: Scene,
  name: string,
  hex: string,
  options: { emissive?: string; alpha?: number; specular?: number; backFace?: boolean } = {},
): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = Color3.FromHexString(hex);
  mat.specularColor =
    options.specular === undefined
      ? Color3.Black()
      : new Color3(options.specular, options.specular, options.specular);
  if (options.emissive) {
    mat.emissiveColor = Color3.FromHexString(options.emissive);
  }
  if (options.alpha !== undefined) {
    mat.alpha = options.alpha;
  }
  if (options.backFace) {
    mat.backFaceCulling = false;
  }
  return mat;
}

function createPalette(scene: Scene): Palette {
  const accent = material(scene, "mat-accent", "#101810", { emissive: "#8fd14a", specular: 0 });
  accent.disableLighting = true;
  const windowMat = material(scene, "mat-window", "#1d1a12", { emissive: "#ffc77d", specular: 0 });
  return {
    plaster: material(scene, "mat-plaster", "#c9b795"),
    plasterWarm: material(scene, "mat-plaster-warm", "#d7c3a0"),
    brick: material(scene, "mat-brick", "#965741"),
    roof: material(scene, "mat-roof", "#4c4f47", { specular: 0.08 }),
    metal: material(scene, "mat-metal", "#7f8783", { specular: 0.35 }),
    darkMetal: material(scene, "mat-dark-metal", "#3d4443", { specular: 0.2 }),
    glass: material(scene, "mat-glass", "#2d4c55", { emissive: "#0a1c22", specular: 0.6 }),
    wood: material(scene, "mat-wood", "#77552f"),
    concrete: material(scene, "mat-concrete", "#9c988a"),
    asphalt: material(scene, "mat-asphalt", "#3c3c39", { specular: 0.05 }),
    dirt: material(scene, "mat-dirt", "#7b5f3f"),
    line: material(scene, "mat-line", "#cdbb75", { emissive: "#3b3318" }),
    soil: material(scene, "mat-soil", "#4b3826"),
    leaf: material(scene, "mat-leaf", "#4a6534", { specular: 0 }),
    leafDry: material(scene, "mat-leaf-dry", "#77743d", { specular: 0 }),
    trunk: material(scene, "mat-trunk", "#584631"),
    cropGreen: material(scene, "mat-crop-green", "#6b8c37", { specular: 0 }),
    cropGold: material(scene, "mat-crop-gold", "#c2a24c", { specular: 0 }),
    water: material(scene, "mat-water", "#2f6d7a", { alpha: 0.82, specular: 0.75, backFace: true }),
    solar: material(scene, "mat-solar", "#1a2a33", { specular: 0.55 }),
    solarFrame: material(scene, "mat-solar-frame", "#98a19e", { specular: 0.3 }),
    stripeA: material(scene, "mat-stripe-a", "#c05a3a"),
    stripeB: material(scene, "mat-stripe-b", "#e5dac0"),
    accent,
    window: windowMat,
    towerGlass: material(scene, "mat-tower-glass", "#1b333c", { emissive: "#0a2027", specular: 0.7 }),
    rust: material(scene, "mat-rust", "#8a5535"),
    plainsWood: material(scene, "mat-plains-wood", "#6d5740"),
  };
}

export class KijaniStructures {
  readonly colliders: Collider[] = [];
  readonly shadowCasters: Mesh[] = [];
  readonly animated: AnimatedPart[] = [];
  readonly palette: Palette;

  private readonly scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
    this.palette = createPalette(scene);
  }

  buildAll(): void {
    this.farm();
    this.village();
    this.garage();
    this.market();
    this.researchCentre();
    this.terraNovaHQ();
    this.highway();
    this.waterworks();
    this.solarFarm();
    this.redDustPlains();
  }

  private box(
    name: string,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    yaw: number,
    mat: StandardMaterial,
    options: { pitch?: number; cast?: boolean; receive?: boolean } = {},
  ): Mesh {
    const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, this.scene);
    mesh.position.set(x, y, z);
    if (options.pitch) {
      mesh.rotationQuaternion = Quaternion.RotationAxis(Axis.Y, yaw).multiply(
        Quaternion.RotationAxis(Axis.X, options.pitch),
      );
    } else {
      mesh.rotation.y = yaw;
    }
    mesh.material = mat;
    mesh.receiveShadows = options.receive ?? true;
    if (options.cast ?? true) {
      this.shadowCasters.push(mesh);
    }
    return mesh;
  }

  private cylinder(
    name: string,
    height: number,
    diameterTop: number,
    diameterBottom: number,
    x: number,
    y: number,
    z: number,
    mat: StandardMaterial,
    options: { tessellation?: number; cast?: boolean } = {},
  ): Mesh {
    const mesh = MeshBuilder.CreateCylinder(
      name,
      {
        height,
        diameterTop,
        diameterBottom,
        tessellation: options.tessellation ?? 10,
      },
      this.scene,
    );
    mesh.position.set(x, y, z);
    mesh.material = mat;
    mesh.receiveShadows = true;
    if (options.cast ?? true) {
      this.shadowCasters.push(mesh);
    }
    return mesh;
  }

  private sphere(
    name: string,
    diameter: number,
    x: number,
    y: number,
    z: number,
    mat: StandardMaterial,
    options: { scaleY?: number; cast?: boolean } = {},
  ): Mesh {
    const mesh = MeshBuilder.CreateSphere(name, { diameter, segments: 8 }, this.scene);
    mesh.position.set(x, y, z);
    if (options.scaleY) {
      mesh.scaling.y = options.scaleY;
    }
    mesh.material = mat;
    mesh.receiveShadows = true;
    if (options.cast ?? true) {
      this.shadowCasters.push(mesh);
    }
    return mesh;
  }

  private addCollider(x: number, z: number, width: number, depth: number, yaw: number, label: string): void {
    const c = Math.abs(Math.cos(yaw));
    const s = Math.abs(Math.sin(yaw));
    const ex = (width * 0.5) * c + (depth * 0.5) * s + 0.15;
    const ez = (width * 0.5) * s + (depth * 0.5) * c + 0.15;
    this.colliders.push({
      minX: x - ex,
      maxX: x + ex,
      minZ: z - ez,
      maxZ: z + ez,
      label,
    });
  }

  private local(x: number, z: number, yaw: number, lx: number, lz: number): { x: number; z: number } {
    return {
      x: x + Math.cos(yaw) * lx + Math.sin(yaw) * lz,
      z: z - Math.sin(yaw) * lx + Math.cos(yaw) * lz,
    };
  }

  private gableRoof(
    x: number,
    z: number,
    yaw: number,
    baseY: number,
    width: number,
    depth: number,
    rise: number,
    mat: StandardMaterial,
  ): void {
    const angle = Math.atan2(rise, depth * 0.5);
    const panelLength = Math.hypot(depth * 0.5, rise) + 0.7;
    for (const side of [-1, 1]) {
      const center = this.local(x, z, yaw, 0, side * depth * 0.25);
      this.box(
        "roof-panel",
        width + 1.4,
        0.3,
        panelLength,
        center.x,
        baseY + rise * 0.5,
        center.z,
        yaw,
        mat,
        { pitch: side * angle },
      );
    }
  }

  private house(
    x: number,
    z: number,
    yaw: number,
    width: number,
    depth: number,
    wall: StandardMaterial,
    roofMat: StandardMaterial,
    label: string,
  ): void {
    const ground = heightAt(x, z);
    const height = 3.9;
    this.box("house-walls", width, height, depth, x, ground + height * 0.5, z, yaw, wall);
    this.gableRoof(x, z, yaw, ground + height, width, depth, 2.1, roofMat);
    this.addCollider(x, z, width, depth, yaw, label);

    const door = this.local(x, z, yaw, 0, depth * 0.5 + 0.03);
    this.box("house-door", 1.2, 2.2, 0.14, door.x, ground + 1.1, door.z, yaw, this.palette.darkMetal, {
      cast: false,
    });

    for (const side of [-1, 1]) {
      const windowPos = this.local(x, z, yaw, side * width * 0.3, depth * 0.5 + 0.04);
      this.box("house-window", 1.3, 1.1, 0.12, windowPos.x, ground + 2.3, windowPos.z, yaw, this.palette.window, {
        cast: false,
      });
    }
  }

  private sign(text: string, x: number, z: number, y: number, yaw: number, width = 11): void {
    const canvasWidth = 768;
    const canvasHeight = 240;
    const texture = new DynamicTexture(`sign-${text}`, { width: canvasWidth, height: canvasHeight }, this.scene, true);
    const ctx = texture.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = "#0f1710";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.strokeStyle = "#a8dd63";
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, canvasWidth - 20, canvasHeight - 20);
    ctx.fillStyle = "#e2f3cb";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";
    ctx.font = "bold 58px Arial, sans-serif";
    for (const word of words) {
      const candidate = line.length === 0 ? word : `${line} ${word}`;
      if (ctx.measureText(candidate).width > canvasWidth - 70 && line.length > 0) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line.length > 0) {
      lines.push(line);
    }
    lines.slice(0, 2).forEach((textLine, index) => {
      const offset = (index - (Math.min(lines.length, 2) - 1) / 2) * 74;
      ctx.fillText(textLine, canvasWidth / 2, canvasHeight / 2 + offset);
    });
    texture.update();

    const mat = new StandardMaterial(`sign-mat-${text}`, this.scene);
    mat.diffuseTexture = texture;
    mat.emissiveTexture = texture;
    mat.emissiveColor = new Color3(0.55, 0.6, 0.5);
    mat.disableLighting = true;

    const size = { width, height: width * (canvasHeight / canvasWidth) };
    const normalX = Math.sin(yaw);
    const normalZ = Math.cos(yaw);
    for (const facing of [0, Math.PI]) {
      const plane = MeshBuilder.CreatePlane(`sign-plane-${text}`, size, this.scene);
      const offset = facing === 0 ? 0 : 0.04;
      plane.position.set(x - normalX * offset, y, z - normalZ * offset);
      plane.rotation.y = yaw + facing;
      plane.material = mat;
    }
  }

  private locationSign(text: string, x: number, z: number, yaw: number, width = 11): void {
    const ground = heightAt(x, z);
    for (const side of [-1, 1]) {
      const post = this.local(x, z, yaw, side * width * 0.42, 0);
      this.cylinder("sign-post", 3.9, 0.14, 0.18, post.x, ground + 1.95, post.z, this.palette.darkMetal, {
        tessellation: 6,
        cast: false,
      });
    }
    this.sign(text, x, z, ground + 3.55, yaw, width);
  }

  private farm(): void {
    const x = -260;
    const z = 190;
    const yaw = 0.12;

    // Farmhouse.
    const houseX = x - 12;
    const houseZ = z - 2;
    const houseGround = heightAt(houseX, houseZ);
    this.box("farmhouse-walls", 13, 4.6, 8.5, houseX, houseGround + 2.3, houseZ, yaw, this.palette.plasterWarm);
    this.gableRoof(houseX, houseZ, yaw, houseGround + 4.6, 13, 8.5, 2.5, this.palette.roof);
    this.addCollider(houseX, houseZ, 13, 8.5, yaw, "Farmhouse");
    const porch = this.local(houseX, houseZ, yaw, 0, 4.9);
    this.box("porch", 6, 0.25, 2.2, porch.x, houseGround + 0.15, porch.z, yaw, this.palette.wood);
    const door = this.local(houseX, houseZ, yaw, 0, 4.32);
    this.box("farmhouse-door", 1.3, 2.3, 0.14, door.x, houseGround + 1.2, door.z, yaw, this.palette.wood, {
      cast: false,
    });
    for (const side of [-1, 1]) {
      const windowPos = this.local(houseX, houseZ, yaw, side * 4, 4.3);
      this.box("farmhouse-window", 1.4, 1.2, 0.12, windowPos.x, houseGround + 2.5, windowPos.z, yaw, this.palette.window, {
        cast: false,
      });
    }
    const chimney = this.local(houseX, houseZ, yaw, -4.4, -1.5);
    this.box("chimney", 1.1, 3.4, 1.1, chimney.x, houseGround + 5.2, chimney.z, yaw, this.palette.brick);

    // Barn.
    const barnX = x + 18;
    const barnZ = z + 18;
    const barnGround = heightAt(barnX, barnZ);
    this.box("barn-walls", 16, 6, 11, barnX, barnGround + 3, barnZ, -0.18, this.palette.brick);
    this.gableRoof(barnX, barnZ, -0.18, barnGround + 6, 16, 11, 3, this.palette.metal);
    this.addCollider(barnX, barnZ, 16, 11, -0.18, "Barn");
    const barnDoor = this.local(barnX, barnZ, -0.18, 0, 5.6);
    this.box("barn-door", 4.4, 4.6, 0.16, barnDoor.x, barnGround + 2.3, barnDoor.z, -0.18, this.palette.darkMetal, {
      cast: false,
    });

    // Silos.
    for (const [siloX, siloZ] of [
      [-28, 14],
      [-21, 23],
    ] as const) {
      const sx = x + siloX;
      const sz = z + siloZ;
      const ground = heightAt(sx, sz);
      this.cylinder("silo", 10, 4.6, 4.6, sx, ground + 5, sz, this.palette.metal, { tessellation: 14 });
      this.sphere("silo-cap", 4.6, sx, ground + 10.2, sz, this.palette.metal, { scaleY: 0.45 });
      this.addCollider(sx, sz, 4.8, 4.8, 0, "Silo");
    }

    // Water tank on legs.
    const tankX = x - 24;
    const tankZ = z - 22;
    const tankGround = heightAt(tankX, tankZ);
    for (const [lx, lz] of [
      [-1.6, -1.6],
      [1.6, -1.6],
      [-1.6, 1.6],
      [1.6, 1.6],
    ] as const) {
      this.cylinder("tank-leg", 4.6, 0.2, 0.26, tankX + lx, tankGround + 2.3, tankZ + lz, this.palette.darkMetal, {
        tessellation: 6,
        cast: false,
      });
    }
    this.cylinder("water-tank", 3, 3.4, 3.4, tankX, tankGround + 6.4, tankZ, this.palette.metal, { tessellation: 14 });
    this.addCollider(tankX, tankZ, 4, 4, 0, "Water tank");

    // Irrigated field.
    const fieldX = -215;
    const fieldZ = 180;
    for (let strip = 0; strip < 6; strip += 1) {
      const stripZ = fieldZ - 20 + strip * 7;
      this.box("field-strip", 66, 0.12, 4.4, fieldX, heightAt(fieldX, stripZ) + 0.07, stripZ, 0, this.palette.soil, {
        cast: false,
      });
    }
    for (let postIndex = 0; postIndex < 24; postIndex += 1) {
      const alongX = fieldX - 33 + (postIndex % 12) * 6;
      const alongZ = fieldZ + (postIndex < 12 ? -23 : 23);
      this.box("field-post", 0.16, 1.2, 0.16, alongX, heightAt(alongX, alongZ) + 0.6, alongZ, 0, this.palette.wood, {
        cast: false,
      });
    }
    this.locationSign("KIJANI FAMILY FARM", x + 22, z - 26, -0.7, 12);

    // Tractor parking pad.
    this.box("tractor-pad", 9, 0.16, 7, x + 6, heightAt(x + 6, z - 14) + 0.08, z - 14, 0.1, this.palette.concrete, {
      cast: false,
    });
  }

  private village(): void {
    const houses: Array<[number, number, number]> = [
      [-88, 18, 0.3],
      [-72, 82, -0.2],
      [-20, 88, 0.1],
      [-16, 24, -0.35],
      [-98, 54, 0.5],
      [-34, 74, 0.15],
    ];
    for (const [offsetX, offsetZ, yaw] of houses) {
      this.house(-60 + offsetX, 60 + offsetZ, yaw, 8.5, 7, this.palette.plaster, this.palette.roof, "Village house");
    }

    // Community hall.
    const hallX = -82;
    const hallZ = 14;
    const hallGround = heightAt(hallX, hallZ);
    this.box("community-hall", 17, 5, 10, hallX, hallGround + 2.5, hallZ, 0.1, this.palette.plasterWarm);
    this.gableRoof(hallX, hallZ, 0.1, hallGround + 5, 17, 10, 2.4, this.palette.roof);
    this.addCollider(hallX, hallZ, 17, 10, 0.1, "Community hall");
    this.box("hall-door", 2, 2.6, 0.14, hallX, hallGround + 1.3, hallZ + 5.05, 0.1, this.palette.wood, { cast: false });

    // Water tower.
    const towerX = -42;
    const towerZ = 96;
    const towerGround = heightAt(towerX, towerZ);
    for (const [lx, lz] of [
      [-2.4, -2.4],
      [2.4, -2.4],
      [-2.4, 2.4],
      [2.4, 2.4],
    ] as const) {
      this.cylinder("tower-leg", 8, 0.25, 0.32, towerX + lx, towerGround + 4, towerZ + lz, this.palette.darkMetal, {
        tessellation: 6,
      });
    }
    this.cylinder("tower-tank", 5, 6, 6, towerX, towerGround + 10.5, towerZ, this.palette.metal, { tessellation: 16 });
    this.sphere("tower-cap", 6, towerX, towerGround + 13.2, towerZ, this.palette.metal, { scaleY: 0.4 });
    this.addCollider(towerX, towerZ, 5.4, 5.4, 0, "Village water tower");

    this.stall(-70, 44, 0.2);
    this.stall(-48, 38, -0.35);

    this.locationSign("MAVUNO VILLAGE", -86, 74, 0.4, 11);
  }

  private stall(x: number, z: number, yaw: number): void {
    const ground = heightAt(x, z);
    for (const [lx, lz] of [
      [-2.4, -1.8],
      [2.4, -1.8],
      [-2.4, 1.8],
      [2.4, 1.8],
    ] as const) {
      const post = this.local(x, z, yaw, lx, lz);
      this.box("stall-post", 0.18, 2.7, 0.18, post.x, ground + 1.35, post.z, yaw, this.palette.wood, {
        cast: false,
      });
    }
    this.box("stall-canopy", 5.6, 0.18, 4.2, x, ground + 2.85, z, yaw, this.palette.stripeA, { pitch: 0.08 });
    this.box("stall-counter", 4.6, 0.9, 0.8, x, ground + 0.45, z + 1.2, yaw, this.palette.wood);
    for (let index = 0; index < 3; index += 1) {
      const crate = this.local(x, z, yaw, -1.4 + index * 1.4, 0);
      this.box("crate", 0.8, 0.8, 0.8, crate.x, ground + 1.15, crate.z, yaw, this.palette.wood, { cast: false });
    }
  }

  private garage(): void {
    const x = -120;
    const z = 120;
    const shopX = x - 16;
    const shopZ = z - 8;
    const shopGround = heightAt(shopX, shopZ);
    this.box("garage-shop", 12, 4.4, 9, shopX, shopGround + 2.2, shopZ, 0.15, this.palette.plaster);
    this.gableRoof(shopX, shopZ, 0.15, shopGround + 4.4, 12, 9, 1.9, this.palette.roof);
    this.addCollider(shopX, shopZ, 12, 9, 0.15, "Juma's workshop");
    this.box("shop-door", 3, 3, 0.14, shopX, shopGround + 1.5, shopZ + 4.55, 0.15, this.palette.darkMetal, {
      cast: false,
    });

    // Fuel canopy.
    const canopyX = x + 4;
    const canopyZ = z - 16;
    const canopyGround = heightAt(canopyX, canopyZ);
    for (const [lx, lz] of [
      [-4, -2.6],
      [4, -2.6],
      [-4, 2.6],
      [4, 2.6],
    ] as const) {
      const post = this.local(canopyX, canopyZ, 0.1, lx, lz);
      this.cylinder("pump-post", 4.6, 0.24, 0.24, post.x, canopyGround + 2.3, post.z, this.palette.metal, {
        tessellation: 6,
        cast: false,
      });
    }
    this.box("canopy", 10.5, 0.4, 7.5, canopyX, canopyGround + 4.8, canopyZ, 0.1, this.palette.metal);
    for (const lx of [-1.8, 1.8]) {
      const pump = this.local(canopyX, canopyZ, 0.1, lx, 0);
      this.box("fuel-pump", 0.8, 1.7, 0.6, pump.x, canopyGround + 0.85, pump.z, 0.1, this.palette.stripeA);
      this.box("pump-screen", 0.5, 0.4, 0.08, pump.x, canopyGround + 1.25, pump.z + 0.34, 0.1, this.palette.accent, {
        cast: false,
      });
    }
    this.addCollider(shopX, shopZ, 12, 9, 0.15, "Workshop");
    this.locationSign("RIFTWAY FUEL & GARAGE", x - 4, z + 18, 0, 12);
  }

  private market(): void {
    const x = 80;
    const z = 20;
    this.stall(x - 22, z - 18, 0.3);
    this.stall(x - 8, z - 22, -0.2);
    this.stall(x + 8, z - 18, 0.1);
    this.stall(x + 23, z - 12, -0.4);

    const warehouseX = x + 6;
    const warehouseZ = z - 36;
    const ground = heightAt(warehouseX, warehouseZ);
    this.box("market-warehouse", 20, 6, 12, warehouseX, ground + 3, warehouseZ, 0.05, this.palette.plasterWarm);
    this.gableRoof(warehouseX, warehouseZ, 0.05, ground + 6, 20, 12, 2.2, this.palette.metal);
    this.addCollider(warehouseX, warehouseZ, 20, 12, 0.05, "Market warehouse");

    // Market arch.
    const archX = x - 24;
    const archZ = z + 16;
    const archGround = heightAt(archX, archZ);
    for (const side of [-1, 1]) {
      this.cylinder("arch-post", 6.5, 0.28, 0.34, archX + side * 5, archGround + 3.25, archZ, this.palette.darkMetal, {
        tessellation: 6,
      });
    }
    this.box("arch-beam", 11, 0.5, 0.4, archX, archGround + 6.6, archZ, 0, this.palette.darkMetal);
    this.sign("GREENLINE MARKET", archX, archZ + 0.3, archGround + 5.4, 0, 10);
    this.sign("GREENLINE MARKET", archX, archZ - 0.3, archGround + 5.4, Math.PI, 10);
  }

  private researchCentre(): void {
    const x = 220;
    const z = 80;
    const labX = x + 16;
    const labZ = z + 14;
    const ground = heightAt(labX, labZ);
    this.box("research-lab", 24, 7.5, 15, labX, ground + 3.75, labZ, 0.05, this.palette.plasterWarm);
    this.addCollider(labX, labZ, 24, 15, 0.05, "Research Centre");
    this.box("lab-glass-band", 24.2, 1.5, 15.2, labX, ground + 5.8, labZ, 0.05, this.palette.glass, { cast: false });
    this.box("lab-roof", 25, 0.4, 16, labX, ground + 7.7, labZ, 0.05, this.palette.concrete);
    this.sphere("lab-dome", 12, labX - 5, ground + 8, labZ, this.palette.metal, { scaleY: 0.55 });
    this.cylinder("lab-antenna", 10, 0.12, 0.2, labX + 8, ground + 12, labZ - 4, this.palette.metal, {
      tessellation: 6,
      cast: false,
    });
    this.sphere("antenna-dish", 2.2, labX + 8, ground + 17, labZ - 4, this.palette.metal, { scaleY: 0.5 });

    // Parking slab.
    this.box("lab-parking", 16, 0.12, 10, x - 6, heightAt(x - 6, z + 2) + 0.06, z + 2, 0, this.palette.concrete, {
      cast: false,
    });
    this.locationSign("AGRICULTURAL RESEARCH CENTRE", x - 14, z - 16, -0.5, 13);
  }

  private terraNovaHQ(): void {
    const x = 400;
    const z = -20;
    const towerAX = x + 14;
    const towerAZ = z + 15;
    const towerBX = x + 30;
    const towerBZ = z - 18;
    const groundA = heightAt(towerAX, towerAZ);
    const groundB = heightAt(towerBX, towerBZ);

    this.box("tn-tower-a", 20, 36, 16, towerAX, groundA + 18, towerAZ, 0.1, this.palette.towerGlass);
    this.addCollider(towerAX, towerAZ, 20, 16, 0.1, "TerraNova tower");
    for (let floor = 0; floor < 7; floor += 1) {
      this.box(
        "tn-window-band",
        20.3,
        0.5,
        16.3,
        towerAX,
        groundA + 4 + floor * 4.4,
        towerAZ,
        0.1,
        this.palette.window,
        { cast: false },
      );
    }
    this.box("tn-spire", 1.2, 12, 1.2, towerAX, groundA + 42, towerAZ, 0.1, this.palette.metal);

    this.box("tn-tower-b", 14, 26, 13, towerBX, groundB + 13, towerBZ, -0.2, this.palette.towerGlass);
    this.addCollider(towerBX, towerBZ, 14, 13, -0.2, "TerraNova annex");
    for (let floor = 0; floor < 5; floor += 1) {
      this.box(
        "tn-window-band-b",
        14.3,
        0.45,
        13.3,
        towerBX,
        groundB + 3.8 + floor * 4.5,
        towerBZ,
        -0.2,
        this.palette.window,
        { cast: false },
      );
    }
    this.sign("TERRANOVA", towerAX, towerAZ + 8.2, groundA + 30, 0.1, 12);

    // Plaza and gateway.
    const plazaX = x - 18;
    const plazaZ = z;
    this.box("tn-plaza", 26, 0.18, 20, plazaX, heightAt(plazaX, plazaZ) + 0.09, plazaZ, 0, this.palette.concrete, {
      cast: false,
    });
    for (const side of [-1, 1]) {
      this.cylinder("gate-post", 8, 0.5, 0.7, x - 35 + side * 9, heightAt(x - 35 + side * 9, z) + 4, z, this.palette.darkMetal, {
        tessellation: 8,
      });
    }
    this.box("gate-beam", 19, 0.8, 0.8, x - 35, heightAt(x - 35, z) + 8, z, 0, this.palette.darkMetal);
    this.sign("TERRANOVA", x - 35, z + 0.45, heightAt(x - 35, z) + 6.9, 0, 10);
  }

  private highway(): void {
    const z = -140;
    const gantryX = 0;
    const ground = heightAt(gantryX, z);
    for (const side of [-1, 1]) {
      this.cylinder("gantry-post", 9, 0.45, 0.6, gantryX, ground + 4.5, z + side * 13, this.palette.darkMetal, {
        tessellation: 8,
      });
    }
    this.box("gantry-beam", 28, 0.8, 0.8, gantryX, ground + 8.6, z, Math.PI / 2, this.palette.darkMetal);
    this.sign("RIFTWAY HIGHWAY", gantryX, z - 13.1, ground + 7.2, Math.PI, 12);
    this.sign("RIFTWAY HIGHWAY", gantryX, z + 13.1, ground + 7.2, 0, 12);

    for (let index = 0; index < 10; index += 1) {
      const lightX = -450 + index * 100;
      for (const side of [-1, 1]) {
        const lightZ = z + side * 17;
        this.cylinder("light-pole", 7, 0.16, 0.24, lightX, heightAt(lightX, lightZ) + 3.5, lightZ, this.palette.darkMetal, {
          tessellation: 6,
          cast: false,
        });
        this.box("light-head", 1.4, 0.25, 0.6, lightX, heightAt(lightX, lightZ) + 7, lightZ, 0, this.palette.window, {
          cast: false,
        });
      }
      if (index < 9) {
        for (const side of [-1, 1]) {
          this.box(
            "guard-rail",
            24,
            0.5,
            0.2,
            lightX + 50,
            heightAt(lightX + 50, z + side * 10.5) + 0.55,
            z + side * 10.5,
            0,
            this.palette.metal,
            { cast: false },
          );
        }
      }
    }
  }

  private waterworks(): void {
    const x = -380;
    const z = -250;
    const pumpX = x - 12;
    const pumpZ = z + 12;
    const pumpGround = heightAt(pumpX, pumpZ);
    this.box("pump-house", 15, 5, 10, pumpX, pumpGround + 2.5, pumpZ, 0.2, this.palette.brick);
    this.gableRoof(pumpX, pumpZ, 0.2, pumpGround + 5, 15, 10, 2.1, this.palette.metal);
    this.addCollider(pumpX, pumpZ, 15, 10, 0.2, "Pump house");

    const tanks: Array<[number, number]> = [
      [6, -14],
      [-4, -22],
      [14, -26],
    ];
    for (const [offsetX, offsetZ] of tanks) {
      const tankX = x + offsetX;
      const tankZ = z + offsetZ;
      const ground = heightAt(tankX, tankZ);
      this.cylinder("ww-tank", 7, 9, 9, tankX, ground + 3.5, tankZ, this.palette.rust, { tessellation: 18 });
      this.sphere("ww-cap", 9, tankX, ground + 7.2, tankZ, this.palette.rust, { scaleY: 0.35 });
      this.addCollider(tankX, tankZ, 9.2, 9.2, 0, "Water tank");
    }

    // Horizontal pipes toward the lake.
    const pipeGround = heightAt(x - 30, z - 10);
    for (const [offsetZ, height] of [
      [0, 1.1],
      [2.2, 1.1],
    ] as const) {
      const pipe = this.cylinder("ww-pipe", 34, 1.1, 1.1, x - 30, pipeGround + height, z - 8 + offsetZ, this.palette.rust, {
        tessellation: 10,
        cast: false,
      });
      pipe.rotation.z = Math.PI / 2;
      pipe.rotation.y = -0.6;
    }

    this.locationSign("OLD WATERWORKS", x + 20, z + 26, 0.8, 12);
  }

  private solarFarm(): void {
    const x = 250;
    const z = -300;
    const panel = MeshBuilder.CreateBox("solar-panel", { width: 6, height: 0.14, depth: 3.2 }, this.scene);
    panel.material = this.palette.solar;
    const frames = new Float32Array(5 * 4 * 16);
    let matrixIndex = 0;
    for (let row = 0; row < 5; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        const px = x - 27 + column * 18;
        const pz = z - 18 + row * 10;
        const py = heightAt(px, pz) + 2.1;
        const rotation = Quaternion.RotationYawPitchRoll(0.04, -0.55, 0);
        Matrix.Compose(new Vector3(1, 1, 1), rotation, new Vector3(px, py, pz)).copyToArray(frames, matrixIndex);
        matrixIndex += 16;
        for (const side of [-1, 1]) {
          this.box("panel-post", 0.18, 1.5, 0.18, px + side * 2.2, heightAt(px, pz) + 0.75, pz, 0, this.palette.solarFrame, {
            cast: false,
          });
        }
      }
    }
    panel.thinInstanceSetBuffer("matrix", frames, 16, true);
    panel.thinInstanceRefreshBoundingInfo(true);
    panel.receiveShadows = true;

    const shedX = x - 34;
    const shedZ = z + 24;
    const shedGround = heightAt(shedX, shedZ);
    this.box("solar-shed", 10, 4, 7, shedX, shedGround + 2, shedZ, 0.1, this.palette.plaster);
    this.box("solar-shed-roof", 11, 0.3, 8, shedX, shedGround + 4.15, shedZ, 0.1, this.palette.metal);
    this.addCollider(shedX, shedZ, 10, 7, 0.1, "Solar control shed");

    this.windTurbine(x + 36, z - 22);
    this.windTurbine(x - 42, z - 34);

    this.locationSign("SUNRIDGE SOLAR FARM", x + 6, z + 40, Math.PI + 0.2, 13);
  }

  private windTurbine(x: number, z: number): void {
    const ground = heightAt(x, z);
    this.cylinder("turbine-tower", 28, 1.1, 1.9, x, ground + 14, z, this.palette.metal, { tessellation: 12 });
    this.box("turbine-nacelle", 3.4, 1.8, 1.8, x, ground + 28.3, z, 0, this.palette.darkMetal);
    const hub = new TransformNode("turbine-hub", this.scene);
    hub.position.set(x, ground + 28.3, z + 1.1);
    for (let blade = 0; blade < 3; blade += 1) {
      const pivot = new TransformNode("blade-pivot", this.scene);
      pivot.parent = hub;
      pivot.rotation.z = (blade / 3) * Math.PI * 2;
      const mesh = MeshBuilder.CreateBox("blade", { width: 0.9, height: 15, depth: 0.28 }, this.scene);
      mesh.parent = pivot;
      mesh.position.y = 7.5;
      mesh.material = this.palette.metal;
      mesh.receiveShadows = true;
      this.shadowCasters.push(mesh);
    }
    this.animated.push({ node: hub, speed: 0.35 });
  }

  private redDustPlains(): void {
    const x = 380;
    const z = 220;
    const shackX = x + 8;
    const shackZ = z + 12;
    const ground = heightAt(shackX, shackZ);
    this.box("plains-shack-a", 9, 3.2, 1.2, shackX, ground + 1.6, shackZ - 4, 0.2, this.palette.plainsWood);
    this.box("plains-shack-b", 9, 2.4, 1.2, shackX, ground + 1.2, shackZ + 4, 0.2, this.palette.plainsWood);
    this.box("plains-shack-c", 1.2, 2.8, 8, shackX + 4.4, ground + 1.4, shackZ, 0.2, this.palette.plainsWood);
    this.addCollider(shackX, shackZ, 9, 8, 0.2, "Abandoned homestead");

    // Rusted truck wreck.
    const truckX = x - 22;
    const truckZ = z - 14;
    const truckGround = heightAt(truckX, truckZ);
    this.box("wreck-body", 4.2, 1.1, 2.1, truckX, truckGround + 0.85, truckZ, 0.5, this.palette.rust);
    this.box("wreck-cab", 1.9, 1.3, 2, truckX - 1.2, truckGround + 1.65, truckZ + 0.4, 0.5, this.palette.rust);
    for (const [lx, lz] of [
      [-1.4, -1],
      [1.4, -1],
      [-1.4, 1],
      [1.4, 1],
    ] as const) {
      const wheel = this.local(truckX, truckZ, 0.5, lx, lz);
      this.cylinder("wreck-wheel", 0.4, 0.9, 0.9, wheel.x, truckGround + 0.45, wheel.z, this.palette.darkMetal, {
        tessellation: 10,
      });
    }

    for (let index = 0; index < 8; index += 1) {
      const treeX = x - 50 + index * 13;
      const treeZ = z - 10 + (index % 3) * 14;
      const treeGround = heightAt(treeX, treeZ);
      this.cylinder("dead-trunk", 5, 0.25, 0.45, treeX, treeGround + 2.5, treeZ, this.palette.trunk, {
        tessellation: 6,
      });
      const branch = this.cylinder("dead-branch", 3.4, 0.12, 0.2, treeX + 1.1, treeGround + 4.2, treeZ, this.palette.trunk, {
        tessellation: 5,
        cast: false,
      });
      branch.rotation.z = 0.9;
      branch.rotation.y = index;
    }

    this.locationSign("RED DUST PLAINS", x - 10, z - 34, 0.3, 12);
  }
}
