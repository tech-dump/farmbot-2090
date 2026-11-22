import * as THREE from 'three';
import type { Input } from '../core/input';
import type { Collider } from '../world/world';

export const EYE_HEIGHT = 1.7;

const PLAYER_RADIUS = 0.38;
const WALK_SPEED = 4.4;
const SPRINT_SPEED = 7.4;
const ACCEL_LAMBDA = 11;
const GRAVITY = 18;
const JUMP_SPEED = 6.2;
const LOOK_SENSITIVITY = 0.0021;
const BASE_FOV = 72;
const SPRINT_FOV = 78;

/**
 * First-person controller. Movement is horizontal only; collision against
 * axis-aligned wall boxes is resolved by pushing the player out along the
 * smallest penetration axis.
 */
export class Player {
  readonly position = new THREE.Vector3(0, EYE_HEIGHT, 16);

  private readonly velocity = new THREE.Vector3();
  private verticalVelocity = 0;
  private grounded = true;
  private yaw = 0;
  private pitch = -0.02;
  private bobTime = 0;
  private bobAmount = 0;
  private currentFov = BASE_FOV;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly input: Input,
    private readonly colliders: Collider[]
  ) {
    this.camera.rotation.order = 'YXZ';
    this.camera.fov = this.currentFov;
    this.camera.updateProjectionMatrix();
    this.syncCamera(0, 0);
  }

  update(dt: number): void {
    const delta = this.input.consumeMouseDelta();
    this.yaw -= delta.dx * LOOK_SENSITIVITY;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - delta.dy * LOOK_SENSITIVITY,
      -1.45,
      1.45
    );

    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);

    let moveX = 0;
    let moveZ = 0;
    if (this.input.isDown('KeyW')) {
      moveX += forwardX;
      moveZ += forwardZ;
    }
    if (this.input.isDown('KeyS')) {
      moveX -= forwardX;
      moveZ -= forwardZ;
    }
    if (this.input.isDown('KeyD')) {
      moveX += rightX;
      moveZ += rightZ;
    }
    if (this.input.isDown('KeyA')) {
      moveX -= rightX;
      moveZ -= rightZ;
    }

    const moveLength = Math.hypot(moveX, moveZ);
    const sprinting =
      this.input.isDown('ShiftLeft') || this.input.isDown('ShiftRight');
    const maxSpeed = sprinting ? SPRINT_SPEED : WALK_SPEED;

    let targetX = 0;
    let targetZ = 0;
    if (moveLength > 0) {
      targetX = (moveX / moveLength) * maxSpeed;
      targetZ = (moveZ / moveLength) * maxSpeed;
    }

    const lambda = moveLength > 0 ? ACCEL_LAMBDA : ACCEL_LAMBDA * 1.4;
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetX, lambda, dt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetZ, lambda, dt);

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.resolveCollisions();

    if (this.input.consumePress('Space') && this.grounded) {
      this.verticalVelocity = JUMP_SPEED;
      this.grounded = false;
    }
    this.verticalVelocity -= GRAVITY * dt;
    this.position.y += this.verticalVelocity * dt;
    if (this.position.y <= EYE_HEIGHT) {
      this.position.y = EYE_HEIGHT;
      this.verticalVelocity = 0;
      this.grounded = true;
    }

    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const moving = horizontalSpeed > 0.4 && this.grounded;
    if (moving) {
      this.bobTime += dt * (5.2 + horizontalSpeed * 0.9);
      this.bobAmount = THREE.MathUtils.damp(
        this.bobAmount,
        Math.min(horizontalSpeed / SPRINT_SPEED, 1),
        8,
        dt
      );
    } else {
      this.bobAmount = THREE.MathUtils.damp(this.bobAmount, 0, 8, dt);
    }

    const bobY =
      this.grounded && moving
        ? Math.sin(this.bobTime * 2) * 0.032 * this.bobAmount
        : 0;
    const bobX = Math.cos(this.bobTime) * 0.02 * this.bobAmount;

    const targetFov =
      sprinting && horizontalSpeed > 1 ? SPRINT_FOV : BASE_FOV;
    this.currentFov = THREE.MathUtils.damp(this.currentFov, targetFov, 6, dt);
    if (Math.abs(this.camera.fov - this.currentFov) > 0.01) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }

    this.syncCamera(bobX * rightX, bobX * rightZ, bobY);
  }

  private syncCamera(offsetX: number, offsetZ: number, bobY = 0): void {
    this.camera.position.set(
      this.position.x + offsetX,
      this.position.y + bobY,
      this.position.z + offsetZ
    );
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  private resolveCollisions(): void {
    for (const box of this.colliders) {
      if (
        this.position.x + PLAYER_RADIUS <= box.minX ||
        this.position.x - PLAYER_RADIUS >= box.maxX ||
        this.position.z + PLAYER_RADIUS <= box.minZ ||
        this.position.z - PLAYER_RADIUS >= box.maxZ
      ) {
        continue;
      }

      const pushLeft = this.position.x + PLAYER_RADIUS - box.minX;
      const pushRight = box.maxX - (this.position.x - PLAYER_RADIUS);
      const pushBack = this.position.z + PLAYER_RADIUS - box.minZ;
      const pushFront = box.maxZ - (this.position.z - PLAYER_RADIUS);
      const smallest = Math.min(pushLeft, pushRight, pushBack, pushFront);

      if (smallest === pushLeft) {
        this.position.x -= pushLeft;
      } else if (smallest === pushRight) {
        this.position.x += pushRight;
      } else if (smallest === pushBack) {
        this.position.z -= pushBack;
      } else {
        this.position.z += pushFront;
      }
    }
  }
}
