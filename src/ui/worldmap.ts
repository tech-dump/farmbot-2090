import { LOCATIONS } from "../nav/locations";
import { WORLD_HALF, WORLD_SIZE } from "../core/constants";
import { LAKE_INFO } from "../world/landscape";
import { ROADS } from "../world/roads";
import { KIND_COLORS, type MapState } from "./mapTypes";

const PAD = 52;
const SCALE = (1024 - PAD * 2) / WORLD_SIZE;

export interface WorldMapCallbacks {
  onWaypoint: (x: number, z: number, label: string) => void;
  onClose: () => void;
}

export class WorldMap {
  readonly overlay: HTMLDivElement;

  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly callbacks: WorldMapCallbacks;
  private state: MapState | null = null;

  constructor(root: HTMLElement, callbacks: WorldMapCallbacks) {
    this.callbacks = callbacks;
    const overlay = document.createElement("div");
    overlay.className = "map-screen";
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="map-panel">
        <header class="map-header">
          <div>
            <p class="eyebrow">KIJANI BASIN AUTHORITY // SURVEY 2090</p>
            <h2>WORLD MAP</h2>
          </div>
          <button class="map-close" type="button">CLOSE <kbd>M</kbd></button>
        </header>
        <div class="map-canvas-wrap">
          <canvas class="map-canvas" width="1024" height="1024"></canvas>
        </div>
        <footer class="map-footer">
          <div class="map-legend">
            <span><i style="background:#9bd45a"></i>Farm</span>
            <span><i style="background:#e2a45a"></i>Village</span>
            <span><i style="background:#8cc7d8"></i>Research</span>
            <span><i style="background:#b28ce8"></i>TerraNova</span>
            <span><i style="background:#66c4d8"></i>Water</span>
            <span><i style="background:#d8ff9e"></i>Waypoint</span>
          </div>
          <p>Click the map to set a GPS waypoint. Press M or Esc to close.</p>
        </footer>
      </div>
    `;
    root.appendChild(overlay);
    this.overlay = overlay;

    const canvas = overlay.querySelector<HTMLCanvasElement>(".map-canvas");
    if (!canvas) {
      throw new Error("World map canvas is missing.");
    }
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("World map requires a 2D canvas context.");
    }
    this.canvas = canvas;
    this.context = context;

    const closeButton = overlay.querySelector<HTMLButtonElement>(".map-close");
    closeButton?.addEventListener("click", () => this.callbacks.onClose());
    canvas.addEventListener("click", (event) => this.handleClick(event));
  }

  setVisible(visible: boolean): void {
    this.overlay.hidden = !visible;
  }

  draw(state: MapState): void {
    this.state = state;
    const ctx = this.context;
    const size = this.canvas.width;
    const toX = (x: number): number => PAD + (x + WORLD_HALF) * SCALE;
    const toY = (z: number): number => PAD + (z + WORLD_HALF) * SCALE;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#1b231a";
    ctx.fillRect(0, 0, size, size);

    const glow = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.72);
    glow.addColorStop(0, "rgba(120, 150, 90, 0.10)");
    glow.addColorStop(1, "rgba(8, 12, 8, 0.55)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    for (const location of LOCATIONS) {
      const radius = Math.max(40, location.flatten) * SCALE * 1.5;
      const region = ctx.createRadialGradient(
        toX(location.x),
        toY(location.z),
        0,
        toX(location.x),
        toY(location.z),
        radius,
      );
      region.addColorStop(0, `${KIND_COLORS[location.kind]}33`);
      region.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = region;
      ctx.fillRect(toX(location.x) - radius, toY(location.z) - radius, radius * 2, radius * 2);
    }

    // Lake.
    ctx.fillStyle = "#2b5661";
    ctx.beginPath();
    ctx.arc(toX(LAKE_INFO.x), toY(LAKE_INFO.z), LAKE_INFO.radius * SCALE, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(150, 220, 230, 0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Survey grid.
    ctx.strokeStyle = "rgba(230, 255, 210, 0.055)";
    ctx.lineWidth = 1;
    for (let step = -600; step <= 600; step += 200) {
      ctx.beginPath();
      ctx.moveTo(toX(step), toY(-600));
      ctx.lineTo(toX(step), toY(600));
      ctx.moveTo(toX(-600), toY(step));
      ctx.lineTo(toX(600), toY(step));
      ctx.stroke();
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const road of ROADS) {
      const drawRoad = (width: number, color: string): void => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
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
      };
      drawRoad((road.width + 4) * SCALE, "rgba(8, 10, 8, 0.9)");
      drawRoad(road.width * SCALE, road.surface === "asphalt" ? "#67675e" : "#7a5d3a");
      if (road.id === "highway") {
        ctx.strokeStyle = "rgba(232, 214, 150, 0.7)";
        ctx.lineWidth = 2;
        ctx.setLineDash([14, 14]);
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
        ctx.setLineDash([]);
      }
    }

    if (state.route.length > 1) {
      ctx.save();
      ctx.strokeStyle = "#d8ff9e";
      ctx.shadowColor = "rgba(216, 255, 158, 0.7)";
      ctx.shadowBlur = 12;
      ctx.lineWidth = 4;
      ctx.setLineDash([16, 12]);
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
      ctx.restore();
      ctx.setLineDash([]);
    }

    for (const vehicle of state.vehicles) {
      if (vehicle.active) {
        continue;
      }
      ctx.fillStyle = "#e7e0cc";
      ctx.fillRect(toX(vehicle.x) - 5, toY(vehicle.z) - 5, 10, 10);
      ctx.strokeStyle = "rgba(10, 14, 10, 0.9)";
      ctx.lineWidth = 2;
      ctx.strokeRect(toX(vehicle.x) - 5, toY(vehicle.z) - 5, 10, 10);
    }

    for (const location of LOCATIONS) {
      const known = state.discovered.has(location.id);
      const x = toX(location.x);
      const y = toY(location.z);
      ctx.beginPath();
      ctx.arc(x, y, known ? 11 : 9, 0, Math.PI * 2);
      ctx.fillStyle = known ? KIND_COLORS[location.kind] : "rgba(90, 100, 80, 0.55)";
      ctx.fill();
      ctx.strokeStyle = known ? "rgba(10, 16, 10, 0.95)" : "rgba(170, 190, 160, 0.35)";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.font = known ? "bold 23px Arial, sans-serif" : "20px Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = known ? "#e9f3d9" : "rgba(200, 210, 190, 0.45)";
      const label = known ? location.short : "UNSURVEYED";
      const labelWidth = ctx.measureText(label).width;
      const labelX = Math.max(PAD, Math.min(x + 18, size - PAD - labelWidth));
      ctx.fillText(label, labelX, y + 1);
    }

    if (state.waypoint) {
      this.drawStar(ctx, toX(state.waypoint.x), toY(state.waypoint.z), 14, "#e9ffbe");

      const label = `GPS · ${state.waypoint.label.toUpperCase()}`;
      ctx.font = "bold 21px Arial, sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      const labelWidth = ctx.measureText(label).width;
      const boxWidth = labelWidth + 44;
      ctx.fillStyle = "rgba(10, 16, 10, 0.85)";
      ctx.fillRect((size - boxWidth) / 2, 14, boxWidth, 30);
      ctx.strokeStyle = "rgba(216, 255, 158, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect((size - boxWidth) / 2, 14, boxWidth, 30);
      ctx.fillStyle = "#e9ffbe";
      ctx.fillText(label, size / 2, 30);
    }

    const angle = Math.atan2(Math.sin(state.playerYaw), -Math.cos(state.playerYaw));
    ctx.save();
    ctx.translate(toX(state.playerX), toY(state.playerZ));
    ctx.rotate(angle);
    ctx.fillStyle = "#f6ffe4";
    ctx.strokeStyle = "#0c120a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(11, 12);
    ctx.lineTo(0, 6);
    ctx.lineTo(-11, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Compass rose and scale bar.
    ctx.save();
    ctx.translate(size - 86, 86);
    ctx.strokeStyle = "rgba(220, 240, 205, 0.5)";
    ctx.fillStyle = "rgba(220, 240, 205, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(7, 6);
    ctx.lineTo(0, 0);
    ctx.lineTo(-7, 6);
    ctx.closePath();
    ctx.fill();
    ctx.font = "bold 17px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("N", 0, 40);
    ctx.restore();

    ctx.strokeStyle = "rgba(230, 245, 215, 0.8)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(64, size - 62);
    ctx.lineTo(64 + 200 * SCALE, size - 62);
    ctx.stroke();
    ctx.font = "bold 19px Arial, sans-serif";
    ctx.fillStyle = "rgba(230, 245, 215, 0.85)";
    ctx.textAlign = "left";
    ctx.fillText("200 m", 64, size - 34);
  }

  private drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.shadowColor = "rgba(216, 255, 158, 0.9)";
    ctx.shadowBlur = 14;
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

  private handleClick(event: MouseEvent): void {
    const state = this.state;
    if (!state) {
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const pixelX = ((event.clientX - rect.left) / rect.width) * this.canvas.width;
    const pixelY = ((event.clientY - rect.top) / rect.height) * this.canvas.height;
    let x = (pixelX - PAD) / SCALE - WORLD_HALF;
    let z = (pixelY - PAD) / SCALE - WORLD_HALF;
    x = Math.max(-WORLD_HALF + 10, Math.min(WORLD_HALF - 10, x));
    z = Math.max(-WORLD_HALF + 10, Math.min(WORLD_HALF - 10, z));

    let label = "Custom waypoint";
    let bestDistance = 34;
    for (const location of LOCATIONS) {
      const distance = Math.hypot(location.x - x, location.z - z);
      if (distance < bestDistance) {
        bestDistance = distance;
        x = location.x;
        z = location.z;
        label = state.discovered.has(location.id) ? location.name : "Unsurveyed site";
      }
    }

    this.callbacks.onWaypoint(x, z, label);
  }
}
