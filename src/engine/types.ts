export type Point = {
  x: number;
  y: number;
};

export type ElementId = 'impact' | 'pierce' | 'poison' | 'shock';

export type Command =
  | { type: 'face'; dx: number; dy: number }
  | { type: 'forward' }
  | { type: 'wait' }
  | { type: 'pickup' }
  | { type: 'interact' }
  | { type: 'item' }
  | { type: 'useHeldItem' }
  | { type: 'previousHandItem' }
  | { type: 'nextHandItem' }
  | { type: 'useItem'; item: ItemKind }
  | { type: 'moveItem'; item: ItemKind; from: InventoryLocation; to: InventoryLocation; x?: number; y?: number }
  | { type: 'placeItem'; item: ItemKind; location: InventoryLocation; x: number; y: number }
  | { type: 'appraiseCollection' }
  | { type: 'descend' }
  | { type: 'startRaid'; mapId: MapId; mapRollId?: string }
  | { type: 'sellItem'; item: ItemKind }
  | { type: 'craftItem'; recipe: RecipeId }
  | { type: 'buyItem'; item: ItemKind }
  | { type: 'unlockRecipe'; recipe: RecipeId }
  | { type: 'restart' }
  | { type: 'acknowledgeDeath' }
  | { type: 'help' }
  | { type: 'toggleDebugMode' }
  | { type: 'debugGiveItem'; item: ItemKind; amount?: number }
  | { type: 'debugSpawnEnemy'; enemy: EnemyKind; x: number; y: number };

export type TileKind = 'wall' | 'floor' | 'stairs' | 'ore' | 'forage' | 'crate' | 'device' | 'locked';

export type Tile = {
  kind: TileKind;
  visible: boolean;
  explored: boolean;
  biome?: BiomeId;
};

export type ActorStats = {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
};

export type EntityKind = 'player' | 'monster' | 'item' | 'station';
export type StationKind = 'raidGate' | 'stash' | 'craft' | 'market' | 'shop' | 'compendium' | 'appraiser' | 'barterMerchant';
export type BiomeId = 'mine' | 'forest' | 'fortress' | 'lab';
export type MapId = 'borderTunnels' | 'frontline' | 'blightWoods' | 'sealedVault';
export type EnemyKind =
  | 'caveImp'
  | 'oreBeetle'
  | 'tunnelGnoll'
  | 'sporeBat'
  | 'slime'
  | 'herbEater'
  | 'boneSentinel'
  | 'fortRaider'
  | 'crestKnight'
  | 'failedSubject'
  | 'observerDrone'
  | 'arcaneGuardian';
export type ItemKind =
  | 'potion'
  | 'hiPotion'
  | 'antidote'
  | 'bandage'
  | 'poisonVial'
  | 'smokeBomb'
  | 'explosive'
  | 'throwingKnife'
  | 'sword'
  | 'bow'
  | 'pickaxe'
  | 'ironOre'
  | 'copperOre'
  | 'sulfur'
  | 'oldGear'
  | 'hardShell'
  | 'herb'
  | 'blueMushroom'
  | 'poisonSpore'
  | 'cleanWater'
  | 'slimeGel'
  | 'boneShard'
  | 'sturdyLeather'
  | 'tornCloth'
  | 'brokenBlade'
  | 'crestFragment'
  | 'glassShard'
  | 'chemicalBottle'
  | 'arcaneCore'
  | 'dataRecord'
  | 'mutantMeat'
  | 'wood'
  | 'oldCoin'
  | 'keyBundle'
  | 'mapFragment'
  | 'axe'
  | 'dagger'
  | 'blowgun'
  | 'sparkCrossbow'
  | 'leatherArmor'
  | 'hazmatSuit'
  | 'swordUpgrade1'
  | 'swordUpgrade2'
  | 'bowUpgrade1'
  | 'bowUpgrade2'
  | 'pickaxeUpgrade1'
  | 'pickaxeUpgrade2'
  | 'armorUpgrade1'
  | 'armorUpgrade2'
  | 'ancientRelic'
  | 'gildedIdol'
  | 'strangeGem'
  | 'mapBorderTunnels'
  | 'mapFrontline'
  | 'mapBlightWoods'
  | 'mapSealedVault';
export type RecipeId =
  | 'sword'
  | 'bow'
  | 'pickaxe'
  | 'potion'
  | 'hiPotion'
  | 'antidote'
  | 'bandage'
  | 'poisonVial'
  | 'smokeBomb'
  | 'explosive'
  | 'throwingKnife'
  | 'axe'
  | 'dagger'
  | 'blowgun'
  | 'sparkCrossbow'
  | 'leatherArmor'
  | 'hazmatSuit'
  | 'swordUpgrade1'
  | 'swordUpgrade2'
  | 'bowUpgrade1'
  | 'bowUpgrade2'
  | 'pickaxeUpgrade1'
  | 'pickaxeUpgrade2'
  | 'armorUpgrade1'
  | 'armorUpgrade2';
export type Inventory = Record<ItemKind, number>;
export type GameMode = 'base' | 'raid';
export type InventoryLocation = 'hand' | 'stash' | 'raidBag';

export type MapAffixId = 'richYield' | 'denseSwarm' | 'fortune' | 'vaultSealed' | 'eliteGuardian';
export type MapAffix = { id: MapAffixId; magnitude: number };
export type MapTier = 'normal' | 'magic' | 'rare';
export type MapRoll = { id: string; tier: MapTier; affixes: MapAffix[] };

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
  mapRoll?: MapRoll;
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
  stamina: number;
  maxStamina: number;
};

export type PlacedItem = {
  item: ItemKind;
  x: number;
  y: number;
  width: number;
  height: number;
  durability?: number;
  maxDurability?: number;
  mapRollId?: string;
};

export type GridInventories = {
  hand: PlacedItem[];
  raidBag: PlacedItem[];
  stash: PlacedItem[];
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
  baseLoadout: Inventory;
  money: number;
  messages: string[];
  combatEffects: CombatEffect[];
  gameOver: boolean;
  seed: number;
  biome: BiomeId | null;
  mapId: MapId | null;
  grids: GridInventories;
  collectionCount: number;
  debugMode: boolean;
  mapRolls: Partial<Record<ItemKind, MapRoll[]>>;
  unlockedRecipes: RecipeId[];
};
