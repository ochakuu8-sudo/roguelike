import * as ROT from 'rot-js';
import { chebyshev, indexAt } from '../engine/grid';
import type { Command, Entity, GameSnapshot, Tile } from '../engine/types';

const MAP_WIDTH = 56;
const MAP_HEIGHT = 34;
const FOV_RADIUS = 9;
const PLAYER_ID = 'player';

type RoomLike = {
  getCenter(): number[];
};

export class Game {
  private width = MAP_WIDTH;
  private height = MAP_HEIGHT;
  private tiles: Tile[] = [];
  private entities: Entity[] = [];
  private messages: string[] = [];
  private seed = Date.now();
  private depth = 1;
  private xp = 0;
  private potions = 1;
  private facing = { x: 0, y: 1 };
  private gameOver = false;

  constructor() {
    this.restart();
  }

  snapshot(): GameSnapshot {
    return {
      width: this.width,
      height: this.height,
      tiles: this.tiles.map((tile) => ({ ...tile })),
      entities: this.entities.map((entity) => ({ ...entity, stats: entity.stats ? { ...entity.stats } : undefined })),
      playerId: PLAYER_ID,
      player: {
        depth: this.depth,
        xp: this.xp,
        potions: this.potions,
        facing: { ...this.facing },
      },
      messages: [...this.messages],
      gameOver: this.gameOver,
      seed: this.seed,
    };
  }

  dispatch(command: Command): void {
    if (command.type === 'restart') {
      this.restart();
      return;
    }

    if (this.gameOver) {
      this.pushMessage('You are down. Restart to try again.');
      return;
    }

    let usedTurn = false;

    switch (command.type) {
      case 'face':
        this.face(command.dx, command.dy);
        break;
      case 'forward':
        usedTurn = this.tryMovePlayer(this.facing.x, this.facing.y);
        break;
      case 'wait':
        this.pushMessage('You listen to the dungeon breathe.');
        usedTurn = true;
        break;
      case 'pickup':
        usedTurn = this.pickup();
        break;
      case 'useItem':
        usedTurn = this.usePotion();
        break;
      case 'item':
        break;
      case 'descend':
        usedTurn = this.descend();
        break;
      case 'help':
        break;
    }

    if (usedTurn && !this.gameOver) {
      this.enemyTurn();
      this.updateFov();
    }
  }

  private restart(): void {
    this.seed = Date.now();
    this.depth = 1;
    this.xp = 0;
    this.potions = 1;
    this.facing = { x: 0, y: 1 };
    this.gameOver = false;
    this.generateLevel('You enter the dungeon.');
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
      name: 'Adventurer',
      glyph: '@',
      color: '#e8f6ff',
      x: playerX,
      y: playerY,
      blocks: true,
      stats: { hp: 24, maxHp: 24, attack: 6, defense: 1 },
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
          name: tough ? 'Stone Gnoll' : 'Cave Imp',
          glyph: tough ? 'G' : 'i',
          color: tough ? '#f0a95b' : '#d97878',
          x: cx,
          y: cy,
          blocks: true,
          ai: 'hostile',
          stats: tough
            ? { hp: 14 + this.depth * 2, maxHp: 14 + this.depth * 2, attack: 5 + this.depth, defense: 2 }
            : { hp: 8 + this.depth, maxHp: 8 + this.depth, attack: 4 + this.depth, defense: 0 },
        });
      }

      if ((roomIndex + this.depth) % 4 === 0) {
        const itemX = cx + (ROT.RNG.getUniform() < 0.5 ? -1 : 1);
        const itemY = cy;
        if (this.isWalkable(itemX, itemY)) {
          this.entities.push({
            id: `potion-${this.depth}-${itemIndex++}`,
            kind: 'item',
            name: 'Healing Potion',
            glyph: '!',
            color: '#7dd3fc',
            x: itemX,
            y: itemY,
            blocks: false,
            item: 'potion',
          });
        }
      }
    });
  }

  private tryMovePlayer(dx: number, dy: number): boolean {
    if (dx === 0 && dy === 0) {
      return false;
    }

    const player = this.player();
    const targetX = player.x + dx;
    const targetY = player.y + dy;
    const target = this.blockingEntityAt(targetX, targetY);

    if (target?.kind === 'monster') {
      this.attack(player, target);
      return true;
    }

    if (!this.isWalkable(targetX, targetY)) {
      this.pushMessage('A wall blocks your path.');
      return false;
    }

    player.x = targetX;
    player.y = targetY;
    return true;
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
      this.pushMessage('There is nothing here.');
      return false;
    }

    if (item.item === 'potion') {
      this.potions += 1;
      this.entities = this.entities.filter((entity) => entity.id !== item.id);
      this.pushMessage('You pick up a healing potion.');
      return true;
    }

    return false;
  }

  private usePotion(): boolean {
    const player = this.player();
    const stats = player.stats;

    if (!stats) {
      return false;
    }

    if (this.potions <= 0) {
      this.pushMessage('You have no potions.');
      return false;
    }

    if (stats.hp >= stats.maxHp) {
      this.pushMessage('You are already at full health.');
      return false;
    }

    this.potions -= 1;
    const healed = Math.min(10, stats.maxHp - stats.hp);
    stats.hp += healed;
    this.pushMessage(`You drink a potion and recover ${healed} HP.`);
    return true;
  }

  private descend(): boolean {
    const player = this.player();

    if (this.tileAt(player.x, player.y).kind !== 'stairs') {
      this.pushMessage('There are no stairs here.');
      return false;
    }

    const stats = player.stats;
    const carriedHp = stats?.hp ?? 24;
    const carriedMaxHp = stats?.maxHp ?? 24;

    this.depth += 1;
    this.seed += 7919;
    this.generateLevel(`You descend to floor ${this.depth}.`);
    const nextPlayer = this.player();

    if (nextPlayer.stats) {
      nextPlayer.stats.maxHp = carriedMaxHp + (this.depth % 2 === 0 ? 2 : 0);
      nextPlayer.stats.hp = Math.min(nextPlayer.stats.maxHp, carriedHp + 4);
      nextPlayer.stats.attack = 6 + Math.floor(this.depth / 2);
    }

    return false;
  }

  private enemyTurn(): void {
    const player = this.player();
    const monsters = this.entities.filter((entity) => entity.kind === 'monster' && entity.stats);

    monsters.forEach((monster) => {
      if (!monster.stats || this.gameOver) {
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
    this.pushMessage(`${attacker.name} hits ${defender.name} for ${damage}.`);

    if (defender.stats.hp <= 0) {
      this.kill(defender, attacker);
    }
  }

  private kill(entity: Entity, killer: Entity): void {
    if (entity.kind === 'player') {
      this.gameOver = true;
      this.pushMessage('You fall in the dungeon.');
      return;
    }

    this.entities = this.entities.filter((candidate) => candidate.id !== entity.id);
    if (killer.kind === 'player') {
      this.xp += 1;
      this.pushMessage(`${entity.name} dies.`);
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

  private inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  private pushMessage(message: string): void {
    this.messages = [message, ...this.messages].slice(0, 8);
  }
}

const roomCenter = (room: RoomLike): [number, number] => {
  const [x = 0, y = 0] = room.getCenter();
  return [x, y];
};
