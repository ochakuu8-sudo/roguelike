export type Point = {
  x: number;
  y: number;
};

export type Command =
  | { type: 'move'; dx: number; dy: number }
  | { type: 'wait' }
  | { type: 'pickup' }
  | { type: 'usePotion' }
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

export type PlayerState = {
  depth: number;
  xp: number;
  potions: number;
};

export type GameSnapshot = {
  width: number;
  height: number;
  tiles: Tile[];
  entities: Entity[];
  playerId: string;
  player: PlayerState;
  messages: string[];
  gameOver: boolean;
  seed: number;
};
