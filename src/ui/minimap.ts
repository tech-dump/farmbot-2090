import { LOCATIONS } from "../nav/locations";
import { LAKE_INFO } from "../world/landscape";
import { ROADS } from "../world/roads";
import { KIND_COLORS, type MapState } from "./mapTypes";

const RANGE = 150;

export class Minimap {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Minimap requires a 2D canvas context.");
    }
    this.context = context;
  }

  draw(state: MapState): void {
    const ctx = this.context;
    const size = this.canvas.width;
    const center = size / 2;
    const scale = (center - 10) / RANGE;
    const toX = (x: number): number => center + (x - state.playerX) * scale;
    const toY = (z: number): number => center + (z - state.playerZ) * scale;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, center - 6, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = "#1c241a";
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = "#24424a";
    ctx.beginPath();
    ctx.arc(toX(LAKE_INFO.x), toY(LAKE_INFO.z), LAKE_INFO.radius * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const road of ROADS) {
      ctx.strokeStyle = road.surface === "asphalt" ? "#5d5f58" : "#6d5638";
      ctx.lineWidth = Math.max(1.4, road.width * scale * 0.85);
      ctx.beginPath();
      road.points.forEach((point, index) => {
        const x = toX(point[0]);
        const y = toY(point[1]);
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }

    if (state.route.length > 1) {
      ctx.strokeStyle = "#d8ff9e";
      ctx.lineWidth = 2.4;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      state.route.forEach((point, index) => {
        const x = toX(point.x);
        const y = toY(point.z);
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const location of LOCATIONS) {
      if (!state.discovered.has(location.id)) {
        continue;
      }
      const x = toX(location.x);
      const y = toY(location.z);
      if (x < 0 || y < 0 || x > size || y > size) {
        continue;
      }
      ctx.fillStyle = KIND_COLORS[location.kind];
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(8, 12, 8, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    for (const vehicle of state.vehicles) {
      if (vehicle.active) {
        continue;
      }
      const x = toX(vehicle.x);
      const y = toY(vehicle.z);
      if (x < 0 || y < 0 || x > size || y > size) {
        continue;
      }
      ctx.fillStyle = "#e8e2cf";
      ctx.fillRect(x - 3, y - 3, 6, 6);
    }

    if (state.waypoint) {
      let dx = (state.waypoint.x - state.playerX) * scale;
      let dy = (state.waypoint.z - state.playerZ) * scale;
      const distance = Math.hypot(dx, dy);
      const limit = center - 18;
      if (distance > limit) {
        dx = (dx / distance) * limit;
        dy = (dy / distance) * limit;
      }
      this.drawStar(ctx, center + dx, center + dy, 7, "#f2ffca");
    }

    const angle = Math.atan2(Math.sin(state.playerYaw), -Math.cos(state.playerYaw));
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle);
    ctx.fillStyle = "#d8ff9e";
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(8, 9);
    ctx.lineTo(0, 5);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#0b110a";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.restore();

    ctx.strokeStyle = "rgba(216, 255, 158, 0.35)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(center, center, center - 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let point = 0; point < 10; point += 1) {
      const angle = (Math.PI / 5) * point - Math.PI / 2;
      const length = point % 2 === 0 ? radius : radius * 0.45;
      const px = Math.cos(angle) * length;
      const py = Math.sin(angle) * length;
      if (point === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
