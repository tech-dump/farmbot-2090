import * as THREE from 'three';

export interface Collider {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface Interactable {
  readonly id: string;
  readonly label: string;
  readonly message: string;
}

interface MeshOptions {
  rotX?: number;
  rotY?: number;
  collide?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * THE FORGOTTEN FARM - Stage 1 environment.
 *
 * Everything here is procedural PLACEHOLDER geometry built from primitives.
 * No external art, textures, models or audio assets are used. The layout and
 * interaction labels exist so the farming, restoration and mission systems can
 * be attached in later stages.
 */
export class World {
  readonly colliders: Collider[] = [];
  readonly interactables: Interactable[] = [];
  readonly interactableRoots: THREE.Object3D[] = [];

  private readonly scene: THREE.Scene;
  private readonly rng = mulberry32(2090);
  private readonly dust: THREE.Points;
  private readonly seedLight: THREE.PointLight;
  private readonly seedMesh: THREE.Mesh;
  private readonly seedMaterial: THREE.MeshStandardMaterial;
  private time = 0;

  private readonly materials = {
    ground: new THREE.MeshStandardMaterial({ color: 0x7c6951, roughness: 1 }),
    patch: new THREE.MeshStandardMaterial({
      color: 0x5c4a36,
      roughness: 1,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x8b8477, roughness: 0.95 }),
    concreteDark: new THREE.MeshStandardMaterial({ color: 0x6e695e, roughness: 0.95 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x5d5a52, roughness: 0.9 }),
    metal: new THREE.MeshStandardMaterial({
      color: 0x59616a,
      roughness: 0.55,
      metalness: 0.65
    }),
    rust: new THREE.MeshStandardMaterial({ color: 0x7a4a2e, roughness: 0.85 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x5a4633, roughness: 0.95 }),
    soil: new THREE.MeshStandardMaterial({ color: 0x4c3927, roughness: 1 }),
    deadTree: new THREE.MeshStandardMaterial({ color: 0x4e4132, roughness: 1 }),
    rock: new THREE.MeshStandardMaterial({ color: 0x726a5d, roughness: 1 }),
    screen: new THREE.MeshStandardMaterial({
      color: 0x0d1a14,
      emissive: 0x7cf2a8,
      emissiveIntensity: 1.6,
      roughness: 0.4
    }),
    seedGlow: new THREE.MeshStandardMaterial({
      color: 0x9fe870,
      emissive: 0x9fe870,
      emissiveIntensity: 1.6,
      roughness: 0.4
    }),
    seed: new THREE.MeshStandardMaterial({
      color: 0xc8ffa0,
      emissive: 0x9fe870,
      emissiveIntensity: 1.6,
      roughness: 0.35
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x9fd8ff,
      emissive: 0x2a6b8f,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.25,
      roughness: 0.1,
      metalness: 0.1
    })
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildLighting();
    this.buildGround();
    this.buildFacility();
    const chamber = this.buildSeedChamber();
    this.seedLight = chamber.light;
    this.seedMesh = chamber.seed;
    this.seedMaterial = chamber.material;
    this.buildFarmPlot();
    this.buildLandscape();
    this.dust = this.buildDust();
    this.addBoundary();
  }

  update(dt: number): void {
    this.time += dt;
    this.dust.rotation.y += dt * 0.006;
    const pulse =
      0.85 +
      Math.sin(this.time * 1.5) * 0.25 +
      Math.sin(this.time * 3.9) * 0.08;
    this.seedMaterial.emissiveIntensity = 1.2 + pulse * 0.8;
    this.seedLight.intensity = 2 + pulse * 1.6;
    this.seedMesh.rotation.y += dt * 0.5;
  }

  private buildLighting(): void {
    const hemi = new THREE.HemisphereLight(0xbfd2e2, 0x6a5945, 0.9);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffd9a6, 2.4);
    sun.position.set(-26, 34, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -40;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 110;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    sun.shadow.camera.updateProjectionMatrix();
    sun.target.position.set(0, 0, -8);
    this.scene.add(sun);
    this.scene.add(sun.target);

    const interior = new THREE.PointLight(0x9fc8ff, 7, 15, 2);
    interior.position.set(0, 4.2, -20);
    this.scene.add(interior);

    const consoleLight = new THREE.PointLight(0x7cf2a8, 3, 7, 2);
    consoleLight.position.set(-3.4, 2.1, -21.6);
    this.scene.add(consoleLight);
  }

  private buildGround(): void {
    const ground = this.addMesh(
      new THREE.PlaneGeometry(220, 220),
      this.materials.ground,
      0,
      0,
      0,
      { castShadow: false }
    );
    ground.rotation.x = -Math.PI / 2;

    for (let i = 0; i < 16; i += 1) {
      const radius = 1.5 + this.rng() * 3.5;
      const patch = this.addMesh(
        new THREE.CircleGeometry(radius, 14),
        this.materials.patch,
        (this.rng() - 0.5) * 90,
        0.012,
        (this.rng() - 0.5) * 90,
        { castShadow: false, receiveShadow: false }
      );
      patch.rotation.x = -Math.PI / 2;
    }
  }

  private buildFacility(): void {
    const { concrete, concreteDark, metal, wood, screen } = this.materials;

    this.addBox(16, 0.06, 12, concreteDark, 0, 0.03, -20, {
      castShadow: false
    });
    this.addBox(16, 5.4, 0.5, concrete, 0, 2.7, -25.75, { collide: true });
    this.addBox(0.5, 5.4, 12, concrete, -7.75, 2.7, -20, { collide: true });
    this.addBox(0.5, 5.4, 12, concrete, 7.75, 2.7, -20, { collide: true });
    this.addBox(5.5, 5.4, 0.5, concrete, -5.25, 2.7, -14.25, {
      collide: true
    });
    this.addBox(5.5, 5.4, 0.5, concrete, 5.25, 2.7, -14.25, { collide: true });
    this.addBox(5, 0.8, 0.5, concrete, 0, 5, -14.25);
    this.addBox(16.8, 0.4, 12.8, this.materials.roof, 0, 5.55, -20);

    this.addBox(3, 0.06, 0.5, screen, 0, 5.3, -18, {
      castShadow: false,
      receiveShadow: false
    });
    this.addBox(3, 0.06, 0.5, screen, 0, 5.3, -22.5, {
      castShadow: false,
      receiveShadow: false
    });

    const consoleBase = this.addBox(2.6, 1, 0.9, metal, -3.4, 0.5, -22.4, {
      collide: true
    });
    this.addBox(2.2, 0.9, 0.06, screen, -3.4, 1.55, -22.75, {
      rotX: -0.35,
      castShadow: false
    });
    this.tagInteract(consoleBase, 'console');

    this.addBox(1.1, 1.1, 1.1, wood, 5.9, 0.55, -23.6, {
      rotY: 0.2,
      collide: true
    });
    this.addBox(1.1, 1.1, 1.1, wood, 5.6, 1.65, -23.4, { rotY: 0.55 });
    this.addBox(1.2, 0.9, 1, wood, 6.4, 0.45, -21.9, { rotY: -0.3 });

    this.interactables.push({
      id: 'console',
      label: 'Service console',
      message:
        'FARM-01 diagnostics terminal. Power at 4 percent. Activation sequence arrives in Stage 2.'
    });
  }

  private buildSeedChamber(): {
    light: THREE.PointLight;
    seed: THREE.Mesh;
    material: THREE.MeshStandardMaterial;
  } {
    const pedestal = this.addMesh(
      new THREE.CylinderGeometry(0.95, 1.15, 0.9, 20),
      this.materials.metal,
      3.2,
      0.45,
      -22.3
    );
    const dome = this.addMesh(
      new THREE.SphereGeometry(0.82, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      this.materials.glass,
      3.2,
      0.9,
      -22.3,
      { castShadow: false, receiveShadow: false }
    );
    const ring = this.addMesh(
      new THREE.TorusGeometry(0.82, 0.05, 10, 40),
      this.materials.seedGlow,
      3.2,
      1.76,
      -22.3,
      { rotX: Math.PI / 2, castShadow: false, receiveShadow: false }
    );
    const seed = this.addMesh(
      new THREE.IcosahedronGeometry(0.22, 0),
      this.materials.seed,
      3.2,
      1.28,
      -22.3,
      { castShadow: false }
    );

    const light = new THREE.PointLight(0xaef07a, 3, 6, 2);
    light.position.set(3.2, 1.6, -22.3);
    this.scene.add(light);

    for (const root of [pedestal, dome, seed, ring]) {
      this.tagInteract(root, 'chamber');
    }
    this.interactables.push({
      id: 'chamber',
      label: 'Preservation chamber',
      message:
        'The Last Seed is preserved here. Recovery systems are not implemented in this prototype.'
    });

    return { light, seed, material: this.materials.seed };
  }

  private buildFarmPlot(): void {
    const { soil, wood, rust } = this.materials;

    const stripCenters = [9.2, 11, 12.8];
    for (const x of stripCenters) {
      this.addBox(1.3, 0.1, 7.5, soil, x, 0.05, 8.2, {
        castShadow: false
      });
    }

    // Fence: north, west and east sides. The south side stays open so the
    // player can walk into the plot from the spawn path.
    for (const x of [7.6, 13.9]) {
      for (const z of [4, 8, 12]) {
        this.addBox(0.14, 1.5, 0.14, wood, x, 0.75, z);
      }
    }
    for (const z of [0.55, 1.1]) {
      this.addBox(6.3, 0.12, 0.06, wood, 10.75, z, 4);
      this.addBox(0.06, 0.12, 8, wood, 7.6, z, 8);
      this.addBox(0.06, 0.12, 8, wood, 13.9, z, 8);
    }
    this.colliders.push(
      { minX: 7.5, maxX: 14, minZ: 3.85, maxZ: 4.15 },
      { minX: 7.45, maxX: 7.75, minZ: 3.85, maxZ: 12.15 },
      { minX: 13.75, maxX: 14.05, minZ: 3.85, maxZ: 12.15 }
    );

    const pipeSegmentA = this.addMesh(
      new THREE.CylinderGeometry(0.14, 0.14, 3.4, 10),
      rust,
      7.25,
      0.42,
      6.3,
      { rotX: Math.PI / 2 }
    );
    const pipeSegmentB = this.addMesh(
      new THREE.CylinderGeometry(0.14, 0.14, 3.4, 10),
      rust,
      7.25,
      0.42,
      10.1,
      { rotX: Math.PI / 2 }
    );
    this.addMesh(
      new THREE.CylinderGeometry(0.07, 0.07, 1, 8),
      rust,
      7.25,
      0.9,
      8.2
    );
    this.addMesh(
      new THREE.TorusGeometry(0.24, 0.05, 8, 24),
      rust,
      7.25,
      1.45,
      8.2,
      { rotY: Math.PI / 2, castShadow: false }
    );

    const pump = this.addBox(0.85, 1, 0.85, rust, 7.25, 0.5, 4.3, {
      collide: true
    });
    for (const root of [pump, pipeSegmentA, pipeSegmentB]) {
      this.tagInteract(root, 'irrigation');
    }
    this.interactables.push({
      id: 'irrigation',
      label: 'Irrigation pump',
      message:
        'Pressure reads zero. Pipe section is ruptured. Repair tools arrive in Stage 3.'
    });

    const stake = this.addBox(0.08, 1.3, 0.08, wood, 9.5, 0.65, 12.6);
    this.tagInteract(stake, 'plot');
    this.interactables.push({
      id: 'plot',
      label: 'Plot A - depleted soil',
      message:
        'Soil condition: depleted. Tilling and planting systems arrive in Stage 2.'
    });
  }

  private buildLandscape(): void {
    const treeSpots: Array<[number, number]> = [
      [-12, 6],
      [-16, -2],
      [-12, -12],
      [16, 6],
      [18, -6],
      [10, 19],
      [-8, 20],
      [22, 14]
    ];
    for (const [x, z] of treeSpots) {
      this.addDeadTree(x, z);
    }

    this.buildRocks();

    const { concrete, concreteDark } = this.materials;
    this.addMesh(
      new THREE.CylinderGeometry(4.5, 4.8, 13, 16),
      concrete,
      38,
      6.5,
      -34
    );
    this.addMesh(
      new THREE.SphereGeometry(4.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      concreteDark,
      38,
      13,
      -34
    );
    this.addMesh(
      new THREE.CylinderGeometry(5.5, 5.9, 15, 16),
      concreteDark,
      -36,
      7.5,
      -40
    );
    this.addMesh(
      new THREE.CylinderGeometry(4, 4.3, 11, 14),
      concrete,
      32,
      5.5,
      18
    );
  }

  private addDeadTree(x: number, z: number): void {
    const height = 3.5 + this.rng() * 2.5;
    const trunk = this.addMesh(
      new THREE.CylinderGeometry(0.12 + this.rng() * 0.1, 0.22 + this.rng() * 0.14, height, 7),
      this.materials.deadTree,
      x,
      height / 2,
      z
    );
    trunk.rotation.z = (this.rng() - 0.5) * 0.12;

    const branchCount = 2 + Math.floor(this.rng() * 2);
    for (let i = 0; i < branchCount; i += 1) {
      const length = 1.2 + this.rng() * 1.4;
      const geometry = new THREE.CylinderGeometry(0.05, 0.09, length, 5);
      geometry.translate(0, length / 2, 0);
      const branch = new THREE.Mesh(geometry, this.materials.deadTree);
      branch.position.set(x, height * (0.5 + this.rng() * 0.35), z);
      branch.rotation.set(
        (this.rng() - 0.5) * 1.2,
        this.rng() * Math.PI * 2,
        (this.rng() - 0.5) * 1.2
      );
      branch.castShadow = true;
      branch.receiveShadow = true;
      this.scene.add(branch);
    }
  }

  private buildRocks(): void {
    const count = 70;
    const rocks = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.6, 0),
      this.materials.rock,
      count
    );
    rocks.castShadow = true;
    rocks.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i += 1) {
      let x = 0;
      let z = 0;
      do {
        x = (this.rng() - 0.5) * 90;
        z = (this.rng() - 0.5) * 90;
      } while (this.isBlockedArea(x, z));

      const scale = 0.3 + this.rng() * 1.4;
      dummy.position.set(x, scale * 0.3, z);
      dummy.rotation.set(
        this.rng() * Math.PI,
        this.rng() * Math.PI,
        this.rng() * Math.PI
      );
      dummy.scale.set(scale, scale * (0.6 + this.rng() * 0.5), scale);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
    }
    rocks.instanceMatrix.needsUpdate = true;
    this.scene.add(rocks);
  }

  private buildDust(): THREE.Points {
    const count = 380;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (this.rng() - 0.5) * 70;
      positions[i * 3 + 1] = 0.4 + this.rng() * 8;
      positions[i * 3 + 2] = (this.rng() - 0.5) * 70;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xd9c9a8,
      size: 0.07,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      sizeAttenuation: true
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    this.scene.add(points);
    return points;
  }

  private addBoundary(): void {
    this.colliders.push(
      { minX: 45, maxX: 49, minZ: -50, maxZ: 50 },
      { minX: -49, maxX: -45, minZ: -50, maxZ: 50 },
      { minX: -50, maxX: 50, minZ: 45, maxZ: 49 },
      { minX: -50, maxX: 50, minZ: -49, maxZ: -45 }
    );
  }

  private isBlockedArea(x: number, z: number): boolean {
    const inFacility = x > -9 && x < 9 && z > -27 && z < -13;
    const inField = x > 6 && x < 15 && z > 3 && z < 13;
    const inSpawn = Math.abs(x) < 4 && z > 12 && z < 20;
    return inFacility || inField || inSpawn;
  }

  private tagInteract(root: THREE.Object3D, id: string): void {
    root.userData.interactId = id;
    this.interactableRoots.push(root);
  }

  private addMesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    options: MeshOptions = {}
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    if (options.rotX) mesh.rotation.x = options.rotX;
    if (options.rotY) mesh.rotation.y = options.rotY;
    mesh.castShadow = options.castShadow ?? true;
    mesh.receiveShadow = options.receiveShadow ?? true;
    this.scene.add(mesh);
    return mesh;
  }

  private addBox(
    width: number,
    height: number,
    depth: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    options: MeshOptions = {}
  ): THREE.Mesh {
    const mesh = this.addMesh(
      new THREE.BoxGeometry(width, height, depth),
      material,
      x,
      y,
      z,
      options
    );
    if (options.collide) {
      this.colliders.push({
        minX: x - width / 2,
        maxX: x + width / 2,
        minZ: z - depth / 2,
        maxZ: z + depth / 2
      });
    }
    return mesh;
  }
}
