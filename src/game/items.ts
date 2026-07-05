import type { BiomeId, Inventory, ItemKind, RecipeId } from '../engine/types';

export type ItemCategory = 'consumable' | 'material' | 'equipment' | 'upgrade';
export type ItemRarity = 'common' | 'uncommon' | 'rare';

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
};

const consumable = (
  name: string,
  description: string,
  glyph: string,
  color: string,
  value: number,
  usedIn: RecipeId[] = [],
): Omit<ItemDefinition, 'sources' | 'obtain' | 'rarity'> => ({
  name,
  description,
  category: 'consumable',
  glyph,
  color,
  value,
  size: 1,
  usedIn,
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
): ItemDefinition => ({
  name,
  description,
  category: 'material',
  glyph: '*',
  color,
  value,
  size: 1,
  sources,
  obtain,
  rarity,
  usedIn,
});

const equipment = (name: string, description: string, glyph: string, color: string, value: number): ItemDefinition => ({
  name,
  description,
  category: 'equipment',
  glyph,
  color,
  value,
  size: 1,
  sources: [],
  obtain: '初期装備 / クラフト',
  rarity: 'common',
  usedIn: [],
});

const upgrade = (name: string, description: string, value: number): ItemDefinition => ({
  name,
  description,
  category: 'upgrade',
  glyph: '^',
  color: '#facc15',
  value,
  size: 0,
  sources: [],
  obtain: '拠点クラフト',
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
    ...consumable('毒瓶', '敵に毒を与える投擲品。', '!', '#a3e635', 70),
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
    ...consumable('爆薬', '壁や敵に大きな効果を出す。', 'o', '#fb7185', 130),
    sources: ['mine', 'lab'],
    obtain: '硫黄、薬品瓶、裂けた布でクラフト',
    rarity: 'rare',
  },
  throwingKnife: {
    ...consumable('投げナイフ', '遠距離の単体攻撃に使う。', '/', '#e5e7eb', 50),
    sources: ['fortress'],
    obtain: '折れた刃、木材でクラフト',
    rarity: 'common',
  },
  sword: equipment('剣', '近くの敵を斬る基本武器。', '/', '#e5e7eb', 80),
  bow: equipment('弓', '向いている方向へ矢を放つ遠距離武器。', ')', '#fbbf24', 90),
  pickaxe: equipment('ピッケル', '壁や鉱石ブロックを掘れる道具。', 'T', '#93c5fd', 70),
  ironOre: material('鉄鉱石', '剣、ピッケル、防具に使う基本金属。', ['mine'], '鉱脈を採掘', 28, '#93c5fd', 'common', [
    'swordUpgrade1',
    'swordUpgrade2',
    'pickaxeUpgrade1',
    'pickaxeUpgrade2',
  ]),
  copperOre: material('銅鉱石', '弓、道具、拠点設備に使う柔らかい金属。', ['mine'], '鉱脈を採掘', 24, '#f59e0b', 'common', [
    'bowUpgrade1',
    'bowUpgrade2',
    'craftBenchUpgrade1',
    'lockpickTool',
  ]),
  sulfur: material('硫黄', '爆薬や煙玉の材料になる黄色い鉱物。', ['mine'], '鉱脈を採掘', 34, '#fde047', 'uncommon', ['smokeBomb', 'explosive']),
  oldGear: material('古い歯車', '倉庫拡張、地図台、帰還ビーコンに使う機械部品。', ['mine', 'lab'], '機械残骸を調べる', 58, '#94a3b8', 'uncommon', [
    'pickaxeUpgrade1',
    'pickaxeUpgrade2',
    'bagUpgrade2',
    'stashUpgrade1',
    'mapTable',
    'returnBeacon',
  ]),
  hardShell: material('硬殻', '防具や盾系アイテムに使う硬い殻。', ['mine'], '鉱石虫などの敵ドロップ', 42, '#a3e635', 'uncommon', [
    'armorUpgrade1',
    'armorUpgrade2',
  ]),
  herb: material('薬草', '回復薬の基礎になる苦い草。', ['forest'], '薬草群を採取', 18, '#86efac', 'common', [
    'potion',
    'hiPotion',
    'bandage',
  ]),
  blueMushroom: material('青キノコ', '上級回復薬や集中薬に使う発光キノコ。', ['forest'], 'キノコを採取', 32, '#38bdf8', 'uncommon', ['hiPotion']),
  poisonSpore: material('毒胞子', '毒瓶や解毒薬に使う危険な胞子。', ['forest'], '胞子溜まり / 敵ドロップ', 36, '#bef264', 'uncommon', [
    'antidote',
    'poisonVial',
  ]),
  cleanWater: material('清水', '薬品や回復薬を安定させる水。', ['forest'], '水場を採取', 20, '#7dd3fc', 'common', [
    'potion',
    'hiPotion',
    'antidote',
  ]),
  slimeGel: material('粘液', '接着剤や罠解除道具に使う粘る素材。', ['forest'], '敵ドロップ', 28, '#67e8f9', 'common', ['lockpickTool']),
  boneShard: material('骨片', '矢や武器強化に使う硬い骨片。', ['fortress'], '敵ドロップ', 32, '#e5e7eb', 'common', [
    'bowUpgrade1',
    'bowUpgrade2',
  ]),
  sturdyLeather: material('丈夫な革', '防具やバッグ拡張に使う厚い革。', ['fortress'], '敵ドロップ / 木箱', 44, '#d6a76c', 'common', [
    'armorUpgrade1',
    'armorUpgrade2',
    'bagUpgrade1',
    'bagUpgrade2',
  ]),
  tornCloth: material('裂けた布', '包帯、煙玉、爆薬の導火に使える布。', ['fortress'], '木箱 / 敵ドロップ', 22, '#fef3c7', 'common', [
    'bandage',
    'smokeBomb',
    'explosive',
    'bagUpgrade1',
  ]),
  brokenBlade: material('折れた刃', '剣強化や投げナイフに使う刃物片。', ['fortress'], '宝箱 / 敵ドロップ', 54, '#cbd5e1', 'uncommon', [
    'throwingKnife',
    'swordUpgrade1',
    'swordUpgrade2',
  ]),
  crestFragment: material('紋章片', '拠点強化や換金に使う砦の証。', ['fortress'], '鍵部屋 / 強敵', 95, '#facc15', 'rare', ['bagUpgrade2']),
  glassShard: material('ガラス片', '薬品や投擲瓶に使う透明な破片。', ['lab'], '研究棚を調べる', 36, '#bae6fd', 'common', [
    'poisonVial',
    'craftBenchUpgrade1',
    'returnBeacon',
  ]),
  chemicalBottle: material('薬品瓶', '上級薬や爆薬に使う薬品容器。', ['lab'], '研究棚を調べる', 58, '#c4b5fd', 'uncommon', [
    'antidote',
    'explosive',
  ]),
  arcaneCore: material('魔導核', '上位装備や帰還ビーコンに使う高価値素材。', ['lab'], '装置 / 強敵', 140, '#f0abfc', 'rare', [
    'swordUpgrade2',
    'pickaxeUpgrade2',
    'returnBeacon',
  ]),
  dataRecord: material('記録媒体', '地図台やレシピ解放に使う記録端末。', ['lab'], '端末 / 鍵部屋', 100, '#a5b4fc', 'rare', [
    'bowUpgrade2',
    'craftBenchUpgrade1',
    'mapTable',
  ]),
  mutantMeat: material('変質肉', '危険薬や売却に回せる不気味な素材。', ['lab'], '敵ドロップ', 48, '#fb7185', 'uncommon', ['armorUpgrade2']),
  wood: material('木材', '矢、道具、拠点設備に広く使う。', ['mine', 'forest', 'fortress', 'lab'], '木箱 / 残骸', 12, '#c08457', 'common', [
    'throwingKnife',
    'bowUpgrade1',
    'pickaxeUpgrade1',
    'stashUpgrade1',
  ]),
  oldCoin: material('古銭', '換金やレシピ費用に使う。', ['mine', 'forest', 'fortress', 'lab'], '宝箱 / 敵ドロップ', 25, '#fcd34d', 'common', [
    'stashUpgrade1',
  ]),
  keyBundle: material('鍵束', '鍵部屋や封鎖扉を開けるための素材。', ['fortress', 'lab'], '敵ドロップ / 宝箱', 70, '#fef08a', 'uncommon', [
    'lockpickTool',
  ]),
  mapFragment: material('地図断片', '探索先情報や脱出口情報の解析に使う。', ['mine', 'forest', 'fortress', 'lab'], '宝箱 / 端末', 62, '#bfdbfe', 'uncommon', [
    'mapTable',
  ]),
  swordUpgrade1: upgrade('剣強化 I', '近接攻撃を強化する拠点強化。', 180),
  swordUpgrade2: upgrade('剣強化 II', '近接攻撃をさらに強化する上位強化。', 360),
  bowUpgrade1: upgrade('弓強化 I', '弓の威力と射程を強化する。', 170),
  bowUpgrade2: upgrade('弓強化 II', '弓の性能をさらに高める。', 340),
  pickaxeUpgrade1: upgrade('ピッケル強化 I', '採掘できる対象を増やす。', 160),
  pickaxeUpgrade2: upgrade('ピッケル強化 II', '硬い壁やレア鉱脈に対応する。', 360),
  armorUpgrade1: upgrade('防具補強 I', '最大HPと防御を上げる。', 180),
  armorUpgrade2: upgrade('防具補強 II', '防御をさらに上げる。', 380),
  bagUpgrade1: upgrade('バッグ拡張 I', '持ち帰り枠を増やす。', 220),
  bagUpgrade2: upgrade('バッグ拡張 II', '持ち帰り枠をさらに増やす。', 460),
  stashUpgrade1: upgrade('倉庫拡張 I', '倉庫 UI と保管枠を強化する。', 180),
  craftBenchUpgrade1: upgrade('クラフト台強化 I', '上位レシピを解放する。', 320),
  mapTable: upgrade('地図台', '入手先や脱出口情報を見やすくする。', 280),
  returnBeacon: upgrade('帰還ビーコン', '脱出補助アイテムを作れるようにする。', 420),
  lockpickTool: upgrade('鍵開け道具', '鍵部屋に入りやすくする。', 180),
};

export const ITEM_KINDS = Object.keys(ITEM_DEFINITIONS) as ItemKind[];
export const MATERIAL_KINDS = ITEM_KINDS.filter((item) => ITEM_DEFINITIONS[item].category === 'material');
export const RAID_CAPACITY = 12;

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

