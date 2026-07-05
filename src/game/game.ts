import * as ROT from 'rot-js';
import { chebyshev, indexAt } from '../engine/grid';
import type { BiomeId, CombatEffect, Command, Entity, GameMode, GameSnapshot, Inventory, InventoryLocation, ItemKind, RecipeId, StationKind, Tile, TileKind } from '../engine/types';
import { BIOME_DEFINITIONS } from './biomes';
import { chooseEnemyDrop, chooseEnemyKind, ENEMY_DEFINITIONS, scaledEnemyStats } from './enemies';
import { createEmptyInventory, createStartingStash, inventoryItemCount, ITEM_DEFINITIONS, ITEM_KINDS, RAID_CAPACITY } from './items';
import { addRecipeResult, consumeIngredients, formatStack, hasIngredients, recipeById } from './recipes';

const MAP_WIDTH = 56;
const MAP_HEIGHT = 34;
const BASE_WIDTH = 34;
const BASE_HEIGHT = 24;
const FOV_RADIUS = 9;
const PLAYER_ID = 'player';
const HAND_CAPACITY = 6;
const BASE_LOADOUT_ITEMS: ItemKind[] = ['potion', 'sword', 'bow', 'pickaxe'];

type RoomLike = {
  getCenter(): number[];
};

type TurnResult = {
  usedTurn: boolean;
  skipEnemyId?: string;
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
  private stash: Inventory = createStartingStash();
  private baseLoadout: Inventory = createEmptyInventory();
  private raidInventory: Inventory = createEmptyInventory();
  private handInventory: Inventory = createEmptyInventory();
  private selectedHandItem: ItemKind | null = null;
  private money = 0;
  private dropId = 0;
  private facing = { x: 0, y: 1 };
  private gameOver = false;

  constructor() {
    this.restart();
  }

  snapshot(): GameSnapshot {
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
    };
  }

  dispatch(command: Command): void {
    if (command.type === 'restart') {
      this.restart();
      return;
    }

    if (command.type === 'startRaid') {
      this.startRaid(command.biome);
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

    if (command.type === 'moveItem') {
      this.moveItem(command.item, command.from, command.to);
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

    if (this.gameOver) {
      this.pushMessage('倒れています。再開してやり直してください。');
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
      case 'attack':
        turnResult = this.attackFacing();
        break;
      case 'wait':
        this.pushMessage('ダンジョンの気配に耳を澄ませた。');
        turnResult = { usedTurn: true };
        break;
      case 'pickup':
        turnResult = { usedTurn: this.pickup() };
        break;
      case 'useItem':
        turnResult = { usedTurn: this.useItem(command.item) };
        break;
      case 'useHeldItem':
        turnResult = { usedTurn: this.useHeldItem() };
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
      case 'attack':
        this.pushMessage('拠点で攻撃する相手はいない。');
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
        return;
      case 'startRaid':
      case 'sellItem':
      case 'craftItem':
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
    this.stash = createStartingStash();
    this.baseLoadout = createEmptyInventory();
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
    this.createBase('拠点に戻った。施設の隣で調べると利用できる。');
  }

  private startRaid(biome: BiomeId = 'mine'): void {
    if (this.mode === 'raid') {
      return;
    }

    this.mode = 'raid';
    this.biome = biome;
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
    this.generateLevel(`${BIOME_DEFINITIONS[biome].name}へ出撃した。物資を集めて脱出地点を目指そう。`);
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
      createStationEntity('station-market', 'market', '換金所', '$', '#fcd34d', 8, 17),
      createStationEntity('station-compendium', 'compendium', '図鑑端末', '?', '#c4b5fd', 26, 17),
    ];
    this.messages = [entryMessage, '出撃ゲート、倉庫、クラフト台、換金所、図鑑端末がある。'];
  }

  private generateLevel(entryMessage: string): void {
    ROT.RNG.setSeed(this.seed + this.depth * 1009);
    this.tiles = Array.from({ length: this.width * this.height }, () => ({
      kind: 'wall',
      visible: false,
      explored: false,
    }));
    this.entities = [];

    const digger = new ROT.Map.Digger(this.width, this.height, {
      roomWidth: [4, 10],
      roomHeight: [4, 8],
      corridorLength: [2, 8],
      dugPercentage: 0.22,
    });

    digger.create((x, y, value) => {
      this.tileAt(x, y).kind = value === 0 ? 'floor' : 'wall';
    });

    const rooms = digger.getRooms() as RoomLike[];
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
    this.populateRooms(rooms.slice(1, -1));
    this.placeGatheringNodes();
    this.messages = [entryMessage];
    this.updateFov();
  }

  private populateRooms(rooms: RoomLike[]): void {
    const biome = this.currentBiome();
    let monsterIndex = 0;
    let itemIndex = 0;

    rooms.forEach((room, roomIndex) => {
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
          stats: scaledEnemyStats(enemy, biome.danger + this.depth - 1),
        });
      }

      if ((roomIndex + this.depth) % 3 === 0) {
        const itemX = cx + (ROT.RNG.getUniform() < 0.5 ? -1 : 1);
        const itemY = cy;
        if (this.isWalkable(itemX, itemY)) {
          this.entities.push(createItemEntity(`loose-${this.depth}-${itemIndex++}`, this.randomBiomeMaterial(), itemX, itemY));
        }
      }
    });
  }

  private placeGatheringNodes(): void {
    const biome = this.currentBiome();
    let placed = 0;
    const targetCount = 8 + biome.danger * 2 + this.depth;
    const candidates: Array<[number, number]> = [];

    for (let y = 1; y < this.height - 1; y += 1) {
      for (let x = 1; x < this.width - 1; x += 1) {
        if (this.tileAt(x, y).kind === 'wall' && this.hasAdjacentFloor(x, y)) {
          candidates.push([x, y]);
        }
      }
    }

    while (placed < targetCount && candidates.length > 0) {
      const index = ROT.RNG.getUniformInt(0, candidates.length - 1);
      const [x, y] = candidates.splice(index, 1)[0];
      this.tileAt(x, y).kind = biome.specialTile;
      placed += 1;
    }
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
      this.pushMessage(`${target.name}が正面にいる。攻撃するには攻撃を押してください。`);
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
    return { usedTurn: true };
  }

  private attackFacing(): TurnResult {
    const player = this.player();
    const target = this.blockingEntityAt(player.x + this.facing.x, player.y + this.facing.y);

    if (target?.kind !== 'monster') {
      this.pushMessage('正面に攻撃できる敵はいない。');
      return { usedTurn: false };
    }

    this.resolveMeleeExchange(player, target);
    return { usedTurn: true, skipEnemyId: target.id };
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
      default:
        this.pushMessage('ここでは何も起きない。');
    }
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
      this.entities = this.entities.filter((entity) => entity.id !== item.id);
      this.pushMessage(`${ITEM_DEFINITIONS[item.item].name}を拾った。`);
      return true;
    }

    return false;
  }

  private useItem(item: ItemKind): boolean {
    const definition = ITEM_DEFINITIONS[item];
    if (definition.category !== 'consumable') {
      this.pushMessage(`${definition.name}はここでは使えない。`);
      return false;
    }

    const player = this.player();
    const stats = player.stats;

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
    this.pushMessage(`${definition.name}を使った。詳しい効果は今後の状態異常/投擲実装で拡張する。`);
    return true;
  }

  private useHeldItem(): boolean {
    const item = this.selectedHandItem;
    if (!item || this.handInventory[item] <= 0) {
      this.pushMessage('手に持っているアイテムがない。');
      return false;
    }

    if (item === 'pickaxe') {
      return this.mineFacing();
    }

    if (item === 'sword') {
      return this.attackFacing().usedTurn;
    }

    if (item === 'bow') {
      return this.shootFacing();
    }

    return this.useItem(item);
  }

  private mineFacing(): boolean {
    const player = this.player();
    const targetX = player.x + this.facing.x;
    const targetY = player.y + this.facing.y;

    if (!this.inBounds(targetX, targetY)) {
      this.pushMessage('そこは掘れない。');
      return false;
    }

    const tile = this.tileAt(targetX, targetY);
    if (tile.kind !== 'wall' && !this.isGatheringTile(tile.kind)) {
      this.pushMessage('正面に採掘や採取ができる場所がない。');
      return false;
    }

    const gathered = this.isGatheringTile(tile.kind);
    tile.kind = 'floor';
    tile.visible = true;
    tile.explored = true;

    if (gathered) {
      const item = this.randomBiomeMaterial();
      this.entities.push(createItemEntity(`node-${this.depth}-${++this.dropId}`, item, targetX, targetY));
      this.pushMessage(`${this.currentBiome().specialTileLabel}を調べ、${ITEM_DEFINITIONS[item].name}が落ちた。`);
    } else {
      this.pushMessage('壁を掘って通路を開けた。');
    }

    return true;
  }

  private shootFacing(): boolean {
    const player = this.player();
    const range = 5;

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
        this.attack(player, target);
        return true;
      }
    }

    this.pushMessage('弓で狙える敵がいない。');
    return false;
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
    this.money += ITEM_DEFINITIONS[item].value;
    this.pushMessage(`${ITEM_DEFINITIONS[item].name}を${ITEM_DEFINITIONS[item].value}Gで売却した。`);
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
    this.pushMessage(`${formatStack(recipe.result)}をクラフトした。`);
  }

  private moveItem(item: ItemKind, from: InventoryLocation, to: InventoryLocation): void {
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

    if (to === 'hand' && inventoryItemCount(target) >= HAND_CAPACITY) {
      this.pushMessage('手持ちがいっぱいで移動できない。');
      return;
    }

    if (to === 'raidBag' && inventoryItemCount(target) >= RAID_CAPACITY) {
      this.pushMessage('持ち帰りバッグがいっぱいで移動できない。');
      return;
    }

    source[item] -= 1;
    target[item] += 1;

    if (this.mode === 'raid') {
      this.syncSelectedHandItem(to === 'hand' ? item : undefined);
    }

    this.pushMessage(`${ITEM_DEFINITIONS[item].name}を${inventoryLocationLabel(to)}へ移した。`);
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

  private resolveMeleeExchange(player: Entity, monster: Entity): void {
    const actors = [player, monster].sort(compareActionOrder);

    actors.forEach((actor) => {
      if (this.gameOver || !this.isEntityAlive(actor.id)) {
        return;
      }

      const target = actor.id === player.id ? this.entityById(monster.id) : this.entityById(player.id);
      if (!target || !target.stats || chebyshev(actor, target) > 1) {
        return;
      }

      this.attack(actor, target);
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

  private attack(attacker: Entity, defender: Entity): void {
    if (!attacker.stats || !defender.stats) {
      return;
    }

    const damage = Math.max(1, attacker.stats.attack - defender.stats.defense + ROT.RNG.getUniformInt(-1, 2));
    defender.stats.hp -= damage;
    this.pushCombatEffect(attacker, defender, damage);
    this.pushMessage(attackMessage(attacker, defender, damage));

    if (defender.stats.hp <= 0) {
      this.kill(defender, attacker);
    }
  }

  private kill(entity: Entity, killer: Entity): void {
    if (entity.kind === 'player') {
      this.gameOver = true;
      this.raidInventory = createEmptyInventory();
      this.handInventory = createEmptyInventory();
      this.selectedHandItem = null;
      this.createBase('探索に失敗した。探索中の荷物は失われた。');
      return;
    }

    this.entities = this.entities.filter((candidate) => candidate.id !== entity.id);
    if (killer.kind === 'player') {
      this.xp += 1;
      this.pushMessage(`${entity.name}を倒した。`);
      this.dropMaterial(entity);
    }
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

  private currentBiome() {
    return BIOME_DEFINITIONS[this.biome ?? 'mine'];
  }

  private randomBiomeMaterial(): ItemKind {
    const biome = this.currentBiome();
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
      return true;
    }

    return inventoryItemCount(this.raidInventory) + 1 <= RAID_CAPACITY;
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
      if (this.stash[item] <= 0 || inventoryItemCount(this.baseLoadout) >= HAND_CAPACITY) {
        return;
      }

      this.stash[item] -= 1;
      this.baseLoadout[item] += 1;
    });
  }

  private transferBaseLoadoutToHand(): void {
    ITEM_KINDS.forEach((item) => {
      this.handInventory[item] += this.baseLoadout[item];
    });
    this.baseLoadout = createEmptyInventory();
  }

  private canMoveToHand(item: ItemKind): boolean {
    const category = ITEM_DEFINITIONS[item].category;
    return category === 'consumable' || category === 'equipment';
  }

  private availableHandItems(): ItemKind[] {
    return ITEM_KINDS.filter((item) => this.handInventory[item] > 0);
  }

  private dropMaterial(entity: Entity): void {
    const item = entity.enemy ? chooseEnemyDrop(entity.enemy, ROT.RNG.getUniform()) : this.randomBiomeMaterial();
    const definition = ITEM_DEFINITIONS[item];
    this.entities.push(createItemEntity(`drop-${this.depth}-${++this.dropId}`, item, entity.x, entity.y));
    this.pushMessage(`${entity.name}が${definition.name}を落とした。`);
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

const createItemEntity = (id: string, item: ItemKind, x: number, y: number): Entity => {
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

const attackMessage = (attacker: Entity, defender: Entity, damage: number) => {
  if (attacker.kind === 'player') {
    return `${defender.name}に${damage}ダメージを与えた。`;
  }

  if (defender.kind === 'player') {
    return `${attacker.name}から${damage}ダメージを受けた。`;
  }

  return `${attacker.name}が${defender.name}に${damage}ダメージを与えた。`;
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
