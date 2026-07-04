import { clamp, indexAt } from '../engine/grid';
import type { Entity, GameSnapshot, Tile } from '../engine/types';

const TILE_COLORS: Record<Tile['kind'], string> = {
  wall: '#263037',
  floor: '#151a1d',
  stairs: '#203f3c',
};

export class CanvasRenderer {
  private context: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D is unavailable.');
    }

    this.context = context;
  }

  render(snapshot: GameSnapshot): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.max(320, rect.width);
    const displayHeight = Math.max(260, rect.height);
    this.canvas.width = Math.floor(displayWidth * dpr);
    this.canvas.height = Math.floor(displayHeight * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cell = Math.floor(Math.min(displayWidth / snapshot.width, displayHeight / snapshot.height));
    const cellSize = clamp(cell, 8, 22);
    const boardWidth = cellSize * snapshot.width;
    const boardHeight = cellSize * snapshot.height;
    const offsetX = Math.floor((displayWidth - boardWidth) / 2);
    const offsetY = Math.floor((displayHeight - boardHeight) / 2);

    this.context.fillStyle = '#0e1113';
    this.context.fillRect(0, 0, displayWidth, displayHeight);

    this.drawTiles(snapshot, cellSize, offsetX, offsetY);
    this.drawEntities(snapshot, cellSize, offsetX, offsetY);
    this.drawFacing(snapshot, cellSize, offsetX, offsetY);

    if (snapshot.gameOver) {
      this.drawOverlay(displayWidth, displayHeight, 'You died', 'Press Restart to enter a new dungeon.');
    }
  }

  private drawTiles(snapshot: GameSnapshot, cellSize: number, offsetX: number, offsetY: number): void {
    snapshot.tiles.forEach((tile, index) => {
      const x = index % snapshot.width;
      const y = Math.floor(index / snapshot.width);

      if (!tile.explored) {
        return;
      }

      this.context.fillStyle = tile.visible ? TILE_COLORS[tile.kind] : '#0f1316';
      this.context.fillRect(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, cellSize);

      if (tile.kind === 'stairs' && tile.visible) {
        this.context.fillStyle = '#6ee7b7';
        this.context.font = `${Math.floor(cellSize * 0.86)}px ui-monospace, SFMono-Regular, Consolas, monospace`;
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';
        this.context.fillText('>', offsetX + x * cellSize + cellSize / 2, offsetY + y * cellSize + cellSize / 2);
      }
    });
  }

  private drawEntities(snapshot: GameSnapshot, cellSize: number, offsetX: number, offsetY: number): void {
    const visibleEntities = snapshot.entities.filter((entity) => {
      const tile = snapshot.tiles[indexAt(entity.x, entity.y, snapshot.width)];
      return entity.kind === 'player' || tile.visible;
    });

    visibleEntities.sort((a, b) => entityLayer(a) - entityLayer(b));

    this.context.font = `${Math.floor(cellSize * 0.82)}px ui-monospace, SFMono-Regular, Consolas, monospace`;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';

    visibleEntities.forEach((entity) => {
      this.context.fillStyle = entity.color;
      this.context.fillText(entity.glyph, offsetX + entity.x * cellSize + cellSize / 2, offsetY + entity.y * cellSize + cellSize / 2);
    });
  }

  private drawFacing(snapshot: GameSnapshot, cellSize: number, offsetX: number, offsetY: number): void {
    const player = snapshot.entities.find((entity) => entity.id === snapshot.playerId);
    if (!player) {
      return;
    }

    const markerX = player.x + snapshot.player.facing.x;
    const markerY = player.y + snapshot.player.facing.y;
    if (markerX < 0 || markerY < 0 || markerX >= snapshot.width || markerY >= snapshot.height) {
      return;
    }

    const tile = snapshot.tiles[indexAt(markerX, markerY, snapshot.width)];
    if (!tile.visible) {
      return;
    }

    const centerX = offsetX + markerX * cellSize + cellSize / 2;
    const centerY = offsetY + markerY * cellSize + cellSize / 2;
    const radius = Math.max(2, cellSize * 0.16);
    this.context.beginPath();
    this.context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.context.fillStyle = 'rgba(125, 211, 252, 0.92)';
    this.context.fill();
  }

  private drawOverlay(width: number, height: number, title: string, subtitle: string): void {
    this.context.fillStyle = 'rgba(5, 8, 10, 0.72)';
    this.context.fillRect(0, 0, width, height);
    this.context.fillStyle = '#f8fafc';
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    this.context.font = '700 32px system-ui, sans-serif';
    this.context.fillText(title, width / 2, height / 2 - 18);
    this.context.font = '15px system-ui, sans-serif';
    this.context.fillStyle = '#cbd5e1';
    this.context.fillText(subtitle, width / 2, height / 2 + 22);
  }
}

const entityLayer = (entity: Entity) => {
  if (entity.kind === 'item') {
    return 1;
  }
  if (entity.kind === 'monster') {
    return 2;
  }
  return 3;
};
