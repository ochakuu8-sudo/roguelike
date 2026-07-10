import { indexAt } from '../engine/grid';
import type { BiomeId, CombatEffect, EnemyKind, Entity, GameSnapshot, ItemKind, StationKind, Tile } from '../engine/types';
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

const FIXED_CELL_SIZE = 24;
const COMBAT_EFFECT_DURATION = 520;
const COMBAT_EFFECT_STAGGER = COMBAT_EFFECT_DURATION;
const SPRITE_RESOLUTION = 32;

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

type Shape =
  | { t: 'r'; x: number; y: number; w: number; h: number; c: string }
  | { t: 'c'; x: number; y: number; r: number; c: string };

const R = (x: number, y: number, w: number, h: number, c: string): Shape => ({ t: 'r', x, y, w, h, c });
const C = (x: number, y: number, r: number, c: string): Shape => ({ t: 'c', x, y, r, c });

// Every sprite is a short list of flat rectangles/circles drawn in a 32x32
// unit space. Kept deliberately simple (a handful of big, high-contrast
// shapes) so each icon reads clearly at small on-screen sizes.
export const SPRITE_SHAPES = {
  player: [
    C(16, 9, 5, '#f2c9a0'),
    R(9, 14, 14, 10, '#2563eb'),
    R(9, 21, 14, 3, '#facc15'),
    R(10, 24, 5, 6, '#1e293b'),
    R(17, 24, 5, 6, '#1e293b'),
  ],
  imp: [
    C(16, 17, 8, '#dc2626'),
    R(11, 7, 3, 6, '#7f1d1d'),
    R(18, 7, 3, 6, '#7f1d1d'),
    R(12, 15, 3, 3, '#fde047'),
    R(17, 15, 3, 3, '#fde047'),
  ],
  beetle: [
    C(16, 17, 9, '#65a30d'),
    R(7, 15, 18, 3, '#365314'),
    R(5, 13, 4, 2, '#365314'),
    R(23, 13, 4, 2, '#365314'),
    R(5, 20, 4, 2, '#365314'),
    R(23, 20, 4, 2, '#365314'),
  ],
  gnoll: [
    R(8, 10, 16, 16, '#c2703d'),
    C(16, 8, 6, '#c2703d'),
    R(12, 9, 2, 4, '#f8fafc'),
    R(18, 9, 2, 4, '#f8fafc'),
    R(8, 20, 16, 3, '#4b3621'),
  ],
  bat: [
    R(3, 12, 11, 8, '#a855f7'),
    R(18, 12, 11, 8, '#a855f7'),
    C(16, 17, 6, '#7e22ce'),
    R(14, 15, 2, 2, '#fde047'),
    R(17, 15, 2, 2, '#fde047'),
  ],
  slime: [
    C(16, 19, 10, '#22d3ee'),
    C(12, 15, 3, '#a5f3fc'),
    R(7, 24, 18, 3, '#0e7490'),
  ],
  herbEater: [
    C(16, 17, 9, '#4ade80'),
    R(11, 19, 10, 4, '#166534'),
    R(12, 13, 3, 3, '#052e16'),
    R(17, 13, 3, 3, '#052e16'),
  ],
  sentinel: [
    R(9, 11, 14, 15, '#e5e7eb'),
    C(16, 8, 5, '#e5e7eb'),
    R(12, 15, 8, 3, '#1f2937'),
    R(9, 20, 14, 2, '#9ca3af'),
  ],
  raider: [
    R(9, 11, 14, 15, '#b45309'),
    C(16, 8, 5, '#d6a76c'),
    R(9, 14, 14, 2, '#78350f'),
    R(23, 10, 2, 14, '#94a3b8'),
  ],
  knight: [
    R(8, 11, 16, 16, '#eab308'),
    C(16, 8, 6, '#facc15'),
    R(13, 3, 6, 5, '#dc2626'),
    R(12, 15, 8, 3, '#78350f'),
  ],
  failed: [
    C(16, 17, 9, '#fb7185'),
    R(10, 12, 4, 4, '#be123c'),
    R(20, 20, 4, 4, '#be123c'),
    R(14, 15, 4, 4, '#450a0a'),
  ],
  drone: [
    C(16, 16, 8, '#6366f1'),
    C(16, 16, 4, '#e0e7ff'),
    C(16, 16, 2, '#1e1b4b'),
    R(15, 4, 2, 6, '#a5b4fc'),
  ],
  guardian: [
    R(7, 9, 18, 18, '#c026d3'),
    R(4, 10, 5, 7, '#86198f'),
    R(23, 10, 5, 7, '#86198f'),
    C(16, 18, 5, '#f0abfc'),
  ],
  potion: [
    R(14, 4, 4, 3, '#78350f'),
    R(15, 7, 2, 3, '#94a3b8'),
    R(11, 10, 10, 14, '#e2e8f0'),
    R(12, 15, 8, 8, '#38bdf8'),
  ],
  scroll: [
    R(9, 11, 14, 10, '#f5e9c8'),
    R(8, 10, 3, 12, '#c8a24a'),
    R(21, 10, 3, 12, '#c8a24a'),
    R(12, 14, 8, 1, '#8a6d3b'),
    R(12, 17, 8, 1, '#8a6d3b'),
  ],
  bomb: [
    C(16, 19, 9, '#1f2937'),
    C(13, 16, 2, '#475569'),
    R(17, 6, 2, 7, '#78350f'),
    C(19, 5, 2, '#facc15'),
  ],
  blade: [
    R(15, 5, 3, 16, '#e5e7eb'),
    R(11, 20, 10, 2, '#9ca3af'),
    R(14, 22, 4, 6, '#78350f'),
  ],
  sword: [
    R(14, 4, 4, 16, '#f1f5f9'),
    R(9, 20, 14, 3, '#94a3b8'),
    R(14, 23, 4, 6, '#78350f'),
    C(16, 30, 2, '#facc15'),
  ],
  bow: [
    R(21, 4, 3, 5, '#b45309'),
    R(19, 9, 3, 5, '#b45309'),
    R(19, 18, 3, 5, '#b45309'),
    R(21, 23, 3, 5, '#b45309'),
    R(22, 6, 1, 20, '#f1f5f9'),
  ],
  pickaxe: [
    R(15, 10, 3, 20, '#78350f'),
    R(6, 6, 20, 4, '#94a3b8'),
  ],
  material: [
    R(8, 10, 16, 14, '#c08457'),
    C(16, 17, 5, '#8a5a2b'),
  ],
  ore: [
    R(8, 14, 8, 10, '#64748b'),
    R(15, 10, 10, 14, '#475569'),
    C(19, 14, 2, '#93c5fd'),
  ],
  herb: [
    R(15, 14, 2, 12, '#166534'),
    C(11, 14, 4, '#4ade80'),
    C(21, 14, 4, '#4ade80'),
    C(16, 9, 4, '#86efac'),
  ],
  bone: [
    R(12, 14, 8, 4, '#f8fafc'),
    C(10, 16, 4, '#f8fafc'),
    C(22, 16, 4, '#f8fafc'),
  ],
  gear: [
    C(16, 16, 8, '#94a3b8'),
    R(15, 4, 2, 4, '#94a3b8'),
    R(15, 24, 2, 4, '#94a3b8'),
    R(4, 15, 4, 2, '#94a3b8'),
    R(24, 15, 4, 2, '#94a3b8'),
    C(16, 16, 3, '#1f2937'),
  ],
  bottle: [
    R(15, 6, 2, 4, '#94a3b8'),
    R(12, 10, 8, 12, '#cbd5e1'),
    R(13, 14, 6, 7, '#7dd3fc'),
  ],
  core: [
    C(16, 16, 8, '#c4b5fd'),
    C(16, 16, 4, '#f0abfc'),
    C(16, 16, 2, '#faf5ff'),
  ],
  coin: [
    C(16, 16, 8, '#facc15'),
    C(16, 16, 5, '#fde68a'),
    R(15, 13, 2, 6, '#a16207'),
  ],
  upgrade: [
    R(14, 8, 4, 16, '#facc15'),
    R(8, 14, 16, 4, '#facc15'),
  ],
  stairs: [
    R(4, 24, 7, 6, '#4ade80'),
    R(11, 18, 7, 6, '#4ade80'),
    R(18, 12, 7, 6, '#4ade80'),
    R(25, 6, 5, 6, '#4ade80'),
  ],
  station: [
    R(6, 10, 20, 4, '#64748b'),
    R(8, 14, 16, 12, '#475569'),
    R(14, 18, 4, 8, '#1f2937'),
  ],
  stationGate: [
    R(6, 6, 20, 4, '#34d399'),
    R(6, 8, 4, 18, '#34d399'),
    R(22, 8, 4, 18, '#34d399'),
    R(14, 12, 4, 10, '#a7f3d0'),
  ],
  stationStash: [
    R(6, 10, 20, 6, '#d97706'),
    R(7, 14, 18, 10, '#b45309'),
    R(14, 16, 4, 4, '#fef08a'),
  ],
  stationCraft: [
    R(6, 12, 20, 5, '#94a3b8'),
    R(12, 17, 8, 6, '#64748b'),
    R(22, 6, 3, 10, '#78350f'),
  ],
  stationMarket: [
    C(16, 18, 9, '#f59e0b'),
    R(13, 8, 6, 4, '#78350f'),
    R(14, 15, 4, 7, '#78350f'),
  ],
  stationCompendium: [
    R(7, 9, 9, 16, '#a5b4fc'),
    R(16, 9, 9, 16, '#818cf8'),
    R(15, 9, 2, 16, '#312e81'),
  ],
  stationAppraiser: [
    C(14, 14, 7, '#facc15'),
    C(14, 14, 4, '#111827'),
    R(19, 19, 3, 10, '#78350f'),
  ],
  stationBarter: [
    R(6, 12, 14, 4, '#7dd3fc'),
    R(18, 10, 4, 8, '#7dd3fc'),
    R(10, 18, 14, 4, '#fbbf24'),
    R(8, 16, 4, 8, '#fbbf24'),
  ],
  collectionItem: [
    R(7, 11, 18, 5, '#a9895a'),
    R(8, 14, 16, 12, '#8b6f3f'),
    R(14, 11, 4, 15, '#dc2626'),
    C(16, 10, 3, '#dc2626'),
  ],
} satisfies Record<string, Shape[]>;

export type SpriteKey = keyof typeof SPRITE_SHAPES;

const ENEMY_SPRITES: Record<EnemyKind, SpriteKey> = {
  caveImp: 'imp',
  oreBeetle: 'beetle',
  tunnelGnoll: 'gnoll',
  sporeBat: 'bat',
  slime: 'slime',
  herbEater: 'herbEater',
  boneSentinel: 'sentinel',
  fortRaider: 'raider',
  crestKnight: 'knight',
  failedSubject: 'failed',
  observerDrone: 'drone',
  arcaneGuardian: 'guardian',
};

const STATION_SPRITES: Record<StationKind, SpriteKey> = {
  raidGate: 'stationGate',
  stash: 'stationStash',
  craft: 'stationCraft',
  market: 'stationMarket',
  compendium: 'stationCompendium',
  appraiser: 'stationAppraiser',
  barterMerchant: 'stationBarter',
};

const ITEM_SPRITES: Partial<Record<ItemKind, SpriteKey>> = {
  potion: 'potion',
  hiPotion: 'potion',
  antidote: 'bottle',
  bandage: 'scroll',
  poisonVial: 'bottle',
  smokeBomb: 'bomb',
  explosive: 'bomb',
  throwingKnife: 'blade',
  sword: 'sword',
  bow: 'bow',
  pickaxe: 'pickaxe',
  ironOre: 'ore',
  copperOre: 'ore',
  sulfur: 'ore',
  oldGear: 'gear',
  hardShell: 'beetle',
  herb: 'herb',
  blueMushroom: 'herb',
  poisonSpore: 'herb',
  cleanWater: 'bottle',
  slimeGel: 'slime',
  boneShard: 'bone',
  sturdyLeather: 'scroll',
  tornCloth: 'scroll',
  brokenBlade: 'blade',
  crestFragment: 'coin',
  glassShard: 'ore',
  chemicalBottle: 'bottle',
  arcaneCore: 'core',
  dataRecord: 'stationCompendium',
  mutantMeat: 'failed',
  wood: 'material',
  oldCoin: 'coin',
  keyBundle: 'gear',
  mapFragment: 'scroll',
  swordUpgrade1: 'upgrade',
  swordUpgrade2: 'upgrade',
  bowUpgrade1: 'upgrade',
  bowUpgrade2: 'upgrade',
  pickaxeUpgrade1: 'upgrade',
  pickaxeUpgrade2: 'upgrade',
  armorUpgrade1: 'upgrade',
  armorUpgrade2: 'upgrade',
  bagUpgrade1: 'upgrade',
  bagUpgrade2: 'upgrade',
  stashUpgrade1: 'upgrade',
  craftBenchUpgrade1: 'upgrade',
  mapTable: 'upgrade',
  returnBeacon: 'upgrade',
  lockpickTool: 'upgrade',
  ancientRelic: 'collectionItem',
  gildedIdol: 'collectionItem',
  strangeGem: 'collectionItem',
};

export const spriteKeyForEnemy = (enemy: EnemyKind): SpriteKey => ENEMY_SPRITES[enemy];

export const spriteKeyForItem = (item: ItemKind): SpriteKey => ITEM_SPRITES[item] ?? 'material';

export const spriteKeyForStation = (station: StationKind): SpriteKey => STATION_SPRITES[station];

type SpritePaint = CanvasRenderingContext2D;

export const renderSpriteIcon = (context: SpritePaint, sprite: SpriteKey, left: number, top: number, size: number, alpha = 1) => {
  context.save();
  context.globalAlpha *= alpha;
  context.imageSmoothingEnabled = false;
  context.translate(left, top);
  context.scale(size / SPRITE_RESOLUTION, size / SPRITE_RESOLUTION);
  drawShapeSprite(context, SPRITE_SHAPES[sprite]);
  context.restore();
};

const drawShapeSprite = (context: SpritePaint, shapes: readonly Shape[]) => {
  shapes.forEach((shape) => {
    context.fillStyle = shape.c;
    if (shape.t === 'c') {
      context.beginPath();
      context.arc(shape.x, shape.y, shape.r, 0, Math.PI * 2);
      context.fill();
      return;
    }
    context.fillRect(shape.x, shape.y, shape.w, shape.h);
  });
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
      this.drawTileTexture(tile, x, y, cellSize, offsetX, offsetY, tile.biome ?? snapshot.biome);

      if (tile.kind === 'stairs' && tile.visible) {
        this.drawSprite('stairs', left, top, cellSize, tile.visible ? 1 : 0.45);
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

  private drawTileTexture(
    tile: Tile,
    x: number,
    y: number,
    cellSize: number,
    offsetX: number,
    offsetY: number,
    biomeId: BiomeId | null,
  ): void {
    if (!tile.visible) {
      return;
    }

    const left = offsetX + x * cellSize;
    const top = offsetY + y * cellSize;
    const hash = (x * 928371 + y * 12960181 + 61) % 97;

    if (tile.kind === 'wall' || isGatheringTile(tile.kind)) {
      this.drawWallTexture(left, top, cellSize, hash, biomeId);
      if (isGatheringTile(tile.kind)) {
        const chip = Math.max(1, Math.floor(cellSize * 0.16));
        this.context.fillStyle = gatheringAccent(tile.kind);
        this.context.fillRect(left + Math.floor(cellSize * 0.26), top + Math.floor(cellSize * 0.32), chip, chip);
        this.context.fillStyle = '#bfdbfe';
        this.context.fillRect(left + Math.floor(cellSize * 0.62), top + Math.floor(cellSize * 0.55), chip, chip);
      }
      return;
    }

    this.drawFloorTexture(left, top, cellSize, x, y, hash, biomeId);
  }

  private drawWallTexture(left: number, top: number, cellSize: number, hash: number, biomeId: BiomeId | null): void {
    const ctx = this.context;
    const highlight = Math.max(1, Math.floor(cellSize * 0.16));
    const shadow = Math.max(1, Math.floor(cellSize * 0.12));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(left, top, cellSize, highlight);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(left, top + cellSize - shadow, cellSize, shadow);

    if (biomeId === 'fortress') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
      ctx.fillRect(left, top + Math.floor(cellSize * 0.5), cellSize, Math.max(1, Math.floor(cellSize * 0.06)));
      const jointX = hash % 2 === 0 ? cellSize * 0.32 : cellSize * 0.68;
      ctx.fillRect(left + Math.floor(jointX), top, Math.max(1, Math.floor(cellSize * 0.05)), Math.floor(cellSize * 0.5));
      ctx.fillRect(left + Math.floor(cellSize * 0.5), top + Math.floor(cellSize * 0.5), Math.max(1, Math.floor(cellSize * 0.05)), Math.floor(cellSize * 0.5));
      return;
    }

    if (biomeId === 'lab') {
      ctx.strokeStyle = 'rgba(165, 180, 252, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(left + 2, top + 2, cellSize - 4, cellSize - 4);
      if (hash % 5 === 0) {
        const dot = Math.max(1, Math.floor(cellSize * 0.1));
        ctx.fillStyle = 'rgba(196, 181, 253, 0.85)';
        ctx.fillRect(left + cellSize * 0.5 - dot / 2, top + cellSize * 0.5 - dot / 2, dot, dot);
      }
      return;
    }

    if (biomeId === 'forest') {
      if (hash % 3 !== 0) {
        const blotch = Math.max(1, Math.floor(cellSize * 0.22));
        ctx.fillStyle = 'rgba(74, 140, 90, 0.3)';
        ctx.fillRect(left + (hash % 5) * (cellSize * 0.14), top + (hash % 4) * (cellSize * 0.16), blotch, blotch);
      }
      return;
    }

    const speck = Math.max(1, Math.floor(cellSize * 0.13));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
    ctx.fillRect(left + (hash % 6) * (cellSize * 0.13), top + (hash % 5) * (cellSize * 0.15), speck, speck);
    if (hash % 11 === 0) {
      const glint = Math.max(1, Math.floor(cellSize * 0.1));
      ctx.fillStyle = 'rgba(147, 197, 253, 0.75)';
      ctx.fillRect(left + cellSize * 0.6, top + cellSize * 0.3, glint, glint);
    }
  }

  private drawFloorTexture(
    left: number,
    top: number,
    cellSize: number,
    x: number,
    y: number,
    hash: number,
    biomeId: BiomeId | null,
  ): void {
    const ctx = this.context;

    if (biomeId === 'fortress') {
      if ((x + y) % 4 === 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(left, top, cellSize, 1);
        ctx.fillRect(left, top, 1, cellSize);
      }
      return;
    }

    if (biomeId === 'lab') {
      if ((x * 13 + y * 7) % 9 === 0) {
        ctx.strokeStyle = 'rgba(129, 140, 248, 0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(left, top + cellSize * 0.5);
        ctx.lineTo(left + cellSize, top + cellSize * 0.5);
        ctx.stroke();
      }
      return;
    }

    if (biomeId === 'forest') {
      if (hash % 4 === 0) {
        const leaf = Math.max(1, Math.floor(cellSize * 0.1));
        ctx.fillStyle = hash % 2 === 0 ? 'rgba(134, 239, 172, 0.24)' : 'rgba(63, 143, 87, 0.32)';
        ctx.fillRect(left + (hash % 5) * (cellSize * 0.16), top + (hash % 3) * (cellSize * 0.22), leaf, leaf);
      }
      return;
    }

    if ((x * 17 + y * 31) % 7 === 0) {
      const speck = Math.max(1, Math.floor(cellSize * 0.12));
      ctx.fillStyle = '#202a2f';
      ctx.fillRect(left + Math.floor(cellSize * 0.62), top + Math.floor(cellSize * 0.58), speck, speck);
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

  private drawSprite(sprite: SpriteKey, left: number, top: number, cellSize: number, alpha: number): void {
    renderSpriteIcon(this.context, sprite, left, top, cellSize, alpha);
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
  return name.includes('繝弱・繝ｫ') ? 'G' : name.slice(0, 1);
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
  if (name.includes('鬨主｣ｫ') || name.includes('逡ｪ莠ｺ')) {
    return '#facc15';
  }
  if (name.includes('繧ｹ繝ｩ繧､繝')) {
    return '#67e8f9';
  }
  if (name.includes('隕ｳ貂ｬ')) {
    return '#a5b4fc';
  }
  return name.includes('繝弱・繝ｫ') ? '#f0a95b' : '#d97878';
};

const spriteFor = (entity: Entity): SpriteKey => {
  if (entity.kind === 'player') {
    return 'player';
  }
  if (entity.kind === 'item') {
    return entity.item ? spriteKeyForItem(entity.item) : 'material';
  }
  if (entity.kind === 'station') {
    return entity.station ? spriteKeyForStation(entity.station) : 'station';
  }
  return entity.enemy ? spriteKeyForEnemy(entity.enemy) : 'imp';
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
