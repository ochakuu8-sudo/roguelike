import * as ROT from 'rot-js';
import { chebyshev, indexAt } from '../engine/grid';
import type { CombatEffect, Command, Entity, GameMode, GameSnapshot, Inventory, ItemKind, RecipeId, Tile } from '../engine/types';
import { createEmptyInventory, createStartingStash, inventoryUsedSize, ITEM_DEFINITIONS, RAID_CAPACITY } from './items';
import { addRecipeResult, consumeIngredients, formatStack, hasIngredients, recipeById } from './recipes';

const MAP_WIDTH = 56;
const MAP_HEIGHT = 34;
const FOV_RADIUS = 9;
const PLAYER_ID = 'player';

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
  private stash: Inventory = createStartingStash();
  private raidInventory: Inventory = createEmptyInventory();
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
        raidCapacity: RAID_CAPACITY,
        facing: { ...this.facing },
      },
      stash: { ...this.stash },
      money: this.money,
      messages: [...this.messages],
      combatEffects: this.combatEffects.map((effect) => ({
        ...effect,
        from: { ...effect.from },
        to: { ...effect.to },
      })),
      gameOver: this.gameOver,
      seed: this.seed,
    };
  }

  dispatch(command: Command): void {
    if (command.type === 'restart') {
      this.restart();
      return;
    }

    if (command.type === 'startRaid') {
      this.startRaid();
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

    if (this.mode === 'base') {
      this.pushMessage('拠点にいる。出撃を選んで探索を開始してください。');
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
      case 'item':
        break;
      case 'descend':
        turnResult = { usedTurn: this.extract() };
        break;
      case 'help':
        break;
    }

    if (turnResult.usedTurn && !this.gameOver) {
      this.enemyTurn(turnResult.skipEnemyId);
      this.updateFov();
    }
  }

  private restart(): void {
    this.seed = Date.now();
    this.depth = 1;
    this.xp = 0;
    this.mode = 'base';
    this.stash = createStartingStash();
    this.raidInventory = createEmptyInventory();
    this.money = 0;
    this.dropId = 0;
    this.facing = { x: 0, y: 1 };
    this.gameOver = false;
    this.combatEffects = [];
    this.effectId = 0;
    this.tiles = [];
    this.entities = [];
    this.messages = ['拠点に戻った。出撃の準備をしよう。'];
  }

  private startRaid(): void {
    if (this.mode === 'raid') {
      return;
    }

    this.mode = 'raid';
    this.depth = 1;
    this.raidInventory = createEmptyInventory();
    if (this.stash.potion > 0) {
      this.stash.potion -= 1;
      this.raidInventory.potion = 1;
    }
    this.facing = { x: 0, y: 1 };
    this.gameOver = false;
    this.combatEffects = [];
    this.effectId = 0;
    this.generateLevel('探索に出撃した。物資を集めて脱出地点を目指そう。');
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
    this.messages = [entryMessage];
    this.updateFov();
  }

  private populateRooms(rooms: RoomLike[]): void {
    let monsterIndex = 0;
    let itemIndex = 0;

    rooms.forEach((room, roomIndex) => {
      const [cx, cy] = roomCenter(room);
      const roll = ROT.RNG.getUniform();

      if (roll < 0.72) {
        const tough = this.depth > 2 && ROT.RNG.getUniform() < 0.35;
        this.entities.push({
          id: `monster-${this.depth}-${monsterIndex++}`,
          kind: 'monster',
          name: tough ? '石肌ノール' : '洞窟インプ',
          glyph: tough ? 'G' : 'i',
          color: tough ? '#f0a95b' : '#d97878',
          x: cx,
          y: cy,
          blocks: true,
          ai: 'hostile',
          stats: tough
            ? { hp: 14 + this.depth * 2, maxHp: 14 + this.depth * 2, attack: 5 + this.depth, defense: 2, speed: 8 }
            : { hp: 8 + this.depth, maxHp: 8 + this.depth, attack: 4 + this.depth, defense: 0, speed: 12 },
        });
      }

      if ((roomIndex + this.depth) % 4 === 0) {
        const itemX = cx + (ROT.RNG.getUniform() < 0.5 ? -1 : 1);
        const itemY = cy;
        if (this.isWalkable(itemX, itemY)) {
          this.entities.push(createItemEntity(`potion-${this.depth}-${itemIndex++}`, 'potion', itemX, itemY));
        }
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
      this.resolveMeleeExchange(player, target);
      return { usedTurn: true, skipEnemyId: target.id };
    }

    if (!this.isWalkable(targetX, targetY)) {
      this.pushMessage('壁に行く手を阻まれた。');
      return { usedTurn: false };
    }

    player.x = targetX;
    player.y = targetY;
    return { usedTurn: true };
  }

  private face(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) {
      return;
    }

    this.facing = { x: Math.sign(dx), y: Math.sign(dy) };
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

      this.addRaidItem(item.item);
      this.entities = this.entities.filter((entity) => entity.id !== item.id);
      this.pushMessage(`${ITEM_DEFINITIONS[item.item].name}を拾った。`);
      return true;
    }

    return false;
  }

  private useItem(item: ItemKind): boolean {
    if (item !== 'potion') {
      this.pushMessage(`${ITEM_DEFINITIONS[item].name}は素材だ。`);
      return false;
    }

    const player = this.player();
    const stats = player.stats;

    if (!stats) {
      return false;
    }

    if (this.raidInventory.potion <= 0) {
      this.pushMessage('回復薬を持っていない。');
      return false;
    }

    if (stats.hp >= stats.maxHp) {
      this.pushMessage('HPはすでに最大だ。');
      return false;
    }

    this.raidInventory.potion -= 1;
    const healed = Math.min(10, stats.maxHp - stats.hp);
    stats.hp += healed;
    this.pushMessage(`回復薬を飲み、HPを${healed}回復した。`);
    return true;
  }

  private extract(): boolean {
    const player = this.player();

    if (this.tileAt(player.x, player.y).kind !== 'stairs') {
      this.pushMessage('ここは脱出地点ではない。');
      return false;
    }

    this.transferRaidInventoryToStash();
    this.mode = 'base';
    this.entities = [];
    this.tiles = [];
    this.combatEffects = [];
    this.pushMessage('脱出に成功した。持ち帰った物資を倉庫に移した。');
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
      this.mode = 'base';
      this.entities = [];
      this.tiles = [];
      this.combatEffects = [];
      this.pushMessage('探索に失敗した。探索中の荷物は失われた。');
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
    const fov = new ROT.FOV.PreciseShadowcasting((x, y) => this.inBounds(x, y) && this.tileAt(x, y).kind !== 'wall');

    fov.compute(player.x, player.y, FOV_RADIUS, (x, y) => {
      const tile = this.tileAt(x, y);
      tile.visible = true;
      tile.explored = true;
    });
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

  private isWalkable(x: number, y: number): boolean {
    return this.inBounds(x, y) && this.tileAt(x, y).kind !== 'wall';
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

  private addRaidItem(item: ItemKind, amount = 1): void {
    this.raidInventory[item] += amount;
  }

  private canCarry(item: ItemKind): boolean {
    return inventoryUsedSize(this.raidInventory) + ITEM_DEFINITIONS[item].size <= RAID_CAPACITY;
  }

  private transferRaidInventoryToStash(): void {
    Object.keys(this.raidInventory).forEach((item) => {
      this.addItem(item as ItemKind, this.raidInventory[item as ItemKind]);
    });
    this.raidInventory = createEmptyInventory();
  }

  private dropMaterial(entity: Entity): void {
    const item = materialFor(entity);
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

const materialFor = (entity: Entity): ItemKind => (entity.name.includes('ノール') ? 'gnollHide' : 'impFang');

const attackMessage = (attacker: Entity, defender: Entity, damage: number) => {
  if (attacker.kind === 'player') {
    return `${defender.name}に${damage}ダメージを与えた。`;
  }

  if (defender.kind === 'player') {
    return `${attacker.name}から${damage}ダメージを受けた。`;
  }

  return `${attacker.name}が${defender.name}に${damage}ダメージを与えた。`;
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
