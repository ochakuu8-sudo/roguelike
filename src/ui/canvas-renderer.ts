import { indexAt } from '../engine/grid';
import type { CombatEffect, EnemyKind, Entity, GameSnapshot, ItemKind, StationKind, Tile } from '../engine/types';
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

export const SPRITES = {
  player: [
    '..222...',
    '..222...',
    '..111...',
    '.11111..',
    '3.111.3.',
    '..111...',
    '..1.1...',
    '.11.11..',
  ],
  imp: [
    '4....4..',
    '.4444...',
    '454454..',
    '.4444...',
    '..44....',
    '.4..4...',
    '4....4..',
    '........',
  ],
  beetle: [
    '........',
    '..B.B...',
    '.BBBBB..',
    'BBEBEBB.',
    '.BBBBB..',
    '..B.B...',
    '.B...B..',
    '........',
  ],
  gnoll: [
    '..666...',
    '.67776..',
    '6777776.',
    '.75557..',
    '..777...',
    '.7.7.7..',
    '6..6..6.',
    '........',
  ],
  bat: [
    '........',
    'D..DD..D',
    'DDDEEDDD',
    '.DDEEDD.',
    '..DDDD..',
    '...DD...',
    '..D..D..',
    '........',
  ],
  slime: [
    '........',
    '........',
    '..JJJ...',
    '.JKKKJ..',
    'JKKLKKJ.',
    '.JKKKJ..',
    '..JJJ...',
    '........',
  ],
  herbEater: [
    '........',
    '..MM....',
    '.MNNM...',
    'MNNNNM..',
    '.NOON...',
    '..NN.M..',
    '.M..M...',
    '........',
  ],
  sentinel: [
    '..PP....',
    '.PQQP...',
    '.QRRQ...',
    '..QQ....',
    '.PQQP...',
    'Q.QQ.Q..',
    '..Q.Q...',
    '........',
  ],
  raider: [
    '..SSS...',
    '.STTTS..',
    '..TT....',
    '.UUUU...',
    'U.UUU.U.',
    '..UU....',
    '.U..U...',
    '........',
  ],
  knight: [
    '..YYY...',
    '.YZZZY..',
    '..ZZ....',
    '.ZZZZ...',
    'Y.ZZ.Y..',
    '..ZZ....',
    '.Z..Z...',
    '........',
  ],
  failed: [
    '........',
    '..444...',
    '.4VVV4..',
    '..V4V...',
    '.VVVVV..',
    '4.VV.4..',
    '..V.V...',
    '........',
  ],
  drone: [
    '........',
    '..WWW...',
    '.WXXXW..',
    'WXXWXXW.',
    '.WXXXW..',
    '..WWW...',
    '..W.W...',
    '........',
  ],
  guardian: [
    '..AAA...',
    '.AOOOA..',
    'AOPPOOA.',
    '.AOOOA..',
    '..AAA...',
    '.AA.AA..',
    'A.....A.',
    '........',
  ],
  potion: [
    '..888...',
    '...8....',
    '..999...',
    '.99999..',
    '.9AAA9..',
    '.9AAA9..',
    '..999...',
    '........',
  ],
  scroll: [
    '........',
    '..FF....',
    '.FHHF...',
    '.FHHF...',
    '.FHHF...',
    '..FF....',
    '.F..F...',
    '........',
  ],
  bomb: [
    '........',
    '...F....',
    '..F4....',
    '..444...',
    '.44444..',
    '.44444..',
    '..444...',
    '........',
  ],
  blade: [
    '.....F..',
    '....F...',
    '...F....',
    '..F.....',
    '.F......',
    'U.......',
    '........',
    '........',
  ],
  sword: [
    '....F...',
    '....F...',
    '....F...',
    '....F...',
    '..YYY...',
    '...U....',
    '..U.U...',
    '........',
  ],
  bow: [
    '..Y.....',
    '.Y.F....',
    'Y..F....',
    'Y..F....',
    'Y..F....',
    '.Y.F....',
    '..Y.....',
    '........',
  ],
  pickaxe: [
    '........',
    '.FFFFFF.',
    '...U....',
    '...U....',
    '...U....',
    '..U.....',
    '.U......',
    '........',
  ],
  material: [
    '........',
    '..CC....',
    '.CDDC...',
    '.CDDC...',
    '..CC....',
    '........',
    '........',
    '........',
  ],
  ore: [
    '........',
    '..X.....',
    '.XXX....',
    '.XXP....',
    '..PPP...',
    '...P....',
    '........',
    '........',
  ],
  herb: [
    '........',
    '...M....',
    '..MMM...',
    '.M.M.M..',
    '..MMM...',
    '...M....',
    '..M.M...',
    '........',
  ],
  bone: [
    '........',
    '..FF....',
    '.F..F...',
    '..FF....',
    '..FF....',
    '.F..F...',
    '..FF....',
    '........',
  ],
  gear: [
    '........',
    '..EEE...',
    '.E.F.E..',
    'E.FFF.E.',
    '.E.F.E..',
    '..EEE...',
    '........',
    '........',
  ],
  bottle: [
    '..W.....',
    '..W.....',
    '.WWW....',
    '.WXW....',
    '.WXW....',
    '.WWW....',
    '........',
    '........',
  ],
  core: [
    '........',
    '..OO....',
    '.OAAO...',
    'OAPPAO..',
    '.OAAO...',
    '..OO....',
    '........',
    '........',
  ],
  coin: [
    '........',
    '..YYY...',
    '.YZZY...',
    '.YZZY...',
    '..YYY...',
    '........',
    '........',
    '........',
  ],
  upgrade: [
    '........',
    '...Y....',
    '..YYY...',
    '.YYZYY..',
    '...Y....',
    '...Y....',
    '........',
    '........',
  ],
  stairs: [
    '........',
    '....BB..',
    '...BB...',
    '..BB....',
    '.BB.....',
    'BBBBBB..',
    '........',
    '........',
  ],
  station: [
    '.EEEEEE.',
    'EFFFFFFE',
    'EF....FE',
    'EF....FE',
    'EF....FE',
    'EFFFFFFE',
    '.EEEEEE.',
    '........',
  ],
  stationGate: [
    '..BBBB..',
    '.B....B.',
    'B..FF..B',
    'B.FBBF.B',
    'B..FF..B',
    '.B....B.',
    '..BBBB..',
    '........',
  ],
  stationStash: [
    '........',
    '.YYYYY..',
    'YUUUUUY.',
    'YUYUYUY.',
    'YUUUUUY.',
    '.YYYYY..',
    '........',
    '........',
  ],
  stationCraft: [
    '........',
    '..FFFF..',
    '.FUUUF..',
    '..UUU...',
    '.FUUUF..',
    '..U.U...',
    '.U...U..',
    '........',
  ],
  stationMarket: [
    '........',
    '..YYY...',
    '.YZZZY..',
    '..ZY....',
    '..YZ....',
    '.YZZZY..',
    '..YYY...',
    '........',
  ],
  stationCompendium: [
    '........',
    '.WWWWW..',
    'WXXXXXW.',
    'WXFFFXW.',
    'WXXXXXW.',
    '.WWWWW..',
    '...W....',
    '........',
  ],
} as const;

export const PALETTE: Record<string, string> = {
  '1': '#d8ecf4',
  '2': '#88cfe8',
  '3': '#f0b46b',
  '4': '#ce5f66',
  '5': '#ffe0df',
  '6': '#a86f3f',
  '7': '#e2a45e',
  '8': '#c7ecff',
  '9': '#5fc6e8',
  A: '#2b7fb3',
  B: '#6ee7b7',
  C: '#d9f99d',
  D: '#a16207',
  E: '#475569',
  F: '#cbd5e1',
  H: '#fef3c7',
  J: '#67e8f9',
  K: '#155e75',
  L: '#ecfeff',
  M: '#86efac',
  N: '#3f8f57',
  O: '#f0abfc',
  P: '#93c5fd',
  Q: '#e5e7eb',
  R: '#1f2937',
  S: '#d6a76c',
  T: '#7c4a27',
  U: '#94a3b8',
  V: '#fb7185',
  W: '#a5b4fc',
  X: '#38bdf8',
  Y: '#fbbf24',
  Z: '#b45309',
};

export type SpriteKey = keyof typeof SPRITES;

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
  drawSpriteByKey(context, sprite);
  context.restore();
};

const block = (context: SpritePaint, color: string, x: number, y: number, width: number, height: number) => {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
};

const blockSet = (context: SpritePaint, color: string, blocks: Array<[number, number, number, number]>) => {
  blocks.forEach(([x, y, width, height]) => block(context, color, x, y, width, height));
};

const drawHumanoid = (context: SpritePaint, primary: string, secondary: string, accent: string, skin = '#d8ecf4') => {
  blockSet(context, '#05080a', [
    [10, 5, 12, 5],
    [8, 10, 16, 14],
    [6, 16, 4, 8],
    [22, 16, 4, 8],
    [10, 24, 5, 6],
    [17, 24, 5, 6],
  ]);
  block(context, secondary, 11, 4, 10, 5);
  block(context, skin, 11, 8, 10, 7);
  block(context, primary, 9, 15, 14, 11);
  block(context, accent, 12, 16, 8, 2);
  block(context, primary, 7, 17, 4, 7);
  block(context, primary, 21, 17, 4, 7);
  block(context, primary, 11, 25, 4, 5);
  block(context, primary, 17, 25, 4, 5);
  block(context, '#0b1116', 13, 11, 2, 2);
  block(context, '#0b1116', 18, 11, 2, 2);
};

const drawBottle = (context: SpritePaint, glass: string, liquid: string) => {
  blockSet(context, '#05080a', [
    [13, 3, 6, 4],
    [11, 7, 10, 4],
    [8, 11, 16, 17],
    [10, 28, 12, 2],
  ]);
  block(context, glass, 14, 4, 4, 5);
  block(context, glass, 10, 10, 12, 17);
  block(context, liquid, 11, 17, 10, 9);
  block(context, '#ecfeff', 13, 12, 3, 9);
};

const drawSpriteByKey = (context: SpritePaint, sprite: SpriteKey) => {
  switch (sprite) {
    case 'player':
      drawHumanoid(context, '#d8ecf4', '#88cfe8', '#f0b46b');
      block(context, '#7dd3fc', 14, 2, 5, 3);
      return;
    case 'imp':
      blockSet(context, '#05080a', [[7, 4, 4, 7], [21, 4, 4, 7], [9, 9, 14, 17], [11, 25, 4, 5], [18, 25, 4, 5]]);
      blockSet(context, '#ce5f66', [[8, 5, 3, 5], [21, 5, 3, 5], [10, 10, 12, 15], [12, 25, 3, 4], [18, 25, 3, 4]]);
      block(context, '#ffe0df', 12, 13, 3, 3);
      block(context, '#ffe0df', 18, 13, 3, 3);
      block(context, '#7f1d1d', 14, 20, 5, 2);
      return;
    case 'beetle':
      blockSet(context, '#05080a', [[7, 11, 18, 13], [4, 14, 4, 3], [24, 14, 4, 3], [4, 21, 4, 3], [24, 21, 4, 3], [9, 6, 4, 5], [19, 6, 4, 5]]);
      block(context, '#6ee7b7', 8, 12, 16, 11);
      block(context, '#a3e635', 11, 10, 10, 5);
      block(context, '#26333a', 15, 12, 2, 11);
      block(context, '#d9f99d', 11, 15, 3, 2);
      block(context, '#d9f99d', 18, 15, 3, 2);
      return;
    case 'gnoll':
      drawHumanoid(context, '#e2a45e', '#a86f3f', '#f0a95b', '#e2a45e');
      block(context, '#5b341d', 9, 6, 4, 5);
      block(context, '#5b341d', 20, 6, 4, 5);
      return;
    case 'bat':
      blockSet(context, '#05080a', [[2, 11, 10, 8], [20, 11, 10, 8], [11, 9, 10, 14], [13, 22, 6, 4]]);
      blockSet(context, '#c084fc', [[3, 12, 9, 6], [20, 12, 9, 6], [12, 10, 8, 12]]);
      block(context, '#f0abfc', 12, 12, 2, 2);
      block(context, '#f0abfc', 18, 12, 2, 2);
      block(context, '#475569', 14, 20, 4, 3);
      return;
    case 'slime':
      blockSet(context, '#05080a', [[8, 14, 16, 10], [10, 10, 12, 5], [12, 24, 8, 3]]);
      block(context, '#67e8f9', 9, 14, 14, 9);
      block(context, '#155e75', 11, 19, 10, 4);
      block(context, '#ecfeff', 13, 12, 3, 2);
      block(context, '#ecfeff', 18, 13, 2, 2);
      return;
    case 'herbEater':
      drawHumanoid(context, '#3f8f57', '#86efac', '#f0abfc', '#86efac');
      blockSet(context, '#86efac', [[8, 4, 5, 5], [20, 5, 5, 5], [14, 2, 4, 5]]);
      return;
    case 'sentinel':
      drawHumanoid(context, '#e5e7eb', '#93c5fd', '#1f2937', '#e5e7eb');
      block(context, '#1f2937', 12, 9, 9, 3);
      return;
    case 'raider':
      drawHumanoid(context, '#94a3b8', '#d6a76c', '#7c4a27', '#d6a76c');
      block(context, '#cbd5e1', 23, 12, 5, 15);
      return;
    case 'knight':
      drawHumanoid(context, '#fbbf24', '#b45309', '#facc15', '#e5e7eb');
      block(context, '#facc15', 11, 3, 10, 3);
      block(context, '#cbd5e1', 5, 15, 4, 10);
      return;
    case 'failed':
      drawHumanoid(context, '#fb7185', '#ce5f66', '#f0abfc', '#fb7185');
      blockSet(context, '#7f1d1d', [[8, 8, 4, 6], [21, 17, 5, 7], [13, 26, 9, 3]]);
      return;
    case 'drone':
      blockSet(context, '#05080a', [[8, 9, 16, 13], [4, 12, 5, 5], [23, 12, 5, 5], [14, 22, 4, 5]]);
      block(context, '#a5b4fc', 9, 10, 14, 11);
      block(context, '#38bdf8', 12, 13, 8, 5);
      block(context, '#ecfeff', 15, 14, 3, 3);
      return;
    case 'guardian':
      drawHumanoid(context, '#f0abfc', '#2b7fb3', '#93c5fd', '#f0abfc');
      blockSet(context, '#facc15', [[10, 2, 12, 3], [6, 15, 3, 9], [24, 15, 3, 9]]);
      return;
    case 'potion':
      drawBottle(context, '#c7ecff', '#5fc6e8');
      return;
    case 'scroll':
      blockSet(context, '#05080a', [[8, 7, 16, 20], [10, 5, 4, 4], [18, 24, 5, 5]]);
      block(context, '#fef3c7', 9, 8, 14, 18);
      blockSet(context, '#b45309', [[12, 12, 8, 1], [12, 16, 7, 1], [12, 20, 9, 1]]);
      return;
    case 'bomb':
      blockSet(context, '#05080a', [[13, 5, 5, 7], [9, 12, 15, 15], [11, 27, 11, 2]]);
      block(context, '#ce5f66', 10, 13, 13, 13);
      block(context, '#fb7185', 14, 9, 4, 4);
      block(context, '#cbd5e1', 16, 5, 7, 2);
      return;
    case 'blade':
      blockSet(context, '#05080a', [[19, 4, 5, 5], [16, 8, 5, 5], [13, 12, 5, 5], [10, 16, 5, 5], [7, 20, 5, 5], [5, 25, 8, 4]]);
      blockSet(context, '#cbd5e1', [[20, 5, 3, 4], [17, 9, 3, 4], [14, 13, 3, 4], [11, 17, 3, 4], [8, 21, 3, 4]]);
      block(context, '#94a3b8', 5, 25, 8, 3);
      return;
    case 'sword':
      blockSet(context, '#05080a', [[15, 3, 4, 20], [10, 22, 14, 4], [13, 26, 8, 4]]);
      block(context, '#cbd5e1', 16, 4, 2, 18);
      block(context, '#fbbf24', 11, 22, 12, 3);
      block(context, '#94a3b8', 15, 25, 4, 5);
      return;
    case 'bow':
      blockSet(context, '#05080a', [[9, 5, 4, 5], [7, 10, 4, 11], [9, 21, 4, 6], [20, 6, 2, 21]]);
      blockSet(context, '#fbbf24', [[10, 6, 3, 4], [8, 11, 3, 10], [10, 21, 3, 5]]);
      block(context, '#cbd5e1', 21, 7, 1, 19);
      return;
    case 'pickaxe':
      blockSet(context, '#05080a', [[6, 8, 20, 5], [15, 11, 4, 17]]);
      block(context, '#cbd5e1', 7, 9, 18, 3);
      block(context, '#94a3b8', 15, 12, 4, 15);
      return;
    case 'material':
      blockSet(context, '#05080a', [[9, 12, 12, 12], [13, 8, 9, 9]]);
      block(context, '#d9f99d', 10, 13, 10, 10);
      block(context, '#a16207', 14, 9, 7, 8);
      return;
    case 'ore':
      blockSet(context, '#05080a', [[8, 14, 9, 10], [14, 8, 10, 12], [19, 17, 6, 8]]);
      block(context, '#38bdf8', 9, 15, 8, 8);
      block(context, '#93c5fd', 15, 9, 8, 10);
      block(context, '#cbd5e1', 18, 13, 3, 3);
      return;
    case 'herb':
      blockSet(context, '#05080a', [[15, 9, 3, 18], [9, 12, 8, 6], [17, 12, 8, 6], [11, 5, 7, 7], [17, 5, 6, 8]]);
      blockSet(context, '#86efac', [[15, 10, 2, 16], [10, 13, 7, 4], [17, 13, 7, 4], [12, 6, 6, 6], [18, 6, 4, 7]]);
      return;
    case 'bone':
      blockSet(context, '#05080a', [[8, 8, 6, 6], [18, 8, 6, 6], [12, 13, 9, 7], [8, 20, 6, 6], [18, 20, 6, 6]]);
      blockSet(context, '#e5e7eb', [[9, 9, 5, 5], [18, 9, 5, 5], [12, 14, 8, 5], [9, 20, 5, 5], [18, 20, 5, 5]]);
      return;
    case 'gear':
      blockSet(context, '#05080a', [[13, 5, 6, 22], [5, 13, 22, 6], [9, 9, 14, 14]]);
      blockSet(context, '#94a3b8', [[14, 6, 4, 20], [6, 14, 20, 4], [10, 10, 12, 12]]);
      block(context, '#05080a', 14, 14, 4, 4);
      return;
    case 'bottle':
      drawBottle(context, '#a5b4fc', '#38bdf8');
      return;
    case 'core':
      blockSet(context, '#05080a', [[12, 6, 9, 5], [8, 11, 17, 12], [12, 23, 9, 4]]);
      block(context, '#f0abfc', 9, 12, 15, 10);
      block(context, '#2b7fb3', 13, 13, 7, 7);
      block(context, '#ecfeff', 15, 15, 3, 3);
      return;
    case 'coin':
      blockSet(context, '#05080a', [[10, 9, 13, 14]]);
      block(context, '#fbbf24', 11, 10, 11, 12);
      block(context, '#b45309', 14, 12, 5, 8);
      block(context, '#facc15', 13, 11, 7, 2);
      return;
    case 'upgrade':
      blockSet(context, '#05080a', [[14, 5, 5, 20], [9, 10, 15, 6], [11, 23, 11, 4]]);
      blockSet(context, '#fbbf24', [[15, 6, 3, 18], [10, 11, 13, 4]]);
      block(context, '#facc15', 12, 9, 9, 9);
      return;
    case 'stairs':
      blockSet(context, '#05080a', [[6, 23, 20, 4], [10, 18, 16, 4], [14, 13, 12, 4], [18, 8, 8, 4]]);
      blockSet(context, '#6ee7b7', [[7, 24, 18, 2], [11, 19, 14, 2], [15, 14, 10, 2], [19, 9, 6, 2]]);
      return;
    case 'station':
      blockSet(context, '#05080a', [[6, 7, 20, 20]]);
      block(context, '#475569', 7, 8, 18, 18);
      block(context, '#cbd5e1', 10, 11, 12, 12);
      return;
    case 'stationGate':
      blockSet(context, '#05080a', [[8, 5, 16, 22], [5, 12, 22, 9]]);
      blockSet(context, '#6ee7b7', [[9, 6, 14, 4], [9, 23, 14, 4], [6, 13, 4, 7], [22, 13, 4, 7]]);
      block(context, '#ecfeff', 13, 13, 7, 7);
      return;
    case 'stationStash':
      blockSet(context, '#05080a', [[6, 10, 20, 15], [9, 7, 14, 5]]);
      block(context, '#fbbf24', 7, 11, 18, 13);
      block(context, '#94a3b8', 10, 14, 12, 4);
      block(context, '#b45309', 14, 19, 4, 3);
      return;
    case 'stationCraft':
      blockSet(context, '#05080a', [[7, 10, 18, 8], [11, 17, 4, 10], [19, 17, 4, 10], [13, 5, 7, 8]]);
      block(context, '#cbd5e1', 8, 11, 16, 6);
      block(context, '#94a3b8', 14, 6, 5, 8);
      block(context, '#475569', 12, 18, 3, 8);
      block(context, '#475569', 20, 18, 3, 8);
      return;
    case 'stationMarket':
      blockSet(context, '#05080a', [[10, 6, 12, 20], [7, 10, 18, 6], [7, 21, 18, 5]]);
      block(context, '#fbbf24', 11, 7, 10, 18);
      block(context, '#b45309', 8, 11, 16, 4);
      block(context, '#facc15', 13, 12, 6, 9);
      return;
    case 'stationCompendium':
      blockSet(context, '#05080a', [[7, 8, 18, 15], [13, 23, 6, 5]]);
      block(context, '#a5b4fc', 8, 9, 16, 13);
      block(context, '#38bdf8', 11, 12, 10, 5);
      block(context, '#ecfeff', 13, 19, 6, 2);
      return;
  }
  drawMatrixSprite(context, SPRITES[sprite]);
};

const drawMatrixSprite = (context: SpritePaint, sprite: readonly string[]) => {
  const pixel = SPRITE_RESOLUTION / 8;
  sprite.forEach((row, y) => {
    [...row].forEach((code, x) => {
      if (code !== '.') {
        block(context, PALETTE[code] ?? '#ffffff', x * pixel, y * pixel, pixel, pixel);
      }
    });
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
      this.drawTileTexture(tile, x, y, cellSize, offsetX, offsetY);

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

  private drawTileTexture(tile: Tile, x: number, y: number, cellSize: number, offsetX: number, offsetY: number): void {
    if (!tile.visible) {
      return;
    }

    const left = offsetX + x * cellSize;
    const top = offsetY + y * cellSize;

    if (tile.kind === 'wall' || isGatheringTile(tile.kind)) {
      this.context.fillStyle = '#34434b';
      this.context.fillRect(left, top, cellSize, Math.max(1, Math.floor(cellSize * 0.16)));
      this.context.fillStyle = '#1d282e';
      this.context.fillRect(left, top + cellSize - Math.max(1, Math.floor(cellSize * 0.12)), cellSize, Math.max(1, Math.floor(cellSize * 0.12)));
      if (isGatheringTile(tile.kind)) {
        const chip = Math.max(1, Math.floor(cellSize * 0.16));
        this.context.fillStyle = gatheringAccent(tile.kind);
        this.context.fillRect(left + Math.floor(cellSize * 0.26), top + Math.floor(cellSize * 0.32), chip, chip);
        this.context.fillStyle = '#bfdbfe';
        this.context.fillRect(left + Math.floor(cellSize * 0.62), top + Math.floor(cellSize * 0.55), chip, chip);
      }
      return;
    }

    if ((x * 17 + y * 31) % 7 === 0) {
      const speck = Math.max(1, Math.floor(cellSize * 0.12));
      this.context.fillStyle = '#202a2f';
      this.context.fillRect(left + Math.floor(cellSize * 0.62), top + Math.floor(cellSize * 0.58), speck, speck);
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
  return name.includes('ノール') ? 'G' : name.slice(0, 1);
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
  if (name.includes('騎士') || name.includes('番人')) {
    return '#facc15';
  }
  if (name.includes('スライム')) {
    return '#67e8f9';
  }
  if (name.includes('観測')) {
    return '#a5b4fc';
  }
  return name.includes('ノール') ? '#f0a95b' : '#d97878';
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
