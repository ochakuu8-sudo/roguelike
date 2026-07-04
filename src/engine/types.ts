export type Point = {
  x: number;
  y: number;
};

export type Command =
  | { type: 'face'; dx: number; dy: number }
  | { type: 'forward' }
  | { type: 'wait' }
  | { type: 'pickup' }
  | { type: 'item' }
  | { type: 'useItem'; item: 'potion' }
  | { type: 'descend' }
  | { type: 'restart' }
  | { type: 'help' };

export type TileKind = 'wall' | 'floor' | 'stairs';

export type Tile = {
  kind: TileKind;
  visible: boolean;
  explored: boolean;
};

export type ActorStats = {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
};

export type EntityKind = 'player' | 'monster' | 'item';

export type Entity = {
  id: string;
  kind: EntityKind;
  name: string;
  glyph: string;
  color: string;
  x: number;
  y: number;
  blocks: boolean;
  stats?: ActorStats;
  ai?: 'hostile';
  item?: 'potion';
};

export type CombatEffect = {
  id: number;
  attackerId: string;
  defenderId: string;
  attackerKind: EntityKind;
  defenderKind: EntityKind;
  attackerName: string;
  defenderName: string;
  damage: number;
  from: Point;
  to: Point;
};

export type PlayerState = {
  depth: number;
  xp: number;
  potions: number;
  facing: Point;
};

export type GameSnapshot = {
  width: number;
  height: number;
  tiles: Tile[];
  entities: Entity[];
  playerId: string;
  player: PlayerState;
  messages: string[];
  combatEffects: CombatEffect[];
  gameOver: boolean;
  seed: number;
};
