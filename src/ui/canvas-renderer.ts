import { clamp, indexAt } from '../engine/grid';
import type { Entity, GameSnapshot, Tile } from '../engine/types';

const TILE_COLORS: Record<Tile['kind'], string> = {
  wall: '#26333a',
  floor: '#12181b',
  stairs: '#152f2d',
};

const SPRITES = {
  player: [
    '..222...',
    '..222...',
    '..111...',
    '.11111..',
    '3.111.3.',
    '..111...',
    '..1.1...',
    '.11.11..',
  ],
  imp: [
    '4....4..',
    '.4444...',
    '454454..',
    '.4444...',
    '..44....',
    '.4..4...',
    '4....4..',
    '........',
  ],
  gnoll: [
    '..666...',
    '.67776..',
    '6777776.',
    '.75557..',
    '..777...',
    '.7.7.7..',
    '6..6..6.',
    '........',
  ],
  potion: [
    '..888...',
    '...8....',
    '..999...',
    '.99999..',
    '.9AAA9..',
    '.9AAA9..',
    '..999...',
    '........',
  ],
  stairs: [
    '........',
    '....BB..',
    '...BB...',
    '..BB....',
    '.BB.....',
    'BBBBBB..',
    '........',
    '........',
  ],
} as const;

const PALETTE: Record<string, string> = {
  '1': '#d8ecf4',
  '2': '#88cfe8',
  '3': '#f0b46b',
  '4': '#ce5f66',
  '5': '#ffe0df',
  '6': '#a86f3f',
  '7': '#e2a45e',
  '8': '#c7ecff',
  '9': '#5fc6e8',
  A: '#2b7fb3',
  B: '#6ee7b7',
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
      this.drawTileTexture(tile, x, y, cellSize, offsetX, offsetY);

      if (tile.kind === 'stairs' && tile.visible) {
        this.drawSprite(SPRITES.stairs, offsetX + x * cellSize, offsetY + y * cellSize, cellSize, tile.visible ? 1 : 0.45);
      }
    });
  }

  private drawEntities(snapshot: GameSnapshot, cellSize: number, offsetX: number, offsetY: number): void {
    const visibleEntities = snapshot.entities.filter((entity) => {
      const tile = snapshot.tiles[indexAt(entity.x, entity.y, snapshot.width)];
      return entity.kind === 'player' || tile.visible;
    });

    visibleEntities.sort((a, b) => entityLayer(a) - entityLayer(b));

    visibleEntities.forEach((entity) => {
      this.drawEntity(entity, cellSize, offsetX, offsetY);
    });
  }

  private drawTileTexture(tile: Tile, x: number, y: number, cellSize: number, offsetX: number, offsetY: number): void {
    if (!tile.visible) {
      return;
    }

    const left = offsetX + x * cellSize;
    const top = offsetY + y * cellSize;

    if (tile.kind === 'wall') {
      this.context.fillStyle = '#34434b';
      this.context.fillRect(left, top, cellSize, Math.max(1, Math.floor(cellSize * 0.16)));
      this.context.fillStyle = '#1d282e';
      this.context.fillRect(left, top + cellSize - Math.max(1, Math.floor(cellSize * 0.12)), cellSize, Math.max(1, Math.floor(cellSize * 0.12)));
      return;
    }

    if ((x * 17 + y * 31) % 7 === 0) {
      const speck = Math.max(1, Math.floor(cellSize * 0.12));
      this.context.fillStyle = '#202a2f';
      this.context.fillRect(left + Math.floor(cellSize * 0.62), top + Math.floor(cellSize * 0.58), speck, speck);
    }
  }

  private drawEntity(entity: Entity, cellSize: number, offsetX: number, offsetY: number): void {
    const left = offsetX + entity.x * cellSize;
    const top = offsetY + entity.y * cellSize;
    const sprite = spriteFor(entity);
    const shadowHeight = Math.max(1, Math.floor(cellSize * 0.12));

    this.context.fillStyle = 'rgba(0, 0, 0, 0.32)';
    this.context.fillRect(left + cellSize * 0.22, top + cellSize * 0.78, cellSize * 0.56, shadowHeight);
    this.drawSprite(sprite, left, top, cellSize, 1);
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
    const size = Math.max(3, Math.floor(cellSize * 0.28));
    this.context.fillStyle = 'rgba(125, 211, 252, 0.9)';
    this.context.fillRect(Math.floor(centerX - size / 2), Math.floor(centerY - size / 2), size, size);
  }

  private drawSprite(sprite: readonly string[], left: number, top: number, cellSize: number, alpha: number): void {
    const pixel = Math.max(1, Math.floor(cellSize / 8));
    const spriteSize = pixel * 8;
    const spriteLeft = Math.floor(left + (cellSize - spriteSize) / 2);
    const spriteTop = Math.floor(top + (cellSize - spriteSize) / 2);

    this.context.save();
    this.context.globalAlpha = alpha;
    sprite.forEach((row, y) => {
      [...row].forEach((code, x) => {
        if (code === '.') {
          return;
        }

        this.context.fillStyle = PALETTE[code] ?? '#ffffff';
        this.context.fillRect(spriteLeft + x * pixel, spriteTop + y * pixel, pixel, pixel);
      });
    });
    this.context.restore();
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

const spriteFor = (entity: Entity) => {
  if (entity.kind === 'player') {
    return SPRITES.player;
  }
  if (entity.kind === 'item') {
    return SPRITES.potion;
  }
  if (entity.name.includes('Gnoll')) {
    return SPRITES.gnoll;
  }
  return SPRITES.imp;
};
