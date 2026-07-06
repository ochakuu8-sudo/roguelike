import { indexAt } from '../engine/grid';
import type { CombatEffect, Entity, GameSnapshot, Tile } from '../engine/types';
import { BIOME_DEFINITIONS } from '../game/biomes';

const TILE_COLORS: Record<Tile['kind'], string> = {
  wall: '#26333a',
  floor: '#12181b',
  stairs: '#152f2d',
  ore: '#243247',
  forage: '#173325',
  crate: '#2d2117',
  device: '#1d1d34',
  locked: '#30251b',
};

const FIXED_CELL_SIZE = 15;
const COMBAT_EFFECT_DURATION = 520;
const COMBAT_EFFECT_STAGGER = COMBAT_EFFECT_DURATION;

type Camera = {
  cellSize: number;
  offsetX: number;
  offsetY: number;
  displayWidth: number;
  displayHeight: number;
};

type ActiveCombatEffect = CombatEffect & {
  progress: number;
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
  material: [
    '........',
    '..CC....',
    '.CDDC...',
    '.CDDC...',
    '..CC....',
    '........',
    '........',
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
  station: [
    '.EEEEEE.',
    'EFFFFFFE',
    'EF....FE',
    'EF....FE',
    'EF....FE',
    'EFFFFFFE',
    '.EEEEEE.',
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
  C: '#d9f99d',
  D: '#a16207',
  E: '#475569',
  F: '#cbd5e1',
};

export class CanvasRenderer {
  private context: CanvasRenderingContext2D;
  private snapshot?: GameSnapshot;
  private frameRequest = 0;
  private effectStartTimes = new Map<number, number>();
  private completedEffectIds = new Set<number>();

  constructor(private canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D is unavailable.');
    }

    this.context = context;
  }

  render(snapshot: GameSnapshot): void {
    this.snapshot = snapshot;
    this.renderFrame(snapshot, performance.now());
    this.scheduleAnimation();
  }

  private renderFrame(snapshot: GameSnapshot, now: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.max(320, rect.width);
    const displayHeight = Math.max(260, rect.height);
    this.canvas.width = Math.floor(displayWidth * dpr);
    this.canvas.height = Math.floor(displayHeight * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const camera = this.createCamera(snapshot, displayWidth, displayHeight);
    const combatEffects = this.activeCombatEffects(snapshot, now);

    this.context.fillStyle = '#0e1113';
    this.context.fillRect(0, 0, displayWidth, displayHeight);

    this.drawTiles(snapshot, camera);
    this.drawEntities(snapshot, camera, combatEffects);
    this.drawFacing(snapshot, camera);
    this.drawCombatEffects(combatEffects, camera);

    if (snapshot.gameOver) {
      this.drawOverlay(displayWidth, displayHeight, '倒れた', '再開ボタンで新しいダンジョンに挑戦できます。');
    }
  }

  private scheduleAnimation(): void {
    if (!this.snapshot || !this.hasActiveEffects(performance.now())) {
      if (this.frameRequest) {
        cancelAnimationFrame(this.frameRequest);
        this.frameRequest = 0;
      }
      return;
    }

    if (this.frameRequest) {
      return;
    }

    this.frameRequest = requestAnimationFrame((now) => {
      this.frameRequest = 0;
      if (!this.snapshot) {
        return;
      }

      this.renderFrame(this.snapshot, now);
      this.scheduleAnimation();
    });
  }

  private activeCombatEffects(snapshot: GameSnapshot, now: number): ActiveCombatEffect[] {
    const effectIds = new Set(snapshot.combatEffects.map((effect) => effect.id));
    const orderedEffects = [...snapshot.combatEffects].sort((a, b) => a.id - b.id);

    this.effectStartTimes.forEach((_, id) => {
      if (!effectIds.has(id)) {
        this.effectStartTimes.delete(id);
      }
    });

    this.completedEffectIds.forEach((id) => {
      if (!effectIds.has(id)) {
        this.completedEffectIds.delete(id);
      }
    });

    let previousStart: number | undefined;

    return orderedEffects.flatMap((effect) => {
      if (this.completedEffectIds.has(effect.id)) {
        return [];
      }

      let start = this.effectStartTimes.get(effect.id);
      if (start === undefined) {
        start = previousStart === undefined ? now : previousStart + COMBAT_EFFECT_STAGGER;
        this.effectStartTimes.set(effect.id, start);
      }

      previousStart = start;

      const progress = (now - start) / COMBAT_EFFECT_DURATION;
      if (progress < 0) {
        return [];
      }

      if (progress > 1) {
        this.effectStartTimes.delete(effect.id);
        this.completedEffectIds.add(effect.id);
        return [];
      }

      return [{ ...effect, progress }];
    });
  }

  private hasActiveEffects(now: number): boolean {
    return [...this.effectStartTimes.values()].some((start) => now <= start + COMBAT_EFFECT_DURATION);
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

      this.context.fillStyle = tile.visible ? tileColor(tile, snapshot) : '#0f1316';
      this.context.fillRect(left, top, cellSize, cellSize);
      this.drawTileTexture(tile, x, y, cellSize, offsetX, offsetY);

      if (tile.kind === 'stairs' && tile.visible) {
        this.drawSprite(SPRITES.stairs, left, top, cellSize, tile.visible ? 1 : 0.45);
      }
    });
  }

  private drawEntities(snapshot: GameSnapshot, camera: Camera, combatEffects: ActiveCombatEffect[]): void {
    const { cellSize, offsetX, offsetY } = camera;
    const visibleEntities = snapshot.entities.filter((entity) => {
      const tile = snapshot.tiles[indexAt(entity.x, entity.y, snapshot.width)];
      const left = offsetX + entity.x * cellSize;
      const top = offsetY + entity.y * cellSize;
      return (entity.kind === 'player' || tile.visible) && isInViewport(left, top, cellSize, camera);
    });

    visibleEntities.sort((a, b) => entityLayer(a) - entityLayer(b));

    visibleEntities.forEach((entity) => {
      this.drawEntity(entity, cellSize, offsetX, offsetY, combatEffects);
    });

    this.drawCombatGhosts(snapshot, camera, combatEffects, new Set(visibleEntities.map((entity) => entity.id)));
  }

  private drawCombatGhosts(snapshot: GameSnapshot, camera: Camera, combatEffects: ActiveCombatEffect[], visibleEntityIds: Set<string>): void {
    const ghosts = combatEffects.flatMap((effect) => [
      combatGhost(effect, 'attacker'),
      combatGhost(effect, 'defender'),
    ]);

    ghosts
      .filter((entity) => !visibleEntityIds.has(entity.id))
      .filter((entity) => {
        const left = camera.offsetX + entity.x * camera.cellSize;
        const top = camera.offsetY + entity.y * camera.cellSize;
        return isInViewport(left, top, camera.cellSize, camera) && snapshot.tiles[indexAt(entity.x, entity.y, snapshot.width)]?.explored;
      })
      .sort((a, b) => entityLayer(a) - entityLayer(b))
      .forEach((entity) => {
        this.drawEntity(entity, camera.cellSize, camera.offsetX, camera.offsetY, combatEffects);
      });
  }

  private drawTileTexture(tile: Tile, x: number, y: number, cellSize: number, offsetX: number, offsetY: number): void {
    if (!tile.visible) {
      return;
    }

    const left = offsetX + x * cellSize;
    const top = offsetY + y * cellSize;

    if (tile.kind === 'wall' || isGatheringTile(tile.kind)) {
      this.context.fillStyle = '#34434b';
      this.context.fillRect(left, top, cellSize, Math.max(1, Math.floor(cellSize * 0.16)));
      this.context.fillStyle = '#1d282e';
      this.context.fillRect(left, top + cellSize - Math.max(1, Math.floor(cellSize * 0.12)), cellSize, Math.max(1, Math.floor(cellSize * 0.12)));
      if (isGatheringTile(tile.kind)) {
        const chip = Math.max(1, Math.floor(cellSize * 0.16));
        this.context.fillStyle = gatheringAccent(tile.kind);
        this.context.fillRect(left + Math.floor(cellSize * 0.26), top + Math.floor(cellSize * 0.32), chip, chip);
        this.context.fillStyle = '#bfdbfe';
        this.context.fillRect(left + Math.floor(cellSize * 0.62), top + Math.floor(cellSize * 0.55), chip, chip);
      }
      return;
    }

    if ((x * 17 + y * 31) % 7 === 0) {
      const speck = Math.max(1, Math.floor(cellSize * 0.12));
      this.context.fillStyle = '#202a2f';
      this.context.fillRect(left + Math.floor(cellSize * 0.62), top + Math.floor(cellSize * 0.58), speck, speck);
    }
  }

  private drawEntity(entity: Entity, cellSize: number, offsetX: number, offsetY: number, combatEffects: ActiveCombatEffect[]): void {
    const attackEffect = combatEffects.find((effect) => effect.attackerId === entity.id && effect.progress < 0.4);
    const hitEffect = combatEffects.find((effect) => effect.defenderId === entity.id && effect.progress < 0.72);
    const attackPulse = attackEffect ? Math.sin((attackEffect.progress / 0.4) * Math.PI) : 0;
    const hitPulse = hitEffect ? 1 - hitEffect.progress / 0.72 : 0;
    const dx = attackEffect ? Math.sign(attackEffect.to.x - attackEffect.from.x) : 0;
    const dy = attackEffect ? Math.sign(attackEffect.to.y - attackEffect.from.y) : 0;
    const shake = hitEffect ? Math.sin(hitEffect.progress * Math.PI * 12) * cellSize * 0.07 * hitPulse : 0;
    const left = offsetX + entity.x * cellSize + dx * cellSize * 0.22 * attackPulse + shake;
    const top = offsetY + entity.y * cellSize + dy * cellSize * 0.22 * attackPulse;
    const sprite = spriteFor(entity);
    const shadowHeight = Math.max(1, Math.floor(cellSize * 0.12));

    this.context.fillStyle = 'rgba(0, 0, 0, 0.32)';
    this.context.fillRect(left + cellSize * 0.22, top + cellSize * 0.78, cellSize * 0.56, shadowHeight);
    this.drawSprite(sprite, left, top, cellSize, 1);
    if (entity.kind === 'monster') {
      this.drawEnemyHealthBar(entity, left, top, cellSize);
    }
    if (entity.kind === 'station') {
      this.drawStationGlyph(entity, left, top, cellSize);
    }

    if (hitEffect) {
      this.context.save();
      this.context.globalAlpha = Math.max(0, 0.5 * hitPulse);
      this.context.fillStyle = '#fb7185';
      this.context.fillRect(left + 1, top + 1, cellSize - 2, cellSize - 2);
      this.context.restore();
    }
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

  private drawCombatEffects(effects: ActiveCombatEffect[], camera: Camera): void {
    effects.forEach((effect) => {
      const from = tileCenter(effect.from, camera);
      const to = tileCenter(effect.to, camera);

      if (!isInViewport(to.x - camera.cellSize / 2, to.y - camera.cellSize / 2, camera.cellSize, camera)) {
        return;
      }

      const slashProgress = Math.min(1, effect.progress / 0.45);
      const slashAlpha = Math.max(0, 1 - effect.progress / 0.55);
      const midX = from.x + (to.x - from.x) * 0.72;
      const midY = from.y + (to.y - from.y) * 0.72;
      const tipX = from.x + (to.x - from.x) * slashProgress;
      const tipY = from.y + (to.y - from.y) * slashProgress;

      this.context.save();
      this.context.lineCap = 'round';
      this.context.globalAlpha = slashAlpha;
      this.context.strokeStyle = effect.attackerKind === 'player' ? '#f8fafc' : '#fb7185';
      this.context.lineWidth = Math.max(2, camera.cellSize * 0.18);
      this.context.beginPath();
      this.context.moveTo(midX, midY);
      this.context.lineTo(tipX, tipY);
      this.context.stroke();

      this.context.globalAlpha = Math.max(0, 1 - effect.progress);
      this.context.fillStyle = effect.defenderKind === 'player' ? '#fb7185' : '#fbbf24';
      this.context.strokeStyle = 'rgba(2, 8, 12, 0.9)';
      this.context.lineWidth = 3;
      this.context.font = `800 ${Math.max(11, Math.floor(camera.cellSize * 0.88))}px system-ui, sans-serif`;
      this.context.textAlign = 'center';
      this.context.textBaseline = 'middle';
      const lift = easeOut(effect.progress) * camera.cellSize * 1.15;
      const textX = to.x;
      const textY = to.y - camera.cellSize * 0.42 - lift;
      const text = `-${effect.damage}`;
      this.context.strokeText(text, textX, textY);
      this.context.fillText(text, textX, textY);
      this.context.restore();
    });
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

  private drawStationGlyph(entity: Entity, left: number, top: number, cellSize: number): void {
    this.context.save();
    this.context.font = `800 ${Math.max(8, Math.floor(cellSize * 0.62))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    this.context.lineWidth = 2;
    this.context.strokeStyle = 'rgba(2, 8, 12, 0.9)';
    this.context.fillStyle = entity.color;
    this.context.strokeText(entity.glyph, left + cellSize / 2, top + cellSize / 2);
    this.context.fillText(entity.glyph, left + cellSize / 2, top + cellSize / 2);
    this.context.restore();
  }

  private drawEnemyHealthBar(entity: Entity, left: number, top: number, cellSize: number): void {
    if (!entity.stats || entity.stats.maxHp <= 0 || entity.stats.hp >= entity.stats.maxHp) {
      return;
    }

    const ratio = Math.max(0, Math.min(1, entity.stats.hp / entity.stats.maxHp));
    const width = Math.max(8, Math.floor(cellSize * 0.72));
    const height = Math.max(2, Math.floor(cellSize * 0.13));
    const x = Math.floor(left + (cellSize - width) / 2);
    const y = Math.floor(top + Math.max(1, cellSize * 0.04));

    this.context.save();
    this.context.fillStyle = 'rgba(3, 7, 10, 0.78)';
    this.context.fillRect(x - 1, y - 1, width + 2, height + 2);
    this.context.fillStyle = 'rgba(80, 97, 108, 0.9)';
    this.context.fillRect(x, y, width, height);
    this.context.fillStyle = ratio > 0.45 ? '#fbbf24' : '#fb7185';
    this.context.fillRect(x, y, Math.max(1, Math.floor(width * ratio)), height);
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
  if (entity.kind === 'station') {
    return 1;
  }
  if (entity.kind === 'monster') {
    return 2;
  }
  return 3;
};

const isInViewport = (left: number, top: number, cellSize: number, camera: Camera) =>
  left + cellSize >= 0 && top + cellSize >= 0 && left <= camera.displayWidth && top <= camera.displayHeight;

const tileCenter = (point: { x: number; y: number }, camera: Camera) => ({
  x: camera.offsetX + point.x * camera.cellSize + camera.cellSize / 2,
  y: camera.offsetY + point.y * camera.cellSize + camera.cellSize / 2,
});

const easeOut = (value: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, value)), 3);

const isGatheringTile = (kind: Tile['kind']) =>
  kind === 'ore' || kind === 'forage' || kind === 'crate' || kind === 'device' || kind === 'locked';

const tileColor = (tile: Tile, snapshot: GameSnapshot) => {
  const biomeId = tile.biome ?? snapshot.biome;
  const biome = biomeId ? BIOME_DEFINITIONS[biomeId] : null;
  if (biome && tile.kind === 'floor') {
    return biome.floorColor;
  }

  if (biome && tile.kind === 'wall') {
    return biome.wallColor;
  }

  return TILE_COLORS[tile.kind];
};

const gatheringAccent = (kind: Tile['kind']) => {
  if (kind === 'forage') {
    return '#86efac';
  }
  if (kind === 'crate' || kind === 'locked') {
    return '#fbbf24';
  }
  if (kind === 'device') {
    return '#c4b5fd';
  }
  return '#60a5fa';
};

const combatGhost = (effect: CombatEffect, role: 'attacker' | 'defender'): Entity => {
  const isAttacker = role === 'attacker';
  const kind = isAttacker ? effect.attackerKind : effect.defenderKind;
  const name = isAttacker ? effect.attackerName : effect.defenderName;
  const point = isAttacker ? effect.from : effect.to;

  return {
    id: isAttacker ? effect.attackerId : effect.defenderId,
    kind,
    name,
    glyph: glyphFor(kind, name),
    color: colorFor(kind, name),
    x: point.x,
    y: point.y,
    blocks: false,
  };
};

const glyphFor = (kind: Entity['kind'], name: string) => {
  if (kind === 'player') {
    return '@';
  }
  if (kind === 'item') {
    return '!';
  }
  if (kind === 'station') {
    return '?';
  }
  return name.includes('ノール') ? 'G' : 'i';
};

const colorFor = (kind: Entity['kind'], name: string) => {
  if (kind === 'player') {
    return '#e8f6ff';
  }
  if (kind === 'item') {
    return '#7dd3fc';
  }
  if (kind === 'station') {
    return '#cbd5e1';
  }
  return name.includes('ノール') ? '#f0a95b' : '#d97878';
};

const spriteFor = (entity: Entity) => {
  if (entity.kind === 'player') {
    return SPRITES.player;
  }
  if (entity.kind === 'item') {
    return entity.item === 'potion' ? SPRITES.potion : SPRITES.material;
  }
  if (entity.kind === 'station') {
    return SPRITES.station;
  }
  if (entity.name.includes('ノール')) {
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
