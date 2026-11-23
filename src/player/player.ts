import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Input } from "../core/input";
import {
  EYE_HEIGHT,
  GRAVITY,
  JUMP_SPEED,
  MOUSE_SENSITIVITY,
  PITCH_LIMIT,
  PLAYER_RADIUS,
  SPRINT_SPEED,
  WALK_SPEED,
  WORLD_LIMIT,
} from "../core/constants";
import { approach, clamp, damp } from "../core/math";
import { heightAt } from "../world/landscape";
import { resolveCircle, type Collider } from "../world/collision";

export const SPAWN = { x: -256, z: 172, yaw: -0.78 };

export class Player {
  readonly position = new Vector3(SPAWN.x, 0, SPAWN.z);
  yaw = SPAWN.yaw;
  pitch = 0.02;
  speed = 0;
  sprinting = false;
  grounded = true;

  private velocityX = 0;
  private velocityZ = 0;
  private verticalVelocity = 0;
  private bobTime = 0;

  constructor() {
    this.position.y = heightAt(SPAWN.x, SPAWN.z);
  }

  update(dt: number, input: Input, colliders: readonly Collider[]): void {
    const mouse = input.consumeMouseDelta();
    if (mouse.x !== 0 || mouse.y !== 0) {
      this.yaw += mouse.x * MOUSE_SENSITIVITY;
      this.pitch = clamp(this.pitch - mouse.y * MOUSE_SENSITIVITY, -PITCH_LIMIT, PITCH_LIMIT);
    }

    const moveForward = (input.isDown("KeyW") ? 1 : 0) - (input.isDown("KeyS") ? 1 : 0);
    const moveRight = (input.isDown("KeyD") ? 1 : 0) - (input.isDown("KeyA") ? 1 : 0);
    const sprinting = (input.isDown("ShiftLeft") || input.isDown("ShiftRight")) && moveForward > 0;

    const forwardX = Math.sin(this.yaw);
    const forwardZ = Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);

    let directionX = forwardX * moveForward + rightX * moveRight;
    let directionZ = forwardZ * moveForward + rightZ * moveRight;
    const directionLength = Math.hypot(directionX, directionZ);
    if (directionLength > 0.0001) {
      directionX /= directionLength;
      directionZ /= directionLength;
    }

    const targetSpeed = directionLength > 0 ? (sprinting ? SPRINT_SPEED : WALK_SPEED) : 0;
    const acceleration = this.grounded ? 36 : 9;
    this.velocityX = approach(this.velocityX, directionX * targetSpeed, acceleration * dt);
    this.velocityZ = approach(this.velocityZ, directionZ * targetSpeed, acceleration * dt);

    if (this.grounded && input.consumePress("Space")) {
      this.verticalVelocity = JUMP_SPEED;
      this.grounded = false;
    }

    let nextX = this.position.x + this.velocityX * dt;
    let nextZ = this.position.z + this.velocityZ * dt;
    nextX = clamp(nextX, -WORLD_LIMIT, WORLD_LIMIT);
    nextZ = clamp(nextZ, -WORLD_LIMIT, WORLD_LIMIT);

    const resolved = resolveCircle(nextX, nextZ, PLAYER_RADIUS, colliders);
    if (resolved.hit) {
      this.velocityX *= 0.35;
      this.velocityZ *= 0.35;
    }
    this.position.x = resolved.x;
    this.position.z = resolved.z;

    const ground = heightAt(this.position.x, this.position.z);
    if (this.grounded) {
      this.position.y = ground;
    } else {
      this.verticalVelocity -= GRAVITY * dt;
      this.position.y += this.verticalVelocity * dt;
      if (this.position.y <= ground) {
        this.position.y = ground;
        this.verticalVelocity = 0;
        this.grounded = true;
      }
    }

    this.speed = Math.hypot(this.velocityX, this.velocityZ);
    this.sprinting = sprinting && this.speed > 0.6;
    if (this.grounded && this.speed > 0.4) {
      this.bobTime += dt * (this.sprinting ? 12.5 : 8.8);
    }
  }

  applyCamera(camera: FreeCamera, dt: number, thirdPerson = false): void {
    if (thirdPerson) {
      const distance = 5.2;
      const cosPitch = Math.cos(this.pitch);
      const forwardX = Math.sin(this.yaw) * cosPitch;
      const forwardY = -Math.sin(this.pitch);
      const forwardZ = Math.cos(this.yaw) * cosPitch;
      const targetY = this.position.y + 1.55;
      const cameraX = this.position.x - forwardX * distance;
      const cameraZ = this.position.z - forwardZ * distance;
      let cameraY = targetY - forwardY * distance + 0.15;
      const floor = heightAt(cameraX, cameraZ) + 0.5;
      if (cameraY < floor) {
        cameraY = floor;
      }
      camera.position.set(cameraX, cameraY, cameraZ);
      camera.rotation.set(this.pitch, this.yaw, 0);
      const targetFov = ((this.sprinting ? 84 : 76) * Math.PI) / 180;
      camera.fov = damp(camera.fov, targetFov, 9, dt);
      return;
    }
    const bobStrength = this.grounded ? Math.min(1, this.speed / 6) : 0;
    const bob = Math.sin(this.bobTime * 2.1) * 0.045 * bobStrength;
    const sway = Math.cos(this.bobTime * 1.05) * 0.032 * bobStrength;
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);
    camera.position.set(
      this.position.x + rightX * sway,
      this.position.y + EYE_HEIGHT + bob,
      this.position.z + rightZ * sway,
    );
    camera.rotation.set(this.pitch, this.yaw, 0);
    const targetFov = ((this.sprinting ? 78 : 70) * Math.PI) / 180;
    camera.fov = damp(camera.fov, targetFov, 9, dt);
  }

  placeAt(x: number, z: number): void {
    this.position.set(x, heightAt(x, z), z);
    this.velocityX = 0;
    this.velocityZ = 0;
    this.verticalVelocity = 0;
    this.grounded = true;
  }

  faceToward(x: number, z: number): void {
    this.yaw = Math.atan2(x - this.position.x, z - this.position.z);
  }
}
