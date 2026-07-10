import type { BiomeId, Inventory, ItemKind, RecipeId } from '../engine/types';
import { BIOME_DEFINITIONS } from './biomes';
import { ITEM_DEFINITIONS } from './items';

export type ItemStack = {
  item: ItemKind;
  amount: number;
};

export type RecipeDefinition = {
  id: RecipeId;
  result: ItemStack;
  ingredients: ItemStack[];
  facility: string;
  description: string;
  category: 'consumable' | 'upgrade';
  targetBiomes: BiomeId[];
};

export const CRAFTING_RECIPES: RecipeDefinition[] = [
  recipe('sword', 'sword', 1, '鍛冶台', '壊れた/持っていない剣を作り直す基本装備。', 'upgrade', [
    ['ironOre', 3],
    ['wood', 1],
  ]),
  recipe('bow', 'bow', 1, '鍛冶台', '壊れた/持っていない弓を作り直す基本装備。', 'upgrade', [
    ['copperOre', 2],
    ['wood', 2],
  ]),
  recipe('pickaxe', 'pickaxe', 1, '道具台', '壊れた/持っていないピッケルを作り直す基本装備。', 'upgrade', [
    ['ironOre', 2],
    ['wood', 1],
  ]),
  recipe('potion', 'potion', 1, '消耗品作業台', '探索中に使う基本的な回復薬。', 'consumable', [
    ['herb', 2],
    ['cleanWater', 1],
  ]),
  recipe('hiPotion', 'hiPotion', 1, '消耗品作業台', '危険地帯へ行く前に準備したい上級回復薬。', 'consumable', [
    ['herb', 2],
    ['blueMushroom', 1],
    ['cleanWater', 1],
  ]),
  recipe('antidote', 'antidote', 1, '消耗品作業台', '毒を受ける探索先で保険になる薬。', 'consumable', [
    ['poisonSpore', 1],
    ['cleanWater', 1],
    ['chemicalBottle', 1],
  ]),
  recipe('bandage', 'bandage', 1, '消耗品作業台', '軽い回復と出血対策を兼ねる応急道具。', 'consumable', [
    ['tornCloth', 2],
    ['herb', 1],
  ]),
  recipe('poisonVial', 'poisonVial', 1, '投擲作業台', '敵に毒を与える投擲品。', 'consumable', [
    ['poisonSpore', 2],
    ['glassShard', 1],
  ]),
  recipe('smokeBomb', 'smokeBomb', 1, '投擲作業台', '敵の追跡を切る逃走用アイテム。', 'consumable', [
    ['sulfur', 1],
    ['tornCloth', 1],
  ]),
  recipe('explosive', 'explosive', 1, '投擲作業台', '壁や敵に大きな効果を出す高価な消耗品。', 'consumable', [
    ['sulfur', 2],
    ['chemicalBottle', 1],
    ['tornCloth', 1],
  ]),
  recipe('throwingKnife', 'throwingKnife', 1, '投擲作業台', '遠距離の単体攻撃に使う。', 'consumable', [
    ['brokenBlade', 1],
    ['wood', 1],
  ]),
  recipe('swordUpgrade1', 'swordUpgrade1', 1, '鍛冶台', '近接攻撃を強化する序盤目標。', 'upgrade', [
    ['ironOre', 4],
    ['brokenBlade', 1],
  ]),
  recipe('swordUpgrade2', 'swordUpgrade2', 1, '鍛冶台 Lv.2', '近接攻撃をさらに強化する。', 'upgrade', [
    ['ironOre', 6],
    ['brokenBlade', 2],
    ['arcaneCore', 1],
  ]),
  recipe('bowUpgrade1', 'bowUpgrade1', 1, '鍛冶台', '弓の威力か射程を強化する。', 'upgrade', [
    ['copperOre', 3],
    ['boneShard', 2],
    ['wood', 2],
  ]),
  recipe('bowUpgrade2', 'bowUpgrade2', 1, '鍛冶台 Lv.2', '弓の性能をさらに伸ばす。', 'upgrade', [
    ['copperOre', 5],
    ['boneShard', 4],
    ['dataRecord', 1],
  ]),
  recipe('pickaxeUpgrade1', 'pickaxeUpgrade1', 1, '道具台', '採掘できる対象を増やす。', 'upgrade', [
    ['ironOre', 3],
    ['oldGear', 1],
    ['wood', 2],
  ]),
  recipe('pickaxeUpgrade2', 'pickaxeUpgrade2', 1, '道具台 Lv.2', '硬い壁やレア鉱脈に対応する。', 'upgrade', [
    ['ironOre', 6],
    ['oldGear', 2],
    ['arcaneCore', 1],
  ]),
  recipe('armorUpgrade1', 'armorUpgrade1', 1, '防具台', '最大HPか防御を上げる。', 'upgrade', [
    ['sturdyLeather', 3],
    ['hardShell', 2],
  ]),
  recipe('armorUpgrade2', 'armorUpgrade2', 1, '防具台 Lv.2', '防御をさらに上げる。', 'upgrade', [
    ['sturdyLeather', 4],
    ['hardShell', 4],
    ['mutantMeat', 1],
  ]),
  recipe('bagUpgrade1', 'bagUpgrade1', 1, '縫製台', '持ち帰り枠を増やす抽出ゲームらしい大目標。', 'upgrade', [
    ['sturdyLeather', 4],
    ['tornCloth', 3],
  ]),
  recipe('bagUpgrade2', 'bagUpgrade2', 1, '縫製台 Lv.2', '持ち帰り枠をさらに増やす。', 'upgrade', [
    ['sturdyLeather', 6],
    ['oldGear', 2],
    ['crestFragment', 1],
  ]),
  recipe('stashUpgrade1', 'stashUpgrade1', 1, '拠点設備', '倉庫 UI / 保管枠を強化する。', 'upgrade', [
    ['wood', 5],
    ['oldGear', 1],
    ['oldCoin', 5],
  ]),
  recipe('craftBenchUpgrade1', 'craftBenchUpgrade1', 1, '拠点設備', '上位レシピを解放する。', 'upgrade', [
    ['copperOre', 4],
    ['glassShard', 2],
    ['dataRecord', 1],
  ]),
  recipe('mapTable', 'mapTable', 1, '拠点設備', '入手先や脱出口情報を見やすくする。', 'upgrade', [
    ['mapFragment', 3],
    ['oldGear', 1],
    ['dataRecord', 1],
  ]),
  recipe('returnBeacon', 'returnBeacon', 1, '拠点設備', '脱出補助アイテムを作れるようにする。', 'upgrade', [
    ['arcaneCore', 1],
    ['oldGear', 2],
    ['glassShard', 2],
  ]),
  recipe('lockpickTool', 'lockpickTool', 1, '拠点設備', '鍵部屋に入りやすくする。', 'upgrade', [
    ['keyBundle', 1],
    ['copperOre', 2],
    ['slimeGel', 1],
  ]),
];

export const recipeById = (id: RecipeId) => CRAFTING_RECIPES.find((craftingRecipe) => craftingRecipe.id === id);

export const hasIngredients = (inventory: Inventory, craftingRecipe: RecipeDefinition) =>
  craftingRecipe.ingredients.every((ingredient) => inventory[ingredient.item] >= ingredient.amount);

export const consumeIngredients = (inventory: Inventory, craftingRecipe: RecipeDefinition) => {
  craftingRecipe.ingredients.forEach((ingredient) => {
    inventory[ingredient.item] -= ingredient.amount;
  });
};

export const addRecipeResult = (inventory: Inventory, craftingRecipe: RecipeDefinition) => {
  inventory[craftingRecipe.result.item] += craftingRecipe.result.amount;
};

export const formatStack = ({ item, amount }: ItemStack) => `${ITEM_DEFINITIONS[item].name} x${amount}`;

export const missingIngredients = (inventory: Inventory, craftingRecipe: RecipeDefinition) =>
  craftingRecipe.ingredients
    .map((ingredient) => ({
      ...ingredient,
      owned: inventory[ingredient.item],
      missing: Math.max(0, ingredient.amount - inventory[ingredient.item]),
      sources: ITEM_DEFINITIONS[ingredient.item].sources,
      obtain: ITEM_DEFINITIONS[ingredient.item].obtain,
    }))
    .filter((ingredient) => ingredient.missing > 0);

export const suggestedBiomesForRecipe = (inventory: Inventory, craftingRecipe: RecipeDefinition) => {
  const scores = new Map<BiomeId, number>();

  missingIngredients(inventory, craftingRecipe).forEach((ingredient) => {
    ingredient.sources.forEach((biome) => {
      scores.set(biome, (scores.get(biome) ?? 0) + ingredient.missing);
    });
  });

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([biome]) => biome);
};

function recipe(
  id: RecipeId,
  result: ItemKind,
  amount: number,
  facility: string,
  description: string,
  category: RecipeDefinition['category'],
  ingredients: Array<[ItemKind, number]>,
): RecipeDefinition {
  const targetBiomes = uniqueBiomes(ingredients.flatMap(([item]) => ITEM_DEFINITIONS[item].sources));

  return {
    id,
    result: { item: result, amount },
    ingredients: ingredients.map(([item, stackAmount]) => ({ item, amount: stackAmount })),
    facility,
    description,
    category,
    targetBiomes,
  };
}

function uniqueBiomes(biomes: BiomeId[]) {
  return biomes.filter((biome, index) => biomes.indexOf(biome) === index && Boolean(BIOME_DEFINITIONS[biome]));
}
