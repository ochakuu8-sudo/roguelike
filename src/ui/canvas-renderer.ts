import { indexAt } from '../engine/grid';
import type { Entity, GameSnapshot, Tile } from '../engine/types';

const TILE_COLORS: Record<Tile['kind'], string> = {
  wall: '#26333a',
  floor: '#12181b',
  stairs: '#152f2d',
};

const FIXED_CELL_SIZE = 15;

type Camera = {
  cellSize: number;
  offsetX: number;
  offsetY: number;
  displayWidth: number;
  displayHeight: number;
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

    const camera = this.createCamera(snapshot, displayWidth, displayHeight);

    this.context.fillStyle = '#0e1113';
    this.context.fillRect(0, 0, displayWidth, displayHeight);

    this.drawTiles(snapshot, camera);
    this.drawEntities(snapshot, camera);
    this.drawFacing(snapshot, camera);

    if (snapshot.gameOver) {
      this.drawOverlay(displayWidth, displayHeight, 'You died', 'Press Restart to enter a new dungeon.');
    }
  }

  private createCamera(snapshot: GameSnapshot, displayWidth: number, displayHeight: number): Camera {
    const player = snapshot.entities.find((entity) => entity.id === snapshot.playerId);
    const cellSize = FIXED_CELL_SIZE;
    const focusX = player?.x ?? Math.floor(snapshot.width / 2);
    const focusY = player?.y ?? Math.floor(snapshot.height / 2);
    const offsetX = Math.floor(displayWidth / 2 - (focusX + 0.5) * cellSize);
    const offsetY = Math.floor(displayHeight / 2 - (focusY + 0.5) * cellSize);

    return { cellSize, offsetX, offsetY, displayWidth, displayHeight };
  }

  private drawTiles(snapshot: GameSnapshot, camera: Camera): void {
    const { cellSize, offsetX, offsetY } = camera;
    snapshot.tiles.forEach((tile, index) => {
      const x = index % snapshot.width;
      const y = Math.floor(index / snapshot.width);
      const left = offsetX + x * cellSize;
      const top = offsetY + y * cellSize;

      if (!tile.explored || !isInViewport(left, top, cellSize, camera)) {
        return;
      }

      this.context.fillStyle = tile.visible ? TILE_COLORS[tile.kind] : '#0f1316';
      this.context.fillRect(left, top, cellSize, cellSize);
      this.drawTileTexture(tile, x, y, cellSize, offsetX, offsetY);

      if (tile.kind === 'stairs' && tile.visible) {
        this.drawSprite(SPRITES.stairs, left, top, cellSize, tile.visible ? 1 : 0.45);
      }
    });
  }

  private drawEntities(snapshot: GameSnapshot, camera: Camera): void {
    const { cellSize, offsetX, offsetY } = camera;
    const visibleEntities = snapshot.entities.filter((entity) => {
      const tile = snapshot.tiles[indexAt(entity.x, entity.y, snapshot.width)];
      const left = offsetX + entity.x * cellSize;
      const top = offsetY + entity.y * cellSize;
      return (entity.kind === 'player' || tile.visible) && isInViewport(left, top, cellSize, camera);
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

  private drawFacing(snapshot: GameSnapshot, camera: Camera): void {
    const { cellSize, offsetX, offsetY } = camera;
    const player = snapshot.entities.find((entity) => entity.id === snapshot.playerId);
    if (!player) {
      return;
    }

    const targetX = player.x + snapshot.player.facing.x;
    const targetY = player.y + snapshot.player.facing.y;
    if (targetX < 0 || targetY < 0 || targetX >= snapshot.width || targetY >= snapshot.height) {
      return;
    }

    const targetLeft = offsetX + targetX * cellSize;
    const targetTop = offsetY + targetY * cellSize;
    const centerX = targetLeft + cellSize / 2;
    const centerY = targetTop + cellSize / 2;
    const dx = snapshot.player.facing.x;
    const dy = snapshot.player.facing.y;
    const markerSize = Math.max(4, Math.floor(cellSize * 0.2));
    const distance = Math.max(4, Math.floor(cellSize * 0.34));
    const tipX = centerX - dx * distance;
    const tipY = centerY - dy * distance;

    const points = directionTriangle(tipX, tipY, dx, dy, markerSize);
    this.context.beginPath();
    this.context.moveTo(points[0].x, points[0].y);
    this.context.lineTo(points[1].x, points[1].y);
    this.context.lineTo(points[2].x, points[2].y);
    this.context.closePath();
    this.context.fillStyle = 'rgba(125, 211, 252, 0.95)';
    this.context.fill();
    this.context.strokeStyle = 'rgba(2, 8, 12, 0.8)';
    this.context.lineWidth = 1;
    this.context.stroke();
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

const isInViewport = (left: number, top: number, cellSize: number, camera: Camera) =>
  left + cellSize >= 0 && top + cellSize >= 0 && left <= camera.displayWidth && top <= camera.displayHeight;

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

const directionTriangle = (tipX: number, tipY: number, dx: number, dy: number, size: number) => {
  const length = Math.hypot(dx, dy) || 1;
  const nx = dx / length;
  const ny = dy / length;
  const px = -ny;
  const py = nx;
  const baseX = tipX - nx * size;
  const baseY = tipY - ny * size;
  const half = size * 0.58;

  return [
    { x: tipX, y: tipY },
    { x: baseX + px * half, y: baseY + py * half },
    { x: baseX - px * half, y: baseY - py * half },
  ];
};
