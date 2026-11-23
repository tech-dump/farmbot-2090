import { Color3 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Scene } from "@babylonjs/core/scene";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { heightAt } from "../world/landscape";
import { findRoute, type Point2 } from "./routing";

export interface Waypoint {
  x: number;
  z: number;
  label: string;
}

export class Gps {
  waypoint: Waypoint | null = null;
  route: Point2[] = [];
  routeLength = 0;

  private readonly beaconRoot: TransformNode;
  private readonly beam: Mesh;
  private readonly ring: Mesh;
  private pulse = 0;
  private lastRouteFrom: Point2 | null = null;

  constructor(scene: Scene) {
    this.beaconRoot = new TransformNode("gps-beacon", scene);
    this.beaconRoot.setEnabled(false);

    const beamMaterial = new StandardMaterial("gps-beam-material", scene);
    beamMaterial.diffuseColor = Color3.Black();
    beamMaterial.emissiveColor = Color3.FromHexString("#a8e06a");
    beamMaterial.alpha = 0.24;
    beamMaterial.disableLighting = true;
    beamMaterial.backFaceCulling = false;

    this.beam = MeshBuilder.CreateCylinder(
      "gps-beam",
      { height: 34, diameterTop: 0.6, diameterBottom: 2.4, tessellation: 12 },
      scene,
    );
    this.beam.material = beamMaterial;
    this.beam.isPickable = false;
    this.beam.parent = this.beaconRoot;
    this.beam.position.y = 17;

    const ringMaterial = new StandardMaterial("gps-ring-material", scene);
    ringMaterial.diffuseColor = Color3.Black();
    ringMaterial.emissiveColor = Color3.FromHexString("#d8ff9e");
    ringMaterial.disableLighting = true;
    this.ring = MeshBuilder.CreateTorus(
      "gps-ring",
      { diameter: 8, thickness: 0.35, tessellation: 32 },
      scene,
    );
    this.ring.material = ringMaterial;
    this.ring.isPickable = false;
    this.ring.parent = this.beaconRoot;
    this.ring.position.y = 0.6;
  }

  setWaypoint(x: number, z: number, label: string, from: Point2): void {
    this.waypoint = { x, z, label };
    this.lastRouteFrom = null;
    this.refreshRoute(from);
    this.beaconRoot.position.set(x, heightAt(x, z), z);
    this.beaconRoot.setEnabled(true);
  }

  clear(): void {
    this.waypoint = null;
    this.route = [];
    this.routeLength = 0;
    this.lastRouteFrom = null;
    this.beaconRoot.setEnabled(false);
  }

  distanceFrom(point: Point2): number {
    if (!this.waypoint) {
      return 0;
    }
    return Math.hypot(this.waypoint.x - point.x, this.waypoint.z - point.z);
  }

  update(dt: number, point: Point2): void {
    this.pulse += dt;
    if (!this.waypoint) {
      return;
    }
    this.beaconRoot.rotation.y += dt * 0.5;
    const scale = 1 + Math.sin(this.pulse * 2.4) * 0.08;
    this.ring.scaling.set(scale, 1, scale);
    this.beam.rotation.y += dt * 0.8;

    if (
      !this.lastRouteFrom ||
      Math.hypot(point.x - this.lastRouteFrom.x, point.z - this.lastRouteFrom.z) > 30
    ) {
      this.refreshRoute(point);
    }
  }

  private refreshRoute(from: Point2): void {
    if (!this.waypoint) {
      return;
    }
    const route = findRoute(from, { x: this.waypoint.x, z: this.waypoint.z });
    this.route = route.points;
    this.routeLength = route.length;
    this.lastRouteFrom = { x: from.x, z: from.z };
  }
}
