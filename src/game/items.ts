import type { BiomeId, ElementId, Inventory, ItemKind, MapId, RecipeId } from '../engine/types';

export type ItemCategory = 'consumable' | 'material' | 'equipment' | 'upgrade' | 'collection' | 'map';
export type ItemRarity = 'common' | 'uncommon' | 'rare';
export type GridSize = { width: number; height: number };

export type ItemDefinition = {
  name: string;
  description: string;
  category: ItemCategory;
  glyph: string;
  color: string;
  value: number;
  size: number;
  sources: BiomeId[];
  obtain: string;
  rarity: ItemRarity;
  usedIn: RecipeId[];
  gridSize: GridSize;
  maxDurability?: number;
  staminaRestore?: number;
  attackPower?: number;
  attackElement?: ElementId;
  attackRange?: number;
  resistance?: ElementId;
};

const DEFAULT_GRID_SIZE: GridSize = { width: 1, height: 1 };

type AttackSpec = { power: number; element: ElementId; range?: number };

const consumable = (
  name: string,
  description: string,
  glyph: string,
  color: string,
  value: number,
  usedIn: RecipeId[] = [],
  attack?: AttackSpec,
): Omit<ItemDefinition, 'sources' | 'obtain' | 'rarity'> => ({
  name,
  description,
  category: 'consumable',
  glyph,
  color,
  value,
  size: 1,
  gridSize: DEFAULT_GRID_SIZE,
  usedIn,
  attackPower: attack?.power,
  attackElement: attack?.element,
  attackRange: attack?.range,
});

const material = (
  name: string,
  description: string,
  sources: BiomeId[],
  obtain: string,
  value: number,
  color: string,
  rarity: ItemRarity,
  usedIn: RecipeId[],
  staminaRestore?: number,
): ItemDefinition => ({
  name,
  description,
  category: 'material',
  glyph: '*',
  color,
  value,
  size: 1,
  gridSize: DEFAULT_GRID_SIZE,
  sources,
  obtain,
  rarity,
  usedIn,
  staminaRestore,
});

type EquipmentOptions = {
  name: string;
  description: string;
  glyph: string;
  color: string;
  value: number;
  maxDurability: number;
  gridSize?: GridSize;
  attackPower?: number;
  attackElement?: ElementId;
  attackRange?: number;
  resistance?: ElementId;
};

const equipment = (options: EquipmentOptions): ItemDefinition => ({
  name: options.name,
  description: options.description,
  category: 'equipment',
  glyph: options.glyph,
  color: options.color,
  value: options.value,
  size: 1,
  gridSize: options.gridSize ?? { width: 1, height: 2 },
  sources: [],
  obtain: '初期装備 / クラフト',
  rarity: 'common',
  usedIn: [],
  maxDurability: options.maxDurability,
  attackPower: options.attackPower,
  attackElement: options.attackElement,
  attackRange: options.attackRange,
  resistance: options.resistance,
});

const upgrade = (name: string, description: string, value: number): ItemDefinition => ({
  name,
  description,
  category: 'upgrade',
  glyph: '^',
  color: '#facc15',
  value,
  size: 0,
  gridSize: DEFAULT_GRID_SIZE,
  sources: [],
  obtain: '拠点クラフト',
  rarity: 'rare',
  usedIn: [],
});

const mapItem = (name: string, destinationName: string, value: number): ItemDefinition => ({
  name,
  description: `${destinationName}への遠征地図。1枚ごとにランク(通常/上質/希少)と固有の特性がランダムに刻まれている。倉庫でタップすると詳細を確認できる。`,
  category: 'map',
  glyph: '#',
  color: '#38bdf8',
  value,
  size: 1,
  gridSize: DEFAULT_GRID_SIZE,
  sources: [],
  obtain: '採取ポイントで低確率入手',
  rarity: 'uncommon',
  usedIn: [],
});

const collection = (name: string, description: string, value: number, color: string): ItemDefinition => ({
  name,
  description,
  category: 'collection',
  glyph: '?',
  color,
  value,
  size: 1,
  gridSize: { width: 2, height: 2 },
  sources: [],
  obtain: '宝箱 / 鍵付き倉庫',
  rarity: 'rare',
  usedIn: [],
});

export const ITEM_DEFINITIONS: Record<ItemKind, ItemDefinition> = {
  potion: {
    ...consumable('回復薬', 'HPを最大10回復する。', '!', '#7dd3fc', 35),
    sources: ['forest'],
    obtain: '薬草 x2、清水 x1でクラフト',
    rarity: 'common',
  },
  hiPotion: {
    ...consumable('上級回復薬', 'HPを大きく回復する。', '!', '#38bdf8', 85),
    sources: ['forest'],
    obtain: '薬草、青キノコ、清水でクラフト',
    rarity: 'uncommon',
  },
  antidote: {
    ...consumable('解毒薬', '毒を解除する。', '!', '#86efac', 60),
    sources: ['forest', 'lab'],
    obtain: '毒胞子、清水、薬品瓶でクラフト',
    rarity: 'uncommon',
  },
  bandage: {
    ...consumable('包帯', '軽い回復と出血対策に使う。', '+', '#fef3c7', 45),
    sources: ['fortress', 'forest'],
    obtain: '裂けた布、薬草でクラフト',
    rarity: 'common',
  },
  poisonVial: {
    ...consumable('毒瓶', '正面の敵に毒属性のダメージを与える投擲品。', '!', '#a3e635', 70, [], { power: 3, element: 'poison', range: 2 }),
    sources: ['forest', 'lab'],
    obtain: '毒胞子、ガラス片でクラフト',
    rarity: 'uncommon',
  },
  smokeBomb: {
    ...consumable('煙玉', '敵の追跡を切りやすくする。', 'o', '#cbd5e1', 55),
    sources: ['mine', 'fortress'],
    obtain: '硫黄、裂けた布でクラフト',
    rarity: 'common',
  },
  explosive: {
    ...consumable('爆薬', '正面の敵に打撃属性の大ダメージを与える投擲品。高価だが威力が高い。', 'o', '#fb7185', 130, [], { power: 9, element: 'impact', range: 2 }),
    sources: ['mine', 'lab'],
    obtain: '硫黄、薬品瓶、裂けた布でクラフト',
    rarity: 'rare',
  },
  throwingKnife: {
    ...consumable('投げナイフ', '遠距離から貫通属性のダメージを与える投擲武器。', '/', '#e5e7eb', 50, [], { power: 5, element: 'pierce', range: 3 }),
    sources: ['fortress'],
    obtain: '折れた刃、木材でクラフト',
    rarity: 'common',
  },
  sword: equipment({
    name: '剣',
    description: '近くの敵を斬る貫通属性の基本武器。使うたびに耐久値が減り、尽きると壊れる。',
    glyph: '/',
    color: '#e5e7eb',
    value: 80,
    maxDurability: 30,
    gridSize: { width: 1, height: 2 },
    attackPower: 4,
    attackElement: 'pierce',
  }),
  bow: equipment({
    name: '弓',
    description: '向いている方向へ矢を放つ貫通属性の遠距離武器。使うたびに耐久値が減り、尽きると壊れる。',
    glyph: ')',
    color: '#fbbf24',
    value: 90,
    maxDurability: 24,
    gridSize: { width: 2, height: 2 },
    attackPower: 3,
    attackElement: 'pierce',
    attackRange: 5,
  }),
  pickaxe: equipment({
    name: 'ピッケル',
    description: '壁や鉱石ブロックを掘れる道具。正面に敵がいる時は打撃属性の弱い攻撃にも使える。使うたびに耐久値が減り、尽きると壊れる。',
    glyph: 'T',
    color: '#93c5fd',
    value: 70,
    maxDurability: 40,
    gridSize: { width: 1, height: 2 },
    attackPower: 1,
    attackElement: 'impact',
  }),
  axe: equipment({
    name: '斧',
    description: '重い一撃を叩き込む打撃属性の近接武器。使うたびに耐久値が減り、尽きると壊れる。',
    glyph: '/',
    color: '#fca5a5',
    value: 95,
    maxDurability: 55,
    gridSize: { width: 1, height: 2 },
    attackPower: 7,
    attackElement: 'impact',
  }),
  dagger: equipment({
    name: '短剣',
    description: '毒を纏わせた軽量な近接武器。威力は低いが取り回しがいい。使うたびに耐久値が減り、尽きると壊れる。',
    glyph: '\\',
    color: '#bef264',
    value: 60,
    maxDurability: 45,
    gridSize: { width: 1, height: 1 },
    attackPower: 2,
    attackElement: 'poison',
  }),
  blowgun: equipment({
    name: '吹き矢',
    description: '毒針を飛ばす遠距離武器。使うたびに耐久値が減り、尽きると壊れる。',
    glyph: ')',
    color: '#a3e635',
    value: 85,
    maxDurability: 45,
    gridSize: { width: 1, height: 2 },
    attackPower: 2,
    attackElement: 'poison',
    attackRange: 4,
  }),
  sparkCrossbow: equipment({
    name: '電撃弩',
    description: '魔導核で矢に電撃を纏わせた高威力の弩。使うたびに耐久値が減り、尽きると壊れる。',
    glyph: ')',
    color: '#f0abfc',
    value: 150,
    maxDurability: 35,
    gridSize: { width: 2, height: 2 },
    attackPower: 6,
    attackElement: 'shock',
    attackRange: 4,
  }),
  leatherArmor: equipment({
    name: '革鎧',
    description: '打撃属性のダメージを和らげる軽装の鎧。手持ちに入れているだけで効果を発揮する。',
    glyph: '[',
    color: '#d6a76c',
    value: 90,
    maxDurability: 50,
    gridSize: { width: 1, height: 2 },
    resistance: 'impact',
  }),
  hazmatSuit: equipment({
    name: '防護服',
    description: '毒属性のダメージを和らげる防護服。手持ちに入れているだけで効果を発揮する。',
    glyph: '[',
    color: '#86efac',
    value: 130,
    maxDurability: 45,
    gridSize: { width: 1, height: 2 },
    resistance: 'poison',
  }),
  ironOre: material('鉄鉱石', '剣、ピッケル、斧、防具に使う基本金属。', ['mine'], '鉱脈を採掘', 28, '#93c5fd', 'common', [
    'axe',
    'swordUpgrade1',
    'swordUpgrade2',
    'pickaxeUpgrade1',
    'pickaxeUpgrade2',
  ]),
  copperOre: material('銅鉱石', '弓、電撃弩、拠点設備に使う柔らかい金属。', ['mine'], '鉱脈を採掘', 24, '#f59e0b', 'common', [
    'sparkCrossbow',
    'bowUpgrade1',
    'bowUpgrade2',
  ]),
  sulfur: material('硫黄', '爆薬や煙玉の材料になる黄色い鉱物。', ['mine'], '鉱脈を採掘', 34, '#fde047', 'uncommon', ['smokeBomb', 'explosive']),
  oldGear: material('古い歯車', 'ピッケル強化に使う機械部品。', ['mine', 'lab'], '機械残骸を調べる', 58, '#94a3b8', 'uncommon', [
    'pickaxeUpgrade1',
    'pickaxeUpgrade2',
  ]),
  hardShell: material('硬殻', '防具や盾系アイテムに使う硬い殻。', ['mine'], '鉱石虫などの敵ドロップ', 42, '#a3e635', 'uncommon', [
    'armorUpgrade1',
    'armorUpgrade2',
  ]),
  herb: material('薬草', '回復薬の基礎になる苦い草。生でも少しかじってスタミナを回復できる。', ['forest'], '薬草群を採取', 18, '#86efac', 'common', [
    'potion',
    'hiPotion',
    'bandage',
  ], 12),
  blueMushroom: material('青キノコ', '上級回復薬や集中薬に使う発光キノコ。生食でもスタミナが回復する。', ['forest'], 'キノコを採取', 32, '#38bdf8', 'uncommon', ['hiPotion'], 22),
  poisonSpore: material('毒胞子', '毒瓶、短剣、吹き矢に使う危険な胞子。', ['forest'], '胞子溜まり / 敵ドロップ', 36, '#bef264', 'uncommon', [
    'antidote',
    'poisonVial',
    'dagger',
    'blowgun',
  ]),
  cleanWater: material('清水', '薬品や回復薬を安定させる水。飲めばスタミナが少し回復する。', ['forest'], '水場を採取', 20, '#7dd3fc', 'common', [
    'potion',
    'hiPotion',
    'antidote',
  ], 8),
  slimeGel: material('粘液', '粘る素材。売却素材として重宝される。', ['forest'], '敵ドロップ', 28, '#67e8f9', 'common', []),
  boneShard: material('骨片', '矢や電撃弩に使う硬い骨片。', ['fortress'], '敵ドロップ', 32, '#e5e7eb', 'common', [
    'bowUpgrade1',
    'bowUpgrade2',
    'sparkCrossbow',
  ]),
  sturdyLeather: material('丈夫な革', '防具に使う厚い革。', ['fortress'], '敵ドロップ / 木箱', 44, '#d6a76c', 'common', [
    'armorUpgrade1',
    'armorUpgrade2',
    'leatherArmor',
  ]),
  tornCloth: material('裂けた布', '包帯、煙玉、爆薬の導火に使える布。', ['fortress'], '木箱 / 敵ドロップ', 22, '#fef3c7', 'common', [
    'bandage',
    'smokeBomb',
    'explosive',
  ]),
  brokenBlade: material('折れた刃', '剣強化や短剣・投げナイフに使う刃物片。', ['fortress'], '宝箱 / 敵ドロップ', 54, '#cbd5e1', 'uncommon', [
    'throwingKnife',
    'dagger',
    'swordUpgrade1',
    'swordUpgrade2',
  ]),
  crestFragment: material('紋章片', '電撃弩に使う砦の証。', ['fortress'], '鍵部屋 / 強敵', 95, '#facc15', 'rare', ['sparkCrossbow']),
  glassShard: material('ガラス片', '薬品や投擲瓶に使う透明な破片。', ['lab'], '研究棚を調べる', 36, '#bae6fd', 'common', [
    'poisonVial',
  ]),
  chemicalBottle: material('薬品瓶', '上級薬や爆薬、防護服に使う薬品容器。', ['lab'], '研究棚を調べる', 58, '#c4b5fd', 'uncommon', [
    'antidote',
    'explosive',
    'hazmatSuit',
  ]),
  arcaneCore: material('魔導核', '電撃弩など高位装備に使う高価値素材。', ['lab'], '装置 / 強敵', 140, '#f0abfc', 'rare', [
    'swordUpgrade2',
    'pickaxeUpgrade2',
    'sparkCrossbow',
  ]),
  dataRecord: material('記録媒体', '弓強化に使う記録端末。', ['lab'], '端末 / 鍵部屋', 100, '#a5b4fc', 'rare', [
    'bowUpgrade2',
  ]),
  mutantMeat: material('変質肉', '防護服や売却に回せる不気味な素材。', ['lab'], '敵ドロップ', 48, '#fb7185', 'uncommon', ['armorUpgrade2', 'hazmatSuit']),
  wood: material('木材', '矢、斧、短剣、吹き矢など広く使う。', ['mine', 'forest', 'fortress', 'lab'], '木箱 / 残骸', 12, '#c08457', 'common', [
    'throwingKnife',
    'axe',
    'dagger',
    'blowgun',
    'bowUpgrade1',
    'pickaxeUpgrade1',
  ]),
  oldCoin: material('古銭', '換金に使う古銭。', ['mine', 'forest', 'fortress', 'lab'], '宝箱 / 敵ドロップ', 25, '#fcd34d', 'common', []),
  keyBundle: material('鍵束', '希少な鍵の束。売却価値が高い。', ['fortress', 'lab'], '敵ドロップ / 宝箱', 70, '#fef08a', 'uncommon', []),
  mapFragment: material('地図断片', '古い地図の断片。売却価値が高い希少品。', ['mine', 'forest', 'fortress', 'lab'], '宝箱 / 端末', 62, '#bfdbfe', 'uncommon', []),
  swordUpgrade1: upgrade('剣強化 I', '斧や短剣の材料になる鍛冶素材。', 180),
  swordUpgrade2: upgrade('剣強化 II', '上位の近接武器に使う鍛冶素材。', 360),
  bowUpgrade1: upgrade('弓強化 I', '吹き矢の材料になる素材。', 170),
  bowUpgrade2: upgrade('弓強化 II', '電撃弩に使う上位素材。', 340),
  pickaxeUpgrade1: upgrade('ピッケル強化 I', '採掘できる対象を増やす。', 160),
  pickaxeUpgrade2: upgrade('ピッケル強化 II', '硬い壁やレア鉱脈に対応する。', 360),
  armorUpgrade1: upgrade('防具補強 I', '革鎧の材料になる素材。', 180),
  armorUpgrade2: upgrade('防具補強 II', '防護服に使う上位素材。', 380),
  ancientRelic: collection('古びた遺物', '価値不明のコレクションアイテム。鑑定士に見せるまで正体が分からない。', 220, '#d6c39a'),
  gildedIdol: collection('金めっきの偶像', '価値不明のコレクションアイテム。鑑定士に見せるまで正体が分からない。', 340, '#facc15'),
  strangeGem: collection('不思議な宝石', '価値不明のコレクションアイテム。鑑定士に見せるまで正体が分からない。', 180, '#c4b5fd'),
  mapBorderTunnels: mapItem('国境の坑道の地図', '国境の坑道', 110),
  mapFrontline: mapItem('崩れた前線の地図', '崩れた前線', 150),
  mapBlightWoods: mapItem('黄昏の毒林の地図', '黄昏の毒林', 190),
  mapSealedVault: mapItem('封鎖された深部要塞の地図', '封鎖された深部要塞', 240),
};

export const ITEM_KINDS = Object.keys(ITEM_DEFINITIONS) as ItemKind[];
export const MATERIAL_KINDS = ITEM_KINDS.filter((item) => ITEM_DEFINITIONS[item].category === 'material');
export const COLLECTION_KINDS = ITEM_KINDS.filter((item) => ITEM_DEFINITIONS[item].category === 'collection');
export const MAP_ITEM_KINDS = ITEM_KINDS.filter((item) => ITEM_DEFINITIONS[item].category === 'map');
export const ARMOR_KINDS = ITEM_KINDS.filter((item) => ITEM_DEFINITIONS[item].resistance !== undefined);
export const RAID_CAPACITY = 12;

// 道具屋で買える消耗品と、その値上がり幅。素材は探索でしか手に入らないままにして、
// 換金した金で「時間を金で買う」選択肢を作る。
export const SHOP_ITEM_KINDS = ITEM_KINDS.filter((item) => ITEM_DEFINITIONS[item].category === 'consumable');
export const SHOP_BUY_MARKUP = 1.8;
export const buyPriceFor = (item: ItemKind) => Math.ceil(ITEM_DEFINITIONS[item].value * SHOP_BUY_MARKUP);

export const MAP_ITEM_FOR_MAP_ID: Record<MapId, ItemKind> = {
  borderTunnels: 'mapBorderTunnels',
  frontline: 'mapFrontline',
  blightWoods: 'mapBlightWoods',
  sealedVault: 'mapSealedVault',
};

export const createEmptyInventory = (): Inventory =>
  ITEM_KINDS.reduce((inventory, item) => {
    inventory[item] = 0;
    return inventory;
  }, {} as Inventory);

export const createStartingStash = (): Inventory => ({
  ...createEmptyInventory(),
  potion: 1,
  sword: 1,
  bow: 1,
  pickaxe: 1,
});

export const inventoryItemCount = (inventory: Inventory) =>
  ITEM_KINDS.reduce((total, item) => total + inventory[item], 0);
