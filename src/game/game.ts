import * as ROT from 'rot-js';
import { chebyshev, indexAt } from '../engine/grid';
import type { BiomeId, CombatEffect, Command, ElementId, EnemyKind, Entity, GameMode, GameSnapshot, GridInventories, Inventory, InventoryLocation, ItemKind, MapId, MapRoll, RecipeId, StationKind, Tile, TileKind } from '../engine/types';
import { BIOME_DEFINITIONS, BIOME_IDS } from './biomes';
import { BARTER_TRADES, MAP_DEFINITIONS, MAP_IDS } from './maps';
import { rollMapRoll, summarizeMapAffixes, TIER_LABELS } from './map-affixes';
import { chooseEnemyDrop, chooseEnemyKind, ENEMY_DEFINITIONS, scaledEnemyStats } from './enemies';
import { canFitAdditionalUnit, GRID_DIMENSIONS, layoutGridInventory, overlaps } from './grid-inventory';
import { ARMOR_KINDS, COLLECTION_KINDS, createEmptyInventory, createStartingStash, ITEM_DEFINITIONS, ITEM_KINDS, MAP_ITEM_FOR_MAP_ID, MAP_ITEM_KINDS, RAID_CAPACITY } from './items';
import { addRecipeResult, consumeIngredients, formatStack, hasIngredients, recipeById } from './recipes';

const MAP_WIDTH = 96;
const MAP_HEIGHT = 60;
const BASE_WIDTH = 34;
const BASE_HEIGHT = 24;
const FOV_RADIUS = 13;
const PLAYER_ID = 'player';
const BASE_LOADOUT_ITEMS: ItemKind[] = ['potion', 'sword', 'bow', 'pickaxe'];
const STARTING_EQUIPMENT: ItemKind[] = ['sword', 'bow', 'pickaxe'];
const MAX_STAMINA = 100;
const STAMINA_COST_MOVE = 1;
const STAMINA_COST_TOOL_ACTION = 3;
const STAMINA_COST_BAREHANDED_GATHER = 10;
const STAMINA_COST_BAREHANDED_ATTACK = 6;
const BAREHANDED_ATTACK_POWER = 0;
const BAREHANDED_ATTACK_ELEMENT: ElementId = 'impact';
const COLLECTION_DROP_CHANCE = 0.05;
const MAP_ITEM_DROP_CHANCE = 0.04;
const VAULT_GUARDIAN_DANGER_MULTIPLIER = 1.8;
const VAULT_ELITE_GUARDIAN_DANGER_MULTIPLIER = 2.6;
const VAULT_MAP_ITEM_CHANCE = 0.3;

type RoomLike = {
  getCenter(): number[];
  getLeft(): number;
  getRight(): number;
  getTop(): number;
  getBottom(): number;
};

type MapGenerationProfile = {
  roomWidth: [number, number];
  roomHeight: [number, number];
  corridorLength: [number, number];
  dugPercentage: number;
  nodeBonus: number;
};

type TurnResult = {
  usedTurn: boolean;
  skipEnemyId?: string;
};

const BIOME_MAP_PROFILES: Record<BiomeId, MapGenerationProfile> = {
  mine: {
    roomWidth: [3, 7],
    roomHeight: [3, 6],
    corridorLength: [5, 14],
    dugPercentage: 0.18,
    nodeBonus: 4,
  },
  forest: {
    roomWidth: [6, 14],
    roomHeight: [5, 10],
    corridorLength: [2, 5],
    dugPercentage: 0.31,
    nodeBonus: 6,
  },
  fortress: {
    roomWidth: [5, 10],
    roomHeight: [5, 9],
    corridorLength: [3, 7],
    dugPercentage: 0.24,
    nodeBonus: 2,
  },
  lab: {
    roomWidth: [4, 8],
    roomHeight: [4, 8],
    corridorLength: [2, 6],
    dugPercentage: 0.26,
    nodeBonus: 3,
  },
};

const MIXED_MAP_PROFILE: MapGenerationProfile = {
  roomWidth: [7, 16],
  roomHeight: [6, 13],
  corridorLength: [5, 14],
  dugPercentage: 0.2,
  nodeBonus: 0,
};

export class Game {
  private width = MAP_WIDTH;
  private height = MAP_HEIGHT;
  private tiles: Tile[] = [];
  private entities: Entity[] = [];
  private messages: string[] = [];
  private combatEffects: CombatEffect[] = [];
  private effectId = 0;
  private seed = Date.now();
  private depth = 1;
  private xp = 0;
  private mode: GameMode = 'base';
  private biome: BiomeId | null = null;
  private activeMapId: MapId | null = null;
  private activeBiomes: BiomeId[] = BIOME_IDS;
  private stash: Inventory = createStartingStash();
  private baseLoadout: Inventory = createEmptyInventory();
  private raidInventory: Inventory = createEmptyInventory();
  private handInventory: Inventory = createEmptyInventory();
  private selectedHandItem: ItemKind | null = null;
  private money = 0;
  private dropId = 0;
  private facing = { x: 0, y: 1 };
  private gameOver = false;
  private stamina = MAX_STAMINA;
  private equipmentDurability: Partial<Record<ItemKind, number[]>> = {};
  private gridLayouts: GridInventories = { hand: [], raidBag: [], stash: [] };
  private nodeYieldMultiplier = 1;
  private dangerBonusMultiplier = 1;
  private dropRateMultiplier = 1;
  private vaultRoomBonus = 0;
  private eliteGuardianActive = false;
  private mapItemRolls: Partial<Record<ItemKind, MapRoll[]>> = {};
  private mapRollSeq = 0;
  private debugMode = false;

  constructor() {
    this.restart();
  }

  snapshot(): GameSnapshot {
    this.refreshGridLayouts();

    return {
      mode: this.mode,
      width: this.width,
      height: this.height,
      tiles: this.tiles.map((tile) => ({ ...tile })),
      entities: this.entities.map((entity) => ({ ...entity, stats: entity.stats ? { ...entity.stats } : undefined })),
      playerId: PLAYER_ID,
      player: {
        depth: this.depth,
        xp: this.xp,
        raidInventory: { ...this.raidInventory },
        handInventory: { ...this.handInventory },
        selectedHandItem: this.selectedHandItem,
        raidCapacity: RAID_CAPACITY,
        facing: { ...this.facing },
        stamina: this.stamina,
        maxStamina: MAX_STAMINA,
      },
      stash: { ...this.stash },
      baseLoadout: { ...this.baseLoadout },
      money: this.money,
      messages: [...this.messages],
      combatEffects: this.combatEffects.map((effect) => ({
        ...effect,
        from: { ...effect.from },
        to: { ...effect.to },
      })),
      gameOver: this.gameOver,
      seed: this.seed,
      biome: this.biome,
      mapId: this.activeMapId,
      grids: {
        hand: this.gridLayouts.hand.map((entry) => ({ ...entry })),
        raidBag: this.gridLayouts.raidBag.map((entry) => ({ ...entry })),
        stash: this.gridLayouts.stash.map((entry) => ({ ...entry })),
      },
      collectionCount: COLLECTION_KINDS.reduce((total, item) => total + this.stash[item], 0),
      debugMode: this.debugMode,
      mapRolls: Object.fromEntries(
        Object.entries(this.mapItemRolls).map(([item, rolls]) => [item, (rolls ?? []).map((roll) => ({ ...roll }))]),
      ) as Partial<Record<ItemKind, MapRoll[]>>,
    };
  }

  private refreshGridLayouts(): void {
    const handSource = this.mode === 'base' ? this.baseLoadout : this.handInventory;
    this.gridLayouts = {
      hand: layoutGridInventory(handSource, this.gridLayouts.hand, this.equipmentDurability, this.mapItemRolls, GRID_DIMENSIONS.hand),
      raidBag: layoutGridInventory(this.raidInventory, this.gridLayouts.raidBag, this.equipmentDurability, this.mapItemRolls, GRID_DIMENSIONS.raidBag),
      stash: layoutGridInventory(this.stash, this.gridLayouts.stash, this.equipmentDurability, this.mapItemRolls, GRID_DIMENSIONS.stash),
    };
  }

  dispatch(command: Command): void {
    if (command.type === 'restart') {
      this.restart();
      return;
    }

    if (command.type === 'acknowledgeDeath') {
      if (this.gameOver) {
        this.finalizeDeath();
      }
      return;
    }

    if (command.type === 'toggleDebugMode') {
      this.debugMode = !this.debugMode;
      this.pushMessage(this.debugMode ? 'デバッグモードを有効にした。' : 'デバッグモードを無効にした。');
      return;
    }

    if (command.type === 'debugGiveItem') {
      this.debugGiveItem(command.item, command.amount ?? 1);
      return;
    }

    if (command.type === 'debugSpawnEnemy') {
      this.debugSpawnEnemy(command.enemy, command.x, command.y);
      return;
    }

    if (this.gameOver) {
      this.pushMessage('倒れています。「拠点に戻る」を押してください。');
      return;
    }

    if (command.type === 'startRaid') {
      this.startRaid(command.mapId, command.mapRollId);
      return;
    }

    if (command.type === 'sellItem') {
      this.sellItem(command.item);
      return;
    }

    if (command.type === 'craftItem') {
      this.craftItem(command.recipe);
      return;
    }

    if (command.type === 'appraiseCollection') {
      this.appraiseCollection();
      return;
    }

    if (command.type === 'moveItem') {
      this.moveItem(command.item, command.from, command.to, command.x, command.y);
      return;
    }

    if (command.type === 'placeItem') {
      this.placeItem(command.item, command.location, command.x, command.y);
      return;
    }

    if (command.type === 'previousHandItem') {
      this.selectHandItem(-1);
      return;
    }

    if (command.type === 'nextHandItem') {
      this.selectHandItem(1);
      return;
    }

    if (this.mode === 'base') {
      this.dispatchBase(command);
      return;
    }

    let turnResult: TurnResult = { usedTurn: false };

    switch (command.type) {
      case 'face':
        this.face(command.dx, command.dy);
        break;
      case 'forward':
        turnResult = this.tryMovePlayer(this.facing.x, this.facing.y);
        break;
      case 'wait':
        this.pushMessage('ダンジョンの気配に耳を澄ませた。');
        this.spendStamina(STAMINA_COST_MOVE);
        turnResult = { usedTurn: true };
        break;
      case 'pickup':
        turnResult = { usedTurn: this.pickup() };
        break;
      case 'useItem':
        turnResult = { usedTurn: this.useItem(command.item) };
        break;
      case 'useHeldItem':
        turnResult = this.useHeldItem();
        break;
      case 'item':
        break;
      case 'descend':
        turnResult = { usedTurn: this.extract() };
        break;
      case 'interact':
        turnResult = { usedTurn: this.interactRaid() };
        break;
      case 'help':
        break;
    }

    if (turnResult.usedTurn && !this.gameOver) {
      this.enemyTurn(turnResult.skipEnemyId);
      this.updateFov();
    }
  }

  private dispatchBase(command: Command): void {
    switch (command.type) {
      case 'face':
        this.face(command.dx, command.dy);
        return;
      case 'forward':
        this.tryMovePlayer(this.facing.x, this.facing.y);
        return;
      case 'interact':
      case 'pickup':
      case 'descend':
        this.interactBase();
        return;
      case 'wait':
        this.pushMessage('拠点で周囲を確認した。');
        return;
      case 'item':
        this.pushMessage(this.stashSummary());
        return;
      case 'help':
        return;
      case 'useItem':
        this.pushMessage('拠点ではバッグのアイテムを使わない。');
        return;
      case 'moveItem':
      case 'placeItem':
        return;
      case 'startRaid':
      case 'sellItem':
      case 'craftItem':
      case 'appraiseCollection':
      case 'useHeldItem':
      case 'previousHandItem':
      case 'nextHandItem':
      case 'restart':
        return;
    }
  }

  private restart(): void {
    this.seed = Date.now();
    this.depth = 1;
    this.xp = 0;
    this.mode = 'base';
    this.biome = null;
    this.activeMapId = null;
    this.activeBiomes = BIOME_IDS;
    this.stash = createStartingStash();
    this.equipmentDurability = {};
    STARTING_EQUIPMENT.forEach((item) => {
      if (this.stash[item] > 0) {
        this.grantEquipmentInstances(item, this.stash[item]);
      }
    });
    this.baseLoadout = createEmptyInventory();
    this.gridLayouts = { hand: [], raidBag: [], stash: [] };
    this.prepareBaseLoadout();
    this.raidInventory = createEmptyInventory();
    this.handInventory = createEmptyInventory();
    this.selectedHandItem = null;
    this.money = 0;
    this.dropId = 0;
    this.facing = { x: 0, y: 1 };
    this.gameOver = false;
    this.combatEffects = [];
    this.effectId = 0;
    this.stamina = MAX_STAMINA;
    this.createBase('拠点に戻った。施設の隣で調べると利用できる。');
  }

  private startRaid(mapId?: MapId, mapRollId?: string): void {
    if (this.mode === 'raid') {
      return;
    }

    const resolvedMapId = mapId ?? MAP_IDS[0];
    const mapDefinition = MAP_DEFINITIONS[resolvedMapId];

    let consumedRoll: MapRoll | undefined;
    if (mapRollId) {
      const mapItemKind = MAP_ITEM_FOR_MAP_ID[resolvedMapId];
      const rolls = this.mapItemRolls[mapItemKind] ?? [];
      const rollIndex = rolls.findIndex((roll) => roll.id === mapRollId);
      if (rollIndex !== -1) {
        consumedRoll = rolls[rollIndex];
        this.mapItemRolls[mapItemKind] = rolls.filter((_, index) => index !== rollIndex);
        this.stash[mapItemKind] = Math.max(0, this.stash[mapItemKind] - 1);
      }
    }

    const bonuses = summarizeMapAffixes(consumedRoll?.affixes ?? []);
    this.nodeYieldMultiplier = 1 + bonuses.richYieldPercent / 100;
    this.dangerBonusMultiplier = 1 + bonuses.denseSwarmPercent / 100;
    this.dropRateMultiplier = 1 + bonuses.fortunePercent / 100;
    this.vaultRoomBonus = bonuses.vaultCount;
    this.eliteGuardianActive = bonuses.eliteGuardianCount > 0;

    this.mode = 'raid';
    this.biome = null;
    this.activeMapId = resolvedMapId;
    this.activeBiomes = mapDefinition.biomes;
    this.width = MAP_WIDTH;
    this.height = MAP_HEIGHT;
    this.depth = 1;
    this.raidInventory = createEmptyInventory();
    this.handInventory = createEmptyInventory();
    this.selectedHandItem = null;
    this.transferBaseLoadoutToHand();
    this.syncSelectedHandItem(this.handInventory.potion > 0 ? 'potion' : 'sword');
    this.facing = { x: 0, y: 1 };
    this.gameOver = false;
    this.combatEffects = [];
    this.effectId = 0;
    this.stamina = MAX_STAMINA;
    const entryMessage = consumedRoll
      ? `地図(${TIER_LABELS[consumedRoll.tier]})を使い、${mapDefinition.name}への特別な遠征に出撃した。物資を集めて脱出地点を目指そう。`
      : `${mapDefinition.name}へ出撃した。物資を集めて脱出地点を目指そう。`;
    this.generateLevel(entryMessage);
  }

  private createBase(entryMessage: string): void {
    this.mode = 'base';
    this.biome = null;
    this.width = BASE_WIDTH;
    this.height = BASE_HEIGHT;
    this.gameOver = false;
    this.combatEffects = [];
    this.tiles = Array.from({ length: this.width * this.height }, (_, index) => {
      const x = index % this.width;
      const y = Math.floor(index / this.width);
      const isBorder = x === 0 || y === 0 || x === this.width - 1 || y === this.height - 1;
      return {
        kind: isBorder ? 'wall' : 'floor',
        visible: true,
        explored: true,
      };
    });
    this.entities = [
      {
        id: PLAYER_ID,
        kind: 'player',
        name: '探索者',
        glyph: '@',
        color: '#e8f6ff',
        x: 17,
        y: 14,
        blocks: true,
        stats: { hp: 24, maxHp: 24, attack: 6, defense: 1, speed: 10 },
      },
      createStationEntity('station-raid-gate', 'raidGate', '出撃ゲート', '>', '#6ee7b7', 17, 6),
      createStationEntity('station-stash', 'stash', '倉庫', 'C', '#fbbf24', 8, 11),
      createStationEntity('station-craft', 'craft', 'クラフト台', 'T', '#93c5fd', 26, 11),
      createStationEntity('station-market', 'market', '商人娘の換金所', '$', '#fcd34d', 8, 17),
      createStationEntity('station-compendium', 'compendium', '図鑑端末', '?', '#c4b5fd', 26, 17),
      createStationEntity('station-appraiser', 'appraiser', '鑑定士', '?', '#d6c39a', 17, 20),
    ];
    this.messages = [entryMessage, '出撃ゲート、倉庫、クラフト台、換金所、図鑑端末、鑑定士がある。'];
  }

  private generateLevel(entryMessage: string): void {
    ROT.RNG.setSeed(this.seed + this.depth * 1009);
    this.tiles = Array.from({ length: this.width * this.height }, () => ({
      kind: 'wall',
      visible: false,
      explored: false,
    }));
    this.entities = [];

    const digger = new ROT.Map.Digger(this.width, this.height, MIXED_MAP_PROFILE);

    digger.create((x, y, value) => {
      this.tileAt(x, y).kind = value === 0 ? 'floor' : 'wall';
    });

    const rooms = digger.getRooms() as RoomLike[];
    const roomBiomes = this.assignRoomBiomes(rooms);
    this.activeBiomes.forEach((biome) => {
      this.applyBiomeTerrain(
        biome,
        rooms.filter((room) => roomBiomes.get(room) === biome),
      );
    });
    this.assignTileBiomes(rooms, roomBiomes);
    const firstRoom = rooms[0];
    const lastRoom = rooms.at(-1) ?? firstRoom;
    const [playerX, playerY] = roomCenter(firstRoom);
    const [stairsX, stairsY] = roomCenter(lastRoom);

    this.entities.push({
      id: PLAYER_ID,
      kind: 'player',
      name: '冒険者',
      glyph: '@',
      color: '#e8f6ff',
      x: playerX,
      y: playerY,
      blocks: true,
      stats: { hp: 24, maxHp: 24, attack: 6, defense: 1, speed: 10 },
    });

    this.tileAt(stairsX, stairsY).kind = 'stairs';
    this.tileAt(stairsX, stairsY).biome = roomBiomes.get(lastRoom) ?? 'mine';
    this.populateRooms(rooms.slice(1, -1), roomBiomes);
    this.placeGatheringNodes(rooms, roomBiomes);
    this.placeBarterMerchant(rooms.slice(1, -1));
    this.placeVaultRooms(rooms.slice(1, -1), roomBiomes);
    this.messages = [entryMessage];
    this.updateFov();
  }

  private placeBarterMerchant(rooms: RoomLike[]): void {
    if (rooms.length === 0) {
      return;
    }

    const room = rooms[ROT.RNG.getUniformInt(0, rooms.length - 1)];
    const [x, y] = roomCenter(room);
    if (this.blockingEntityAt(x, y)) {
      return;
    }

    this.entities.push(createStationEntity(`station-barter-${this.depth}`, 'barterMerchant', '行商人', 'm', '#7dd3fc', x, y));
  }

  private placeVaultRooms(rooms: RoomLike[], roomBiomes: Map<RoomLike, BiomeId>): void {
    if (rooms.length === 0) {
      return;
    }

    const shuffled = [...rooms];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = ROT.RNG.getUniformInt(0, index);
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    const vaultTarget = Math.min(shuffled.length, 1 + this.vaultRoomBonus);
    let placedCount = 0;

    for (const room of shuffled) {
      if (placedCount >= vaultTarget) {
        break;
      }

      const spot = this.findVaultSpot(room);
      if (!spot) {
        continue;
      }

      const biomeId = roomBiomes.get(room) ?? 'mine';
      const tile = this.tileAt(spot.x, spot.y);
      tile.kind = 'locked';
      tile.biome = biomeId;
      this.placeGuardian(spot, biomeId);
      placedCount += 1;
    }
  }

  private findVaultSpot(room: RoomLike): { x: number; y: number } | undefined {
    const [cx, cy] = roomCenter(room);
    if (this.tileAt(cx, cy).kind === 'floor' && !this.blockingEntityAt(cx, cy)) {
      return { x: cx, y: cy };
    }

    for (let y = room.getTop() + 1; y <= room.getBottom() - 1; y += 1) {
      for (let x = room.getLeft() + 1; x <= room.getRight() - 1; x += 1) {
        if (this.tileAt(x, y).kind === 'floor' && !this.blockingEntityAt(x, y)) {
          return { x, y };
        }
      }
    }

    return undefined;
  }

  private placeGuardian(vaultSpot: { x: number; y: number }, biomeId: BiomeId): void {
    const biome = BIOME_DEFINITIONS[biomeId];
    const guardEnemy = biome.enemies.at(-1) ?? biome.enemies[0];
    if (!guardEnemy) {
      return;
    }

    const spot = this.nearbyWalkableSpot(vaultSpot.x, vaultSpot.y);
    if (!spot || this.blockingEntityAt(spot.x, spot.y)) {
      return;
    }

    const definition = ENEMY_DEFINITIONS[guardEnemy];
    const multiplier = this.eliteGuardianActive ? VAULT_ELITE_GUARDIAN_DANGER_MULTIPLIER : VAULT_GUARDIAN_DANGER_MULTIPLIER;
    const dangerBonus = (biome.danger + this.depth - 1) * multiplier;

    this.entities.push({
      id: `guardian-${this.depth}-${++this.dropId}`,
      kind: 'monster',
      name: `${definition.name}(守護者)`,
      glyph: definition.glyph,
      color: definition.color,
      x: spot.x,
      y: spot.y,
      blocks: true,
      ai: 'hostile',
      enemy: guardEnemy,
      stats: scaledEnemyStats(guardEnemy, dangerBonus),
    });
  }

  private nearbyWalkableSpot(x: number, y: number): { x: number; y: number } | undefined {
    const offsets: Array<[number, number]> = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];

    for (const [dx, dy] of offsets) {
      const nx = x + dx;
      const ny = y + dy;
      if (this.isWalkable(nx, ny) && !this.blockingEntityAt(nx, ny)) {
        return { x: nx, y: ny };
      }
    }

    return undefined;
  }

  private assignRoomBiomes(rooms: RoomLike[]): Map<RoomLike, BiomeId> {
    const biomeOrder = [...this.activeBiomes];
    for (let index = biomeOrder.length - 1; index > 0; index -= 1) {
      const swapIndex = ROT.RNG.getUniformInt(0, index);
      [biomeOrder[index], biomeOrder[swapIndex]] = [biomeOrder[swapIndex], biomeOrder[index]];
    }

    const roomBiomes = new Map<RoomLike, BiomeId>();
    rooms.forEach((room) => {
      const [x, y] = roomCenter(room);
      const quadrant = (x >= this.width / 2 ? 1 : 0) + (y >= this.height / 2 ? 2 : 0);
      roomBiomes.set(room, biomeOrder[quadrant % biomeOrder.length] ?? this.activeBiomes[0] ?? 'mine');
    });

    return roomBiomes;
  }

  private assignTileBiomes(rooms: RoomLike[], roomBiomes: Map<RoomLike, BiomeId>): void {
    const roomCenters = rooms.map((room) => {
      const [x, y] = roomCenter(room);
      return { x, y, biome: roomBiomes.get(room) ?? 'mine' };
    });

    this.tiles.forEach((tile, index) => {
      const x = index % this.width;
      const y = Math.floor(index / this.width);
      tile.biome = nearestBiome(x, y, roomCenters);
    });
  }

  private applyBiomeTerrain(biome: BiomeId, rooms: RoomLike[]): void {
    switch (biome) {
      case 'mine':
        this.addRoomPillars(rooms, 0.15);
        break;
      case 'forest':
        this.widenForestClearings(rooms);
        break;
      case 'fortress':
        this.addRoomPartitions(rooms, 0.55);
        break;
      case 'lab':
        this.addRoomPartitions(rooms, 0.35);
        this.addRoomPillars(rooms, 0.08);
        break;
    }
  }

  private widenForestClearings(rooms: RoomLike[]): void {
    const candidates: Array<[number, number]> = [];

    rooms.forEach((room) => {
      for (let y = Math.max(1, room.getTop() - 2); y <= Math.min(this.height - 2, room.getBottom() + 2); y += 1) {
        for (let x = Math.max(1, room.getLeft() - 2); x <= Math.min(this.width - 2, room.getRight() + 2); x += 1) {
          if (this.tileAt(x, y).kind === 'wall' && this.hasAdjacentFloor(x, y)) {
            candidates.push([x, y]);
          }
        }
      }
    });

    const targetCount = Math.floor(candidates.length * 0.28);
    for (let carved = 0; carved < targetCount && candidates.length > 0; carved += 1) {
      const index = ROT.RNG.getUniformInt(0, candidates.length - 1);
      const [x, y] = candidates.splice(index, 1)[0];
      this.tileAt(x, y).kind = 'floor';
    }
  }

  private addRoomPillars(rooms: RoomLike[], chance: number): void {
    rooms.forEach((room) => {
      const [centerX, centerY] = roomCenter(room);

      for (let y = room.getTop() + 1; y <= room.getBottom() - 1; y += 1) {
        for (let x = room.getLeft() + 1; x <= room.getRight() - 1; x += 1) {
          const isCenterArea = Math.abs(x - centerX) <= 1 && Math.abs(y - centerY) <= 1;
          if (!isCenterArea && this.tileAt(x, y).kind === 'floor' && ROT.RNG.getUniform() < chance) {
            this.tileAt(x, y).kind = 'wall';
          }
        }
      }
    });
  }

  private addRoomPartitions(rooms: RoomLike[], chance: number): void {
    rooms.forEach((room) => {
      const width = room.getRight() - room.getLeft() + 1;
      const height = room.getBottom() - room.getTop() + 1;
      if (width < 7 || height < 7 || ROT.RNG.getUniform() > chance) {
        return;
      }

      const [centerX, centerY] = roomCenter(room);
      const vertical = ROT.RNG.getUniform() < 0.5;

      if (vertical) {
        for (let y = room.getTop() + 1; y <= room.getBottom() - 1; y += 1) {
          if (Math.abs(y - centerY) > 1 && this.tileAt(centerX, y).kind === 'floor') {
            this.tileAt(centerX, y).kind = 'wall';
          }
        }
        return;
      }

      for (let x = room.getLeft() + 1; x <= room.getRight() - 1; x += 1) {
        if (Math.abs(x - centerX) > 1 && this.tileAt(x, centerY).kind === 'floor') {
          this.tileAt(x, centerY).kind = 'wall';
        }
      }
    });
  }

  private populateRooms(rooms: RoomLike[], roomBiomes: Map<RoomLike, BiomeId>): void {
    let monsterIndex = 0;
    let itemIndex = 0;

    rooms.forEach((room, roomIndex) => {
      const biome = BIOME_DEFINITIONS[roomBiomes.get(room) ?? 'mine'];
      const [cx, cy] = roomCenter(room);
      const roll = ROT.RNG.getUniform();

      if (roll < 0.64 + biome.danger * 0.08) {
        const enemy = chooseEnemyKind(biome.id, ROT.RNG.getUniform());
        const definition = ENEMY_DEFINITIONS[enemy];
        this.entities.push({
          id: `monster-${this.depth}-${monsterIndex++}`,
          kind: 'monster',
          name: definition.name,
          glyph: definition.glyph,
          color: definition.color,
          x: cx,
          y: cy,
          blocks: true,
          ai: 'hostile',
          enemy,
          stats: scaledEnemyStats(enemy, (biome.danger + this.depth - 1) * this.dangerBonusMultiplier),
        });
      }

      if ((roomIndex + this.depth) % 3 === 0) {
        const itemX = cx + (ROT.RNG.getUniform() < 0.5 ? -1 : 1);
        const itemY = cy;
        if (this.isWalkable(itemX, itemY)) {
          this.entities.push(createItemEntity(`loose-${this.depth}-${itemIndex++}`, this.randomBiomeMaterial(biome.id), itemX, itemY));
        }
      }
    });
  }

  private placeGatheringNodes(rooms: RoomLike[], roomBiomes: Map<RoomLike, BiomeId>): void {
    const roomCounts = new Map<BiomeId, number>();
    rooms.forEach((room) => {
      const biome = roomBiomes.get(room) ?? 'mine';
      roomCounts.set(biome, (roomCounts.get(biome) ?? 0) + 1);
    });

    const candidatesByBiome = new Map<BiomeId, Array<[number, number]>>();

    for (let y = 1; y < this.height - 1; y += 1) {
      for (let x = 1; x < this.width - 1; x += 1) {
        if (this.tileAt(x, y).kind === 'wall' && this.hasAdjacentFloor(x, y)) {
          const biome = this.biomeAt(x, y);
          const candidates = candidatesByBiome.get(biome) ?? [];
          candidates.push([x, y]);
          candidatesByBiome.set(biome, candidates);
        }
      }
    }

    this.activeBiomes.forEach((biomeId) => {
      const biome = BIOME_DEFINITIONS[biomeId];
      const profile = BIOME_MAP_PROFILES[biomeId];
      const candidates = candidatesByBiome.get(biomeId) ?? [];
      let placed = 0;
      const baseTargetCount = Math.max(3, Math.ceil((roomCounts.get(biomeId) ?? 0) * 1.4) + biome.danger + profile.nodeBonus);
      const targetCount = Math.ceil(baseTargetCount * this.nodeYieldMultiplier);

      while (placed < targetCount && candidates.length > 0) {
        const index = ROT.RNG.getUniformInt(0, candidates.length - 1);
        const [x, y] = candidates.splice(index, 1)[0];
        const tile = this.tileAt(x, y);
        tile.kind = biome.specialTile;
        tile.biome = biome.id;
        placed += 1;
      }
    });
  }

  private tryMovePlayer(dx: number, dy: number): TurnResult {
    if (dx === 0 && dy === 0) {
      return { usedTurn: false };
    }

    const player = this.player();
    const targetX = player.x + dx;
    const targetY = player.y + dy;
    const target = this.blockingEntityAt(targetX, targetY);

    if (target?.kind === 'monster') {
      this.pushMessage(`${target.name}が正面にいる。攻撃するには「使う」を押してください。`);
      return { usedTurn: false };
    }

    if (target?.kind === 'station') {
      this.pushMessage(`${target.name}がある。利用するには調べるを押してください。`);
      return { usedTurn: false };
    }

    if (!this.isWalkable(targetX, targetY)) {
      this.pushMessage('壁に行く手を阻まれた。');
      return { usedTurn: false };
    }

    player.x = targetX;
    player.y = targetY;
    this.spendStamina(STAMINA_COST_MOVE);
    return { usedTurn: true };
  }

  private face(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) {
      return;
    }

    this.facing = { x: Math.sign(dx), y: Math.sign(dy) };
  }

  private interactBase(): void {
    const station = this.stationForInteraction();
    if (!station) {
      const nearest = this.nearestStation();
      this.pushMessage(nearest ? `${nearest.name}は${directionFromPlayer(nearest, this.player())}にある。近づいて調べよう。` : '利用できる施設がない。');
      return;
    }

    this.useStation(station);
  }

  private interactRaid(): boolean {
    const player = this.player();
    const item = this.entities.find((entity) => entity.kind === 'item' && entity.x === player.x && entity.y === player.y);
    if (item) {
      return this.pickup();
    }

    const station = this.stationForInteraction();
    if (station?.station === 'barterMerchant') {
      return this.tradeWithBarterMerchant(station);
    }

    return this.extract();
  }

  private useStation(station: Entity): void {
    switch (station.station) {
      case 'raidGate':
        this.startRaid();
        return;
      case 'stash':
        this.pushMessage(this.stashSummary());
        return;
      case 'craft':
        this.craftItem('potion');
        return;
      case 'market':
        this.sellAllMaterials();
        return;
      case 'compendium':
        this.pushMessage('図鑑は右上の図鑑ボタンから確認できる。');
        return;
      case 'appraiser':
        this.appraiseCollection();
        return;
      default:
        this.pushMessage('ここでは何も起きない。');
    }
  }

  private tradeWithBarterMerchant(station: Entity): boolean {
    const biome = this.biomeAt(station.x, station.y);
    const trade = BARTER_TRADES[biome];
    const owned = this.raidInventory[trade.give];

    if (owned < trade.giveAmount) {
      this.pushMessage(`行商人: ${ITEM_DEFINITIONS[trade.give].name}を${trade.giveAmount}個持ってきたら${ITEM_DEFINITIONS[trade.get].name}と交換する。今は${owned}個。`);
      return false;
    }

    if (!canFitAdditionalUnit(this.raidInventory, this.gridLayouts.raidBag, trade.get, GRID_DIMENSIONS.raidBag) && this.raidInventory[trade.get] <= 0) {
      this.pushMessage('持ち帰りバッグがいっぱいで受け取れない。');
      return false;
    }

    this.raidInventory[trade.give] -= trade.giveAmount;
    this.raidInventory[trade.get] += 1;
    this.pushMessage(`行商人と取引し、${ITEM_DEFINITIONS[trade.give].name}x${trade.giveAmount}を${ITEM_DEFINITIONS[trade.get].name}と交換した。`);
    return true;
  }

  private pickup(): boolean {
    const player = this.player();
    const item = this.entities.find((entity) => entity.kind === 'item' && entity.x === player.x && entity.y === player.y);

    if (!item) {
      this.pushMessage('ここには何もない。');
      return false;
    }

    if (item.item) {
      if (!this.canCarry(item.item)) {
        this.pushMessage('バッグがいっぱいで拾えない。');
        return false;
      }

      this.addLootItem(item.item);
      if (item.mapRoll) {
        this.mapItemRolls[item.item] = [...(this.mapItemRolls[item.item] ?? []), item.mapRoll];
      }
      this.entities = this.entities.filter((entity) => entity.id !== item.id);
      this.pushMessage(`${ITEM_DEFINITIONS[item.item].name}を拾った。`);
      return true;
    }

    return false;
  }

  private useItem(item: ItemKind): boolean {
    const definition = ITEM_DEFINITIONS[item];
    const player = this.player();
    const stats = player.stats;

    if (definition.attackPower !== undefined) {
      this.pushMessage(`${definition.name}は正面に敵がいる時だけ使える。`);
      return false;
    }

    if (definition.staminaRestore) {
      const source = this.handInventory[item] > 0 ? this.handInventory : this.raidInventory[item] > 0 ? this.raidInventory : undefined;
      if (!source) {
        this.pushMessage(`${definition.name}を持っていない。`);
        return false;
      }

      if (this.stamina >= MAX_STAMINA) {
        this.pushMessage('スタミナはすでに満タンだ。');
        return false;
      }

      source[item] -= 1;
      if (source === this.handInventory) {
        this.syncSelectedHandItem();
      }
      const restored = Math.min(definition.staminaRestore, MAX_STAMINA - this.stamina);
      this.stamina += restored;
      this.pushMessage(`${definition.name}を食べてスタミナを${restored}回復した。`);
      return true;
    }

    if (definition.category !== 'consumable') {
      this.pushMessage(`${definition.name}はここでは使えない。`);
      return false;
    }

    if (!stats) {
      return false;
    }

    if (this.handInventory[item] <= 0) {
      this.pushMessage(`${definition.name}を持っていない。`);
      return false;
    }

    if (item === 'potion' || item === 'hiPotion' || item === 'bandage') {
      if (stats.hp >= stats.maxHp) {
        this.pushMessage('HPはすでに最大だ。');
        return false;
      }

      this.handInventory[item] -= 1;
      this.syncSelectedHandItem();
      const healAmount = item === 'hiPotion' ? 20 : item === 'bandage' ? 6 : 10;
      const healed = Math.min(healAmount, stats.maxHp - stats.hp);
      stats.hp += healed;
      this.pushMessage(`${definition.name}を使い、HPを${healed}回復した。`);
      return true;
    }

    this.handInventory[item] -= 1;
    this.syncSelectedHandItem();
    this.pushMessage(`${definition.name}を使った。`);
    return true;
  }

  private useHeldItem(): TurnResult {
    const item = this.selectedHandItem;
    const hasItem = item !== null && this.handInventory[item] > 0;
    const definition = hasItem ? ITEM_DEFINITIONS[item] : undefined;
    const isPickaxe = hasItem && item === 'pickaxe';
    const canAttack = !hasItem || definition?.attackPower !== undefined;

    if (canAttack) {
      const range = definition?.attackRange ?? 1;
      if (this.findFacingMonster(range)) {
        return this.performAttack(hasItem ? item : null);
      }
    }

    const player = this.player();
    const frontX = player.x + this.facing.x;
    const frontY = player.y + this.facing.y;
    const frontTarget = this.blockingEntityAt(frontX, frontY);

    if (frontTarget?.kind === 'monster') {
      this.pushMessage(`${definition?.name ?? 'それ'}では攻撃できない。`);
      return { usedTurn: false };
    }

    if (this.mode === 'raid' && this.inBounds(frontX, frontY)) {
      const frontTile = this.tileAt(frontX, frontY);
      const gatherable = this.isGatheringTile(frontTile.kind);

      if (gatherable || (isPickaxe && frontTile.kind === 'wall')) {
        const success = this.gatherFacing(isPickaxe);
        if (success && isPickaxe) {
          this.wearEquipment('pickaxe');
        }
        return { usedTurn: success };
      }
    }

    if (hasItem && item) {
      return { usedTurn: this.useItem(item) };
    }

    this.pushMessage('手に持っているアイテムがない。');
    return { usedTurn: false };
  }

  private findFacingMonster(range: number): Entity | undefined {
    const player = this.player();

    for (let step = 1; step <= range; step += 1) {
      const x = player.x + this.facing.x * step;
      const y = player.y + this.facing.y * step;
      if (!this.inBounds(x, y)) {
        break;
      }

      const tile = this.tileAt(x, y);
      if (tile.kind === 'wall' || this.isGatheringTile(tile.kind)) {
        break;
      }

      const target = this.blockingEntityAt(x, y);
      if (target?.kind === 'monster') {
        return target;
      }
    }

    return undefined;
  }

  private performAttack(item: ItemKind | null): TurnResult {
    const player = this.player();
    const definition = item ? ITEM_DEFINITIONS[item] : undefined;
    const attackBonus = definition?.attackPower ?? BAREHANDED_ATTACK_POWER;
    const attackElement = definition?.attackElement ?? BAREHANDED_ATTACK_ELEMENT;
    const range = definition?.attackRange ?? 1;

    const target = this.findFacingMonster(range);
    if (!target) {
      this.pushMessage(range <= 1 ? '正面に攻撃できる敵はいない。' : '攻撃が届く範囲に敵がいない。');
      return { usedTurn: false };
    }

    if (item) {
      if (definition?.category === 'equipment') {
        this.wearEquipment(item);
      } else {
        this.handInventory[item] -= 1;
        this.syncSelectedHandItem();
      }
    }

    this.spendStamina(item ? STAMINA_COST_TOOL_ACTION : STAMINA_COST_BAREHANDED_ATTACK);

    if (range <= 1) {
      this.resolveMeleeExchange(player, target, attackBonus, attackElement);
    } else {
      this.attack(player, target, attackBonus, attackElement);
    }

    return { usedTurn: true, skipEnemyId: range <= 1 ? target.id : undefined };
  }

  private gatherFacing(withTool: boolean): boolean {
    const player = this.player();
    const targetX = player.x + this.facing.x;
    const targetY = player.y + this.facing.y;

    if (!this.inBounds(targetX, targetY)) {
      this.pushMessage('そこは掘れない。');
      return false;
    }

    const tile = this.tileAt(targetX, targetY);
    const tileBiome = this.biomeAt(targetX, targetY);
    const gathered = this.isGatheringTile(tile.kind);
    const isVault = tile.kind === 'locked';

    if (!withTool && !gathered) {
      this.pushMessage('素手では壁を掘れない。ピッケルが必要。');
      return false;
    }

    if (tile.kind !== 'wall' && !gathered) {
      this.pushMessage('正面に採掘や採取ができる場所がない。');
      return false;
    }

    tile.kind = 'floor';
    tile.biome = tileBiome;
    tile.visible = true;
    tile.explored = true;
    this.spendStamina(withTool ? STAMINA_COST_TOOL_ACTION : STAMINA_COST_BAREHANDED_GATHER);

    if (gathered) {
      const biome = BIOME_DEFINITIONS[tileBiome];
      const result = isVault ? this.rollForVaultReward(tileBiome) : this.rollGatherReward(tileBiome);
      this.entities.push(createItemEntity(`node-${this.depth}-${++this.dropId}`, result.item, targetX, targetY, result.roll));
      const label = isVault ? '宝物庫' : biome.specialTileLabel;
      this.pushMessage(`${label}を${withTool ? '調べ' : '素手で漁り'}、${ITEM_DEFINITIONS[result.item].name}が落ちた。`);
    } else {
      this.pushMessage('壁を掘って通路を開けた。');
    }

    return true;
  }

  private rollGatherReward(biomeId: BiomeId): { item: ItemKind; roll?: MapRoll } {
    const collectionItem = this.rollForCollectionItem();
    if (collectionItem) {
      return { item: collectionItem };
    }

    const mapResult = this.rollForMapItem();
    if (mapResult) {
      return mapResult;
    }

    return { item: this.randomBiomeMaterial(biomeId) };
  }

  private rollForVaultReward(biomeId: BiomeId): { item: ItemKind; roll?: MapRoll } {
    const collectionItem = this.rollForCollectionItem();
    if (collectionItem) {
      return { item: collectionItem };
    }

    if (ROT.RNG.getUniform() < VAULT_MAP_ITEM_CHANCE) {
      const mapResult = this.rollForGuaranteedMapItem();
      if (mapResult) {
        return mapResult;
      }
    }

    const biome = BIOME_DEFINITIONS[biomeId];
    const pool = biome.materials.length > 0 ? biome.materials : biome.commonMaterials;
    return { item: pool[ROT.RNG.getUniformInt(0, pool.length - 1)] };
  }

  private rollForCollectionItem(): ItemKind | undefined {
    if (COLLECTION_KINDS.length === 0 || ROT.RNG.getUniform() >= COLLECTION_DROP_CHANCE * this.dropRateMultiplier) {
      return undefined;
    }

    return COLLECTION_KINDS[ROT.RNG.getUniformInt(0, COLLECTION_KINDS.length - 1)];
  }

  private rollForMapItem(): { item: ItemKind; roll: MapRoll } | undefined {
    if (ROT.RNG.getUniform() >= MAP_ITEM_DROP_CHANCE * this.dropRateMultiplier) {
      return undefined;
    }

    return this.rollForGuaranteedMapItem();
  }

  private rollForGuaranteedMapItem(): { item: ItemKind; roll: MapRoll } | undefined {
    if (MAP_ITEM_KINDS.length === 0) {
      return undefined;
    }

    const item = MAP_ITEM_KINDS[ROT.RNG.getUniformInt(0, MAP_ITEM_KINDS.length - 1)];
    const roll = rollMapRoll(`map-roll-${++this.mapRollSeq}`);
    return { item, roll };
  }

  private extract(): boolean {
    const player = this.player();

    if (this.tileAt(player.x, player.y).kind !== 'stairs') {
      this.pushMessage('ここは脱出地点ではない。');
      return false;
    }

    this.transferRaidInventoryToStash();
    this.createBase('脱出に成功した。持ち帰った物資を倉庫に移した。');
    return false;
  }

  private sellItem(item: ItemKind): void {
    if (this.mode !== 'base') {
      this.pushMessage('売却は拠点でのみ行える。');
      return;
    }

    if (this.stash[item] <= 0) {
      this.pushMessage(`${ITEM_DEFINITIONS[item].name}は倉庫にない。`);
      return;
    }

    this.stash[item] -= 1;
    if (ITEM_DEFINITIONS[item].category === 'equipment') {
      this.equipmentDurability[item]?.pop();
    }
    this.money += ITEM_DEFINITIONS[item].value;
    this.pushMessage(`${ITEM_DEFINITIONS[item].name}を${ITEM_DEFINITIONS[item].value}Gで売却した。`);
  }

  private appraiseCollection(): void {
    if (this.mode !== 'base') {
      this.pushMessage('鑑定は拠点でのみ行える。');
      return;
    }

    const owned = COLLECTION_KINDS.filter((item) => this.stash[item] > 0);
    if (owned.length === 0) {
      this.pushMessage('鑑定できるコレクションアイテムが倉庫にない。');
      return;
    }

    let total = 0;
    owned.forEach((item) => {
      total += ITEM_DEFINITIONS[item].value * this.stash[item];
      this.stash[item] = 0;
    });
    this.money += total;
    this.pushMessage(`鑑定士がコレクションアイテムを鑑定し、${total}Gで買い取った。`);
  }

  private craftItem(recipeId: RecipeId): void {
    if (this.mode !== 'base') {
      this.pushMessage('クラフトは拠点でのみ行える。');
      return;
    }

    const recipe = recipeById(recipeId);
    if (!recipe) {
      this.pushMessage('そのレシピはまだ使えない。');
      return;
    }

    if (!hasIngredients(this.stash, recipe)) {
      this.pushMessage(`${formatStack(recipe.result)}の素材が足りない。`);
      return;
    }

    consumeIngredients(this.stash, recipe);
    addRecipeResult(this.stash, recipe);
    if (ITEM_DEFINITIONS[recipe.result.item].category === 'equipment') {
      this.grantEquipmentInstances(recipe.result.item, recipe.result.amount);
    }
    this.pushMessage(`${formatStack(recipe.result)}をクラフトした。`);
  }

  private moveItem(item: ItemKind, from: InventoryLocation, to: InventoryLocation, x?: number, y?: number): void {
    if (from === to) {
      return;
    }

    const source = this.inventoryForLocation(from);
    const target = this.inventoryForLocation(to);

    if (!source || !target) {
      this.pushMessage('その移動は今はできない。');
      return;
    }

    if (source[item] <= 0) {
      this.pushMessage(`${ITEM_DEFINITIONS[item].name}は移動元にない。`);
      return;
    }

    if (to === 'hand' && !this.canMoveToHand(item)) {
      this.pushMessage(`${ITEM_DEFINITIONS[item].name}は手持ちに入れられない。`);
      return;
    }

    if (!canFitAdditionalUnit(target, this.gridLayouts[to], item, GRID_DIMENSIONS[to])) {
      this.pushMessage(`${inventoryLocationLabel(to)}のマスが足りず移動できない。`);
      return;
    }

    source[item] -= 1;
    target[item] += 1;

    if (x !== undefined && y !== undefined) {
      const definition = ITEM_DEFINITIONS[item];
      const { width, height } = definition.gridSize;
      const layout = this.gridLayouts[to];
      const { cols, rows } = GRID_DIMENSIONS[to];
      const clampedX = Math.max(0, Math.min(cols - width, x));
      const clampedY = Math.max(0, Math.min(rows - height, y));
      const blocked = layout.some((entry) => entry.item !== item && overlaps(entry, clampedX, clampedY, width, height));
      if (!blocked) {
        layout.push({ item, x: clampedX, y: clampedY, width, height });
      }
    }

    if (this.mode === 'raid') {
      this.syncSelectedHandItem(to === 'hand' ? item : undefined);
    }

    this.pushMessage(`${ITEM_DEFINITIONS[item].name}を${inventoryLocationLabel(to)}へ移した。`);
  }

  private placeItem(item: ItemKind, location: InventoryLocation, x: number, y: number): void {
    const inventory = this.inventoryForLocation(location);
    if (!inventory || inventory[item] <= 0) {
      return;
    }

    const layout = this.gridLayouts[location];
    const entry = layout.find((placed) => placed.item === item);
    if (!entry) {
      return;
    }

    const { cols, rows } = GRID_DIMENSIONS[location];
    const clampedX = Math.max(0, Math.min(cols - entry.width, x));
    const clampedY = Math.max(0, Math.min(rows - entry.height, y));

    const blocked = layout.some((other) => other !== entry && overlaps(other, clampedX, clampedY, entry.width, entry.height));
    if (blocked) {
      this.pushMessage('そのマスには別のアイテムがある。');
      return;
    }

    entry.x = clampedX;
    entry.y = clampedY;
  }

  private debugGiveItem(item: ItemKind, amount: number): void {
    if (!this.debugMode) {
      this.pushMessage('デバッグモードが無効なので入手できない。');
      return;
    }

    if (amount <= 0) {
      return;
    }

    const definition = ITEM_DEFINITIONS[item];
    if (definition.category === 'equipment') {
      this.grantEquipmentInstances(item, amount);
    }

    if (definition.category === 'map') {
      for (let index = 0; index < amount; index += 1) {
        const roll = rollMapRoll(`map-roll-${++this.mapRollSeq}`);
        this.mapItemRolls[item] = [...(this.mapItemRolls[item] ?? []), roll];
      }
    }

    if (this.mode === 'raid') {
      this.addLootItem(item, amount);
    } else {
      this.addItem(item, amount);
    }

    this.pushMessage(`[デバッグ] ${definition.name}をx${amount}入手した。`);
  }

  private debugSpawnEnemy(enemy: EnemyKind, x: number, y: number): void {
    if (!this.debugMode) {
      this.pushMessage('デバッグモードが無効なので配置できない。');
      return;
    }

    if (!this.inBounds(x, y) || !this.isWalkable(x, y) || this.blockingEntityAt(x, y)) {
      this.pushMessage('そこには配置できない。');
      return;
    }

    const definition = ENEMY_DEFINITIONS[enemy];
    const dangerBonus = Math.max(0, this.depth - 1);
    this.entities.push({
      id: `debug-monster-${++this.dropId}`,
      kind: 'monster',
      name: definition.name,
      glyph: definition.glyph,
      color: definition.color,
      x,
      y,
      blocks: true,
      ai: 'hostile',
      enemy,
      stats: scaledEnemyStats(enemy, dangerBonus),
    });
    this.pushMessage(`[デバッグ] ${definition.name}を配置した。`);
  }

  private sellAllMaterials(): void {
    const sellable = Object.entries(this.stash).filter(([item, count]) => ITEM_DEFINITIONS[item as ItemKind].category === 'material' && count > 0);
    if (sellable.length === 0) {
      this.pushMessage('売却できる素材が倉庫にない。');
      return;
    }

    const total = sellable.reduce((sum, [item, count]) => sum + ITEM_DEFINITIONS[item as ItemKind].value * count, 0);
    sellable.forEach(([item]) => {
      this.stash[item as ItemKind] = 0;
    });
    this.money += total;
    this.pushMessage(`素材をまとめて売却し、${total}Gを得た。`);
  }

  private enemyTurn(skipEnemyId?: string): void {
    const player = this.player();
    const monsters = this.entities
      .filter((entity) => entity.kind === 'monster' && entity.id !== skipEnemyId && entity.stats)
      .sort(compareActionOrder);

    monsters.forEach((monster) => {
      if (!monster.stats || this.gameOver || !this.isEntityAlive(monster.id)) {
        return;
      }

      const distance = chebyshev(monster, player);
      if (distance <= 1) {
        this.attack(monster, player);
        return;
      }

      if (distance > 10) {
        this.wander(monster);
        return;
      }

      this.stepToward(monster, player);
    });
  }

  private resolveMeleeExchange(player: Entity, monster: Entity, playerAttackBonus: number, playerAttackElement: ElementId): void {
    const actors = [player, monster].sort(compareActionOrder);

    actors.forEach((actor) => {
      if (this.gameOver || !this.isEntityAlive(actor.id)) {
        return;
      }

      const target = actor.id === player.id ? this.entityById(monster.id) : this.entityById(player.id);
      if (!target || !target.stats || chebyshev(actor, target) > 1) {
        return;
      }

      if (actor.id === player.id) {
        this.attack(actor, target, playerAttackBonus, playerAttackElement);
      } else {
        this.attack(actor, target);
      }
    });
  }

  private stepToward(monster: Entity, player: Entity): void {
    const passable = (x: number, y: number) => this.isWalkable(x, y) && !this.blockingEntityAt(x, y, monster.id);
    const path = new ROT.Path.AStar(player.x, player.y, passable, { topology: 8 });
    const steps: Array<[number, number]> = [];

    path.compute(monster.x, monster.y, (x, y) => {
      steps.push([x, y]);
    });

    const next = steps[1];
    if (!next) {
      return;
    }

    monster.x = next[0];
    monster.y = next[1];
  }

  private wander(monster: Entity): void {
    if (ROT.RNG.getUniform() > 0.18) {
      return;
    }

    const dx = ROT.RNG.getUniformInt(-1, 1);
    const dy = ROT.RNG.getUniformInt(-1, 1);
    const nextX = monster.x + dx;
    const nextY = monster.y + dy;

    if ((dx !== 0 || dy !== 0) && this.isWalkable(nextX, nextY) && !this.blockingEntityAt(nextX, nextY, monster.id)) {
      monster.x = nextX;
      monster.y = nextY;
    }
  }

  private attack(attacker: Entity, defender: Entity, attackerBonus = 0, attackerElement?: ElementId): void {
    if (!attacker.stats || !defender.stats) {
      return;
    }

    const resolvedElement = attackerElement ?? (attacker.enemy ? ENEMY_DEFINITIONS[attacker.enemy].attackElement : undefined);
    const defenderWeakness = defender.enemy ? ENEMY_DEFINITIONS[defender.enemy].weakness : undefined;
    const defenderResistance = defender.kind === 'player' ? this.playerArmorResistance() : defender.enemy ? ENEMY_DEFINITIONS[defender.enemy].resistance : undefined;

    const rawDamage = Math.max(0, attacker.stats.attack + attackerBonus - defender.stats.defense) + ROT.RNG.getUniformInt(-1, 2);
    const multiplier = elementMultiplier(resolvedElement, defenderWeakness, defenderResistance);
    const damage = Math.max(1, Math.round(rawDamage * multiplier));

    defender.stats.hp = Math.max(0, defender.stats.hp - damage);
    this.pushCombatEffect(attacker, defender, damage);
    this.pushMessage(attackMessage(attacker, defender, damage, multiplier));

    if (defender.stats.hp <= 0) {
      this.kill(defender, attacker);
    }
  }

  private playerArmorResistance(): ElementId | undefined {
    const armorItem = ARMOR_KINDS.find((item) => this.handInventory[item] > 0);
    return armorItem ? ITEM_DEFINITIONS[armorItem].resistance : undefined;
  }

  private kill(entity: Entity, killer: Entity): void {
    if (entity.kind === 'player') {
      this.gameOver = true;
      return;
    }

    this.entities = this.entities.filter((candidate) => candidate.id !== entity.id);
    if (killer.kind === 'player') {
      this.xp += 1;
      this.pushMessage(`${entity.name}を倒した。`);
      this.dropMaterial(entity);
    }
  }

  private finalizeDeath(): void {
    STARTING_EQUIPMENT.forEach((item) => {
      const lostCount = this.handInventory[item];
      if (lostCount > 0) {
        const remaining = this.equipmentDurability[item] ?? [];
        this.equipmentDurability[item] = remaining.slice(0, Math.max(0, remaining.length - lostCount));
      }
    });
    this.raidInventory = createEmptyInventory();
    this.handInventory = createEmptyInventory();
    this.selectedHandItem = null;
    this.createBase('探索に失敗した。探索中の荷物は失われた。');
  }

  private updateFov(): void {
    this.tiles.forEach((tile) => {
      tile.visible = false;
    });

    const player = this.player();
    const fov = new ROT.FOV.PreciseShadowcasting((x, y) => this.inBounds(x, y) && this.tileAt(x, y).kind !== 'wall' && !this.isGatheringTile(this.tileAt(x, y).kind));

    fov.compute(player.x, player.y, FOV_RADIUS, (x, y) => {
      const tile = this.tileAt(x, y);
      tile.visible = true;
      tile.explored = true;
    });
  }

  private biomeAt(x: number, y: number): BiomeId {
    return this.inBounds(x, y) ? this.tileAt(x, y).biome ?? 'mine' : 'mine';
  }

  private randomBiomeMaterial(biomeId: BiomeId): ItemKind {
    const biome = BIOME_DEFINITIONS[biomeId];
    const pool = biome.commonMaterials;
    const index = ROT.RNG.getUniformInt(0, pool.length - 1);
    return pool[index] ?? biome.materials[0] ?? 'ironOre';
  }

  private isGatheringTile(kind: TileKind): boolean {
    return kind === 'ore' || kind === 'forage' || kind === 'crate' || kind === 'device' || kind === 'locked';
  }

  private tileAt(x: number, y: number): Tile {
    return this.tiles[indexAt(x, y, this.width)];
  }

  private player(): Entity {
    const player = this.entities.find((entity) => entity.id === PLAYER_ID);
    if (!player) {
      throw new Error('Player entity is missing.');
    }

    return player;
  }

  private stationForInteraction(): Entity | undefined {
    const player = this.player();
    const inFront = this.entities.find(
      (entity) =>
        entity.kind === 'station' &&
        entity.x === player.x + this.facing.x &&
        entity.y === player.y + this.facing.y,
    );
    if (inFront) {
      return inFront;
    }

    return this.entities
      .filter((entity) => entity.kind === 'station' && chebyshev(entity, player) <= 1)
      .sort((a, b) => a.id.localeCompare(b.id))[0];
  }

  private nearestStation(): Entity | undefined {
    const player = this.player();
    return this.entities
      .filter((entity) => entity.kind === 'station')
      .sort((a, b) => chebyshev(a, player) - chebyshev(b, player))[0];
  }

  private stashSummary(): string {
    const entries = Object.entries(this.stash)
      .filter(([, count]) => count > 0)
      .map(([item, count]) => `${ITEM_DEFINITIONS[item as ItemKind].name}×${count}`);

    return entries.length > 0 ? `倉庫: ${entries.join(' / ')}。所持金 ${this.money}G。` : `倉庫は空。所持金 ${this.money}G。`;
  }

  private isWalkable(x: number, y: number): boolean {
    return this.inBounds(x, y) && (this.tileAt(x, y).kind === 'floor' || this.tileAt(x, y).kind === 'stairs');
  }

  private hasAdjacentFloor(x: number, y: number): boolean {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if ((dx !== 0 || dy !== 0) && this.inBounds(x + dx, y + dy) && this.tileAt(x + dx, y + dy).kind === 'floor') {
          return true;
        }
      }
    }

    return false;
  }

  private blockingEntityAt(x: number, y: number, exceptId?: string): Entity | undefined {
    return this.entities.find((entity) => entity.id !== exceptId && entity.blocks && entity.x === x && entity.y === y);
  }

  private entityById(id: string): Entity | undefined {
    return this.entities.find((entity) => entity.id === id);
  }

  private isEntityAlive(id: string): boolean {
    return this.entities.some((entity) => entity.id === id && (!entity.stats || entity.stats.hp > 0));
  }

  private inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  private pushMessage(message: string): void {
    this.messages = [...this.messages, message].slice(-8);
  }

  private addItem(item: ItemKind, amount = 1): void {
    this.stash[item] += amount;
  }

  private addLootItem(item: ItemKind, amount = 1): void {
    if (ITEM_DEFINITIONS[item].category === 'consumable' || ITEM_DEFINITIONS[item].category === 'equipment') {
      this.handInventory[item] += amount;
      this.syncSelectedHandItem(item);
      return;
    }

    this.raidInventory[item] += amount;
  }

  private canCarry(item: ItemKind): boolean {
    if (ITEM_DEFINITIONS[item].category === 'consumable' || ITEM_DEFINITIONS[item].category === 'equipment') {
      return canFitAdditionalUnit(this.handInventory, this.gridLayouts.hand, item, GRID_DIMENSIONS.hand);
    }

    return canFitAdditionalUnit(this.raidInventory, this.gridLayouts.raidBag, item, GRID_DIMENSIONS.raidBag);
  }

  private transferRaidInventoryToStash(): void {
    this.transferInventoryToStash(this.handInventory);
    this.handInventory = createEmptyInventory();
    this.selectedHandItem = null;
    this.transferInventoryToStash(this.raidInventory);
    this.raidInventory = createEmptyInventory();
    this.baseLoadout = createEmptyInventory();
    this.prepareBaseLoadout();
  }

  private transferInventoryToStash(inventory: Inventory): void {
    ITEM_KINDS.forEach((item) => {
      this.addItem(item, inventory[item]);
    });
  }

  private selectHandItem(direction: -1 | 1): void {
    const items = this.availableHandItems();
    if (items.length === 0) {
      this.selectedHandItem = null;
      this.pushMessage('手持ちアイテムがありません。');
      return;
    }

    const currentIndex = this.selectedHandItem ? items.indexOf(this.selectedHandItem) : -1;
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + direction + items.length) % items.length;
    this.selectedHandItem = items[nextIndex];
    this.pushMessage(`${ITEM_DEFINITIONS[this.selectedHandItem].name}を手に持った。`);
  }

  private syncSelectedHandItem(preferred?: ItemKind): void {
    if (preferred && this.handInventory[preferred] > 0) {
      this.selectedHandItem = preferred;
      return;
    }

    if (this.selectedHandItem && this.handInventory[this.selectedHandItem] > 0) {
      return;
    }

    this.selectedHandItem = this.availableHandItems()[0] ?? null;
  }

  private inventoryForLocation(location: InventoryLocation): Inventory | undefined {
    if (this.mode === 'base') {
      if (location === 'hand') {
        return this.baseLoadout;
      }
      if (location === 'stash') {
        return this.stash;
      }
      return undefined;
    }

    if (location === 'hand') {
      return this.handInventory;
    }
    if (location === 'raidBag') {
      return this.raidInventory;
    }
    return undefined;
  }

  private prepareBaseLoadout(): void {
    BASE_LOADOUT_ITEMS.forEach((item) => {
      if (this.stash[item] <= 0) {
        return;
      }

      const layout = layoutGridInventory(this.baseLoadout, this.gridLayouts.hand, this.equipmentDurability, this.mapItemRolls, GRID_DIMENSIONS.hand);
      if (!canFitAdditionalUnit(this.baseLoadout, layout, item, GRID_DIMENSIONS.hand)) {
        return;
      }

      this.stash[item] -= 1;
      this.baseLoadout[item] += 1;
      this.gridLayouts.hand = layoutGridInventory(this.baseLoadout, layout, this.equipmentDurability, this.mapItemRolls, GRID_DIMENSIONS.hand);
    });
  }

  private transferBaseLoadoutToHand(): void {
    ITEM_KINDS.forEach((item) => {
      this.handInventory[item] += this.baseLoadout[item];
    });
    this.baseLoadout = createEmptyInventory();
  }

  private canMoveToHand(item: ItemKind): boolean {
    const definition = ITEM_DEFINITIONS[item];
    return definition.category === 'consumable' || definition.category === 'equipment' || Boolean(definition.staminaRestore);
  }

  private availableHandItems(): ItemKind[] {
    return ITEM_KINDS.filter((item) => this.handInventory[item] > 0);
  }

  private dropMaterial(entity: Entity): void {
    const item = entity.enemy ? chooseEnemyDrop(entity.enemy, ROT.RNG.getUniform()) : this.randomBiomeMaterial(this.biomeAt(entity.x, entity.y));
    const definition = ITEM_DEFINITIONS[item];
    this.entities.push(createItemEntity(`drop-${this.depth}-${++this.dropId}`, item, entity.x, entity.y));
    this.pushMessage(`${entity.name}が${definition.name}を落とした。`);
  }

  private spendStamina(amount: number): void {
    if (this.mode !== 'raid') {
      return;
    }

    const wasEmpty = this.stamina <= 0;
    this.stamina = Math.max(0, this.stamina - amount);

    if (wasEmpty) {
      const player = this.player();
      if (player.stats) {
        player.stats.hp -= 1;
        this.pushMessage('スタミナ切れで体力が1減った。食べ物でスタミナを回復しよう。');
        if (player.stats.hp <= 0) {
          this.kill(player, player);
        }
      }
    }
  }

  private grantEquipmentInstances(item: ItemKind, amount: number): void {
    const maxDurability = ITEM_DEFINITIONS[item].maxDurability;
    if (maxDurability === undefined) {
      return;
    }

    const existing = this.equipmentDurability[item] ?? [];
    this.equipmentDurability[item] = [...existing, ...Array.from({ length: amount }, () => maxDurability)];
  }

  private wearEquipment(item: ItemKind): void {
    const maxDurability = ITEM_DEFINITIONS[item].maxDurability;
    if (maxDurability === undefined) {
      return;
    }

    const units = this.equipmentDurability[item];
    if (!units || units.length === 0) {
      return;
    }

    units[0] -= 1;
    if (units[0] <= 0) {
      units.shift();
      this.handInventory[item] = Math.max(0, this.handInventory[item] - 1);
      this.pushMessage(`${ITEM_DEFINITIONS[item].name}の耐久値が尽きて壊れた。拠点で作り直そう。`);
      this.syncSelectedHandItem();
    }
  }

  private pushCombatEffect(attacker: Entity, defender: Entity, damage: number): void {
    this.combatEffects = [
      {
        id: ++this.effectId,
        attackerId: attacker.id,
        defenderId: defender.id,
        attackerKind: attacker.kind,
        defenderKind: defender.kind,
        attackerName: attacker.name,
        defenderName: defender.name,
        damage,
        from: { x: attacker.x, y: attacker.y },
        to: { x: defender.x, y: defender.y },
      },
      ...this.combatEffects,
    ].slice(0, 12);
  }
}

const roomCenter = (room: RoomLike): [number, number] => {
  const [x = 0, y = 0] = room.getCenter();
  return [x, y];
};

const createItemEntity = (id: string, item: ItemKind, x: number, y: number, mapRoll?: MapRoll): Entity => {
  const definition = ITEM_DEFINITIONS[item];
  return {
    id,
    kind: 'item',
    name: definition.name,
    glyph: definition.glyph,
    color: definition.color,
    x,
    y,
    blocks: false,
    item,
    mapRoll,
  };
};

const createStationEntity = (id: string, station: StationKind, name: string, glyph: string, color: string, x: number, y: number): Entity => ({
  id,
  kind: 'station',
  name,
  glyph,
  color,
  x,
  y,
  blocks: true,
  station,
});

const directionFromPlayer = (target: Entity, player: Entity) => {
  const dx = Math.sign(target.x - player.x);
  const dy = Math.sign(target.y - player.y);

  if (dx === 0 && dy < 0) {
    return '北';
  }
  if (dx > 0 && dy < 0) {
    return '北東';
  }
  if (dx > 0 && dy === 0) {
    return '東';
  }
  if (dx > 0 && dy > 0) {
    return '南東';
  }
  if (dx === 0 && dy > 0) {
    return '南';
  }
  if (dx < 0 && dy > 0) {
    return '南西';
  }
  if (dx < 0 && dy === 0) {
    return '西';
  }
  return '北西';
};

const elementMultiplier = (element: ElementId | undefined, weakness?: ElementId, resistance?: ElementId): number => {
  if (!element) {
    return 1;
  }
  if (element === weakness) {
    return 2;
  }
  if (element === resistance) {
    return 0.5;
  }
  return 1;
};

const attackMessage = (attacker: Entity, defender: Entity, damage: number, multiplier: number) => {
  const suffix = multiplier > 1 ? ' 弱点を突いた！' : multiplier < 1 ? ' 耐性で軽減された。' : '';

  if (attacker.kind === 'player') {
    return `${defender.name}に${damage}ダメージを与えた。${suffix}`;
  }

  if (defender.kind === 'player') {
    return `${attacker.name}から${damage}ダメージを受けた。${suffix}`;
  }

  return `${attacker.name}が${defender.name}に${damage}ダメージを与えた。${suffix}`;
};

const inventoryLocationLabel = (location: InventoryLocation) => {
  if (location === 'hand') {
    return '手持ち';
  }
  if (location === 'stash') {
    return '倉庫';
  }
  return '持ち帰りバッグ';
};

const compareActionOrder = (a: Entity, b: Entity) => {
  const speedDifference = (b.stats?.speed ?? 0) - (a.stats?.speed ?? 0);
  if (speedDifference !== 0) {
    return speedDifference;
  }

  if (a.kind === 'player' && b.kind !== 'player') {
    return -1;
  }

  if (b.kind === 'player' && a.kind !== 'player') {
    return 1;
  }

  return a.id.localeCompare(b.id);
};

const nearestBiome = (x: number, y: number, roomCenters: Array<{ x: number; y: number; biome: BiomeId }>): BiomeId => {
  let nearest = roomCenters[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  roomCenters.forEach((center) => {
    const distance = Math.abs(center.x - x) + Math.abs(center.y - y);
    if (distance < nearestDistance) {
      nearest = center;
      nearestDistance = distance;
    }
  });

  return nearest?.biome ?? 'mine';
};
