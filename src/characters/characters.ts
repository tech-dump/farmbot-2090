import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Scene } from "@babylonjs/core/scene";
import { heightAt } from "../world/landscape";
import { animateHumanoid, createHumanoid, type HumanoidOptions, type HumanoidRig } from "./humanoid";

export interface CharacterDef {
  id: string;
  name: string;
  role: string;
  x: number;
  z: number;
  yaw: number;
  dialogue: string;
  palette: HumanoidOptions;
}

/** Stationary story characters standing at their posts in the basin. */
export const CHARACTER_DEFS: CharacterDef[] = [
  {
    id: "mama-zuri",
    name: "Mama Zuri",
    role: "Farmer, Kijani Family Farm",
    x: -279,
    z: 161,
    yaw: 1.1,
    dialogue: "mama-zuri",
    palette: {
      skin: "#7a4a2c",
      shirt: "#a84a33",
      trousers: "#3a2b26",
      shoes: "#1d1a16",
      hair: "#241d19",
      accent: "#e3a54c",
      hat: "wrap",
      scarf: true,
      scale: 0.94,
    },
  },
  {
    id: "juma",
    name: "Juma",
    role: "Mechanic, Riftway Garage",
    x: -136,
    z: 119,
    yaw: 2.4,
    dialogue: "juma",
    palette: {
      skin: "#5d3620",
      shirt: "#3f5c44",
      trousers: "#31363b",
      shoes: "#171614",
      hair: "#141110",
      accent: "#d7a53f",
      hat: "cap",
      scale: 1.01,
    },
  },
  {
    id: "wanjiku",
    name: "Wanjiku",
    role: "Cooperative leader, Greenline",
    x: 79,
    z: 14,
    yaw: 2.9,
    dialogue: "wanjiku",
    palette: {
      skin: "#6b4126",
      shirt: "#c9a13c",
      trousers: "#4a3d2c",
      shoes: "#201c17",
      hair: "#1c1512",
      accent: "#8c5f2c",
      hat: "wide",
      scale: 0.97,
    },
  },
  {
    id: "dr-sifa",
    name: "Dr. Sifa",
    role: "Signals scientist, Research Centre",
    x: 214,
    z: 75.5,
    yaw: 0.2,
    dialogue: "dr-sifa",
    palette: {
      skin: "#59331d",
      shirt: "#d9d4c4",
      trousers: "#3b4448",
      shoes: "#22201c",
      hair: "#1b1714",
      accent: "#7fb9c9",
      scale: 0.96,
    },
  },
  {
    id: "director",
    name: "TerraNova Director",
    role: "Regional director, TerraNova HQ",
    x: 378,
    z: -20,
    yaw: -1.45,
    dialogue: "director",
    palette: {
      skin: "#6d4530",
      shirt: "#23262e",
      trousers: "#1a1c22",
      shoes: "#111114",
      hair: "#15161a",
      accent: "#b23a3a",
      scale: 1,
    },
  },
];

export interface PlacedCharacter {
  def: CharacterDef;
  rig: HumanoidRig;
}

export class Characters {
  readonly placed: PlacedCharacter[] = [];
  readonly casters: Mesh[] = [];

  constructor(scene: Scene) {
    for (const def of CHARACTER_DEFS) {
      const rig = createHumanoid(scene, def.palette, def.name);
      rig.root.position.set(def.x, heightAt(def.x, def.z), def.z);
      rig.root.rotation.y = def.yaw;
      if (rig.label) {
        rig.label.position.y = 2.3;
      }
      this.casters.push(...rig.casters);
      this.placed.push({ def, rig });
    }
  }

  update(dt: number, playerX: number, playerZ: number, playerVisible: boolean): void {
    for (const entry of this.placed) {
      animateHumanoid(entry.rig, dt, 0, false, true);
      const distance = Math.hypot(entry.def.x - playerX, entry.def.z - playerZ);
      if (distance < 9) {
        const target = Math.atan2(playerX - entry.def.x, playerZ - entry.def.z);
        entry.rig.root.rotation.y = dampAngle(entry.rig.root.rotation.y, target, dt);
      } else {
        entry.rig.root.rotation.y = dampAngle(entry.rig.root.rotation.y, entry.def.yaw, dt * 0.4);
      }
      if (entry.rig.label) {
        entry.rig.label.setEnabled(playerVisible && distance < 42);
      }
    }
  }

  nearest(x: number, z: number, range: number): PlacedCharacter | null {
    let best: PlacedCharacter | null = null;
    let bestDistance = range;
    for (const entry of this.placed) {
      const distance = Math.hypot(entry.def.x - x, entry.def.z - z);
      if (distance <= bestDistance) {
        bestDistance = distance;
        best = entry;
      }
    }
    return best;
  }
}

export function dampAngle(current: number, target: number, dt: number): number {
  let delta = target - current;
  while (delta > Math.PI) {
    delta -= Math.PI * 2;
  }
  while (delta < -Math.PI) {
    delta += Math.PI * 2;
  }
  return current + delta * Math.min(1, dt * 6);
}
