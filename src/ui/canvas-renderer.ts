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

type Camera = {
  cellSize: number;
  offsetX: number;
  offsetY: number;
  displayWidth: number;
  displayHeight: number;
};

const MIN_DISPLAY_WIDTH = 320;
const MIN_DISPLAY_HEIGHT = 260;

const computeCamera = (snapshot: GameSnapshot, displayWidth: number, displayHeight: number): Camera => {
  const player = snapshot.entities.find((entity) => entity.id === snapshot.playerId);
  const cellSize = FIXED_CELL_SIZE;
  const focusX = player?.x ?? Math.floor(snapshot.width / 2);
  const focusY = player?.y ?? Math.floor(snapshot.height / 2);
  const offsetX = Math.floor(displayWidth / 2 - (focusX + 0.5) * cellSize);
  const offsetY = Math.floor(displayHeight / 2 - (focusY + 0.5) * cellSize);

  return { cellSize, offsetX, offsetY, displayWidth, displayHeight };
};

/**
 * Inverts a click/tap point into a tile coordinate, using the exact same
 * camera math as rendering so hit-testing lines up with what's on screen.
 */
export const screenToTile = (canvas: HTMLCanvasElement, snapshot: GameSnapshot, clientX: number, clientY: number): { x: number; y: number } | undefined => {
  const rect = canvas.getBoundingClientRect();
  const displayWidth = Math.max(MIN_DISPLAY_WIDTH, rect.width);
  const displayHeight = Math.max(MIN_DISPLAY_HEIGHT, rect.height);
  const camera = computeCamera(snapshot, displayWidth, displayHeight);
  const x = Math.floor((clientX - rect.left - camera.offsetX) / camera.cellSize);
  const y = Math.floor((clientY - rect.top - camera.offsetY) / camera.cellSize);

  if (x < 0 || y < 0 || x >= snapshot.width || y >= snapshot.height) {
    return undefined;
  }

  return { x, y };
};

type ActiveCombatEffect = CombatEffect & {
  progress: number;
};

// Prototype-quality icons: one emoji per sprite key. Emoji render as
// recognizable full-color glyphs at any size, which reads far better than
// hand-drawn pixel/shape art at the small sizes these actually show up at.
export const SPRITE_SHAPES = {
  player: '🧙',
  imp: '😈',
  beetle: '🪲',
  gnoll: '🐺',
  bat: '🦇',
  slime: '🟢',
  herbEater: '🐰',
  sentinel: '💀',
  raider: '🧌',
  knight: '💂',
  failed: '🧟',
  drone: '👁️',
  guardian: '🐉',
  potion: '🧪',
  scroll: '📜',
  bomb: '💣',
  blade: '🔪',
  sword: '🗡️',
  bow: '🏹',
  pickaxe: '⛏️',
  axe: '🪓',
  blowgun: '🪈',
  crossbow: '⚡',
  armor: '🛡️',
  hazmatSuit: '☣️',
  material: '🪵',
  ore: '🪨',
  herb: '🌿',
  bone: '🦴',
  gear: '⚙️',
  bottle: '🧴',
  core: '🔮',
  coin: '🪙',
  upgrade: '⬆️',
  stairs: '🪜',
  station: '🏛️',
  stationGate: '⛩️',
  stationStash: '📦',
  stationCraft: '🔨',
  stationMarket: '💰',
  stationCompendium: '📖',
  stationAppraiser: '🔍',
  stationBarter: '🤝',
  collectionItem: '❓',
} satisfies Record<string, string>;

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
  axe: 'axe',
  dagger: 'blade',
  blowgun: 'blowgun',
  sparkCrossbow: 'crossbow',
  leatherArmor: 'armor',
  hazmatSuit: 'hazmatSuit',
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
  ancientRelic: 'collectionItem',
  gildedIdol: 'collectionItem',
  strangeGem: 'collectionItem',
};

export const spriteKeyForEnemy = (enemy: EnemyKind): SpriteKey => ENEMY_SPRITES[enemy];

export const spriteKeyForItem = (item: ItemKind): SpriteKey => ITEM_SPRITES[item] ?? 'material';

export const spriteKeyForStation = (station: StationKind): SpriteKey => STATION_SPRITES[station];

type SpritePaint = CanvasRenderingContext2D;

const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

export const renderSpriteIcon = (context: SpritePaint, sprite: SpriteKey, left: number, top: number, size: number, alpha = 1) => {
  context.save();
  context.globalAlpha *= alpha;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `${Math.max(8, Math.floor(size * 0.82))}px ${EMOJI_FONT}`;
  context.fillText(SPRITE_SHAPES[sprite], left + size / 2, top + size * 0.54);
  context.restore();
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
    const displayWidth = Math.max(MIN_DISPLAY_WIDTH, rect.width);
    const displayHeight = Math.max(MIN_DISPLAY_HEIGHT, rect.height);
    this.canvas.width = Math.floor(displayWidth * dpr);
    this.canvas.height = Math.floor(displayHeight * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const camera = computeCamera(snapshot, displayWidth, displayHeight);
    const combatEffects = this.activeCombatEffects(snapshot, now);

    this.context.fillStyle = '#0e1113';
    this.context.fillRect(0, 0, displayWidth, displayHeight);

    this.drawTiles(snapshot, camera);
    this.drawEntities(snapshot, camera, combatEffects);
    this.drawFacing(snapshot, camera);
    this.drawCombatEffects(combatEffects, camera);

    if (snapshot.gameOver && combatEffects.length === 0) {
      this.drawOverlay(displayWidth, displayHeight, '倒れた', '「拠点に戻る」を押すと帰還する。探索中の荷物は失われる。');
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
