export type Point = {
  x: number;
  y: number;
};

export type Command =
  | { type: 'face'; dx: number; dy: number }
  | { type: 'forward' }
  | { type: 'wait' }
  | { type: 'pickup' }
  | { type: 'interact' }
  | { type: 'item' }
  | { type: 'previousHandItem' }
  | { type: 'nextHandItem' }
  | { type: 'useItem'; item: ItemKind }
  | { type: 'descend' }
  | { type: 'startRaid' }
  | { type: 'sellItem'; item: ItemKind }
  | { type: 'craftItem'; recipe: RecipeId }
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
  speed: number;
};

export type EntityKind = 'player' | 'monster' | 'item' | 'station';
export type StationKind = 'raidGate' | 'stash' | 'craft' | 'market' | 'compendium';
export type EnemyKind = 'caveImp' | 'stoneGnoll' | 'venomBat' | 'rustSlime' | 'boneSentinel';
export type ItemKind = 'potion' | 'impFang' | 'gnollHide' | 'batWing' | 'slimeGel' | 'boneShard';
export type RecipeId = 'potion';
export type Inventory = Record<ItemKind, number>;
export type GameMode = 'base' | 'raid';

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
  item?: ItemKind;
  enemy?: EnemyKind;
  station?: StationKind;
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
  raidInventory: Inventory;
  handInventory: Inventory;
  selectedHandItem: ItemKind | null;
  raidCapacity: number;
  facing: Point;
};

export type GameSnapshot = {
  mode: GameMode;
  width: number;
  height: number;
  tiles: Tile[];
  entities: Entity[];
  playerId: string;
  player: PlayerState;
  stash: Inventory;
  money: number;
  messages: string[];
  combatEffects: CombatEffect[];
  gameOver: boolean;
  seed: number;
};
