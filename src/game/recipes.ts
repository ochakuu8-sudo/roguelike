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
  /** 依頼料。素材とは別に、職人にクラフトを頼むたびに支払うG。 */
  commissionFee: number;
  /** レシピ解放費用。0のときは最初から依頼できる。 */
  unlockCost: number;
};

export const CRAFTING_RECIPES: RecipeDefinition[] = [
  recipe('sword', 'sword', 1, '鍛冶台', '壊れた/持っていない剣を作り直す基本装備。', 'upgrade', 15, 0, [
    ['ironOre', 3],
    ['wood', 1],
  ]),
  recipe('bow', 'bow', 1, '鍛冶台', '壊れた/持っていない弓を作り直す基本装備。', 'upgrade', 15, 0, [
    ['copperOre', 2],
    ['wood', 2],
  ]),
  recipe('pickaxe', 'pickaxe', 1, '道具台', '壊れた/持っていないピッケルを作り直す基本装備。', 'upgrade', 15, 0, [
    ['ironOre', 2],
    ['wood', 1],
  ]),
  recipe('potion', 'potion', 1, '消耗品作業台', '探索中に使う基本的な回復薬。', 'consumable', 10, 0, [
    ['herb', 2],
    ['cleanWater', 1],
  ]),
  recipe('hiPotion', 'hiPotion', 1, '消耗品作業台', '危険地帯へ行く前に準備したい上級回復薬。', 'consumable', 15, 60, [
    ['herb', 2],
    ['blueMushroom', 1],
    ['cleanWater', 1],
  ]),
  recipe('antidote', 'antidote', 1, '消耗品作業台', '毒を受ける探索先で保険になる薬。', 'consumable', 18, 70, [
    ['poisonSpore', 1],
    ['cleanWater', 1],
    ['chemicalBottle', 1],
  ]),
  recipe('bandage', 'bandage', 1, '消耗品作業台', '軽い回復と出血対策を兼ねる応急道具。', 'consumable', 10, 40, [
    ['tornCloth', 2],
    ['herb', 1],
  ]),
  recipe('poisonVial', 'poisonVial', 1, '投擲作業台', '敵に毒を与える投擲品。', 'consumable', 18, 70, [
    ['poisonSpore', 2],
    ['glassShard', 1],
  ]),
  recipe('smokeBomb', 'smokeBomb', 1, '投擲作業台', '敵の追跡を切る逃走用アイテム。', 'consumable', 12, 50, [
    ['sulfur', 1],
    ['tornCloth', 1],
  ]),
  recipe('explosive', 'explosive', 1, '投擲作業台', '壁や敵に大きな効果を出す高価な消耗品。', 'consumable', 35, 150, [
    ['sulfur', 2],
    ['chemicalBottle', 1],
    ['tornCloth', 1],
  ]),
  recipe('throwingKnife', 'throwingKnife', 1, '投擲作業台', '遠距離から貫通属性のダメージを与える投擲武器。', 'consumable', 12, 60, [
    ['brokenBlade', 1],
    ['wood', 1],
  ]),
  recipe('axe', 'axe', 1, '鍛冶台', '打撃属性の重い一撃を叩き込む近接武器。', 'upgrade', 45, 180, [
    ['ironOre', 4],
    ['wood', 2],
    ['swordUpgrade1', 1],
  ]),
  recipe('dagger', 'dagger', 1, '鍛冶台', '毒属性を纏わせた軽量な近接武器。', 'upgrade', 50, 200, [
    ['brokenBlade', 1],
    ['poisonSpore', 1],
    ['wood', 1],
    ['swordUpgrade2', 1],
  ]),
  recipe('blowgun', 'blowgun', 1, '鍛冶台', '毒属性の針を飛ばす遠距離武器。', 'upgrade', 45, 180, [
    ['wood', 2],
    ['poisonSpore', 2],
    ['bowUpgrade1', 1],
  ]),
  recipe('sparkCrossbow', 'sparkCrossbow', 1, '鍛冶台 Lv.2', '電撃属性を纏わせた高威力の弩。', 'upgrade', 120, 400, [
    ['copperOre', 3],
    ['boneShard', 2],
    ['arcaneCore', 1],
    ['crestFragment', 1],
    ['bowUpgrade2', 1],
  ]),
  recipe('leatherArmor', 'leatherArmor', 1, '防具台', '打撃属性のダメージを和らげる軽装の鎧。', 'upgrade', 35, 120, [
    ['sturdyLeather', 4],
    ['armorUpgrade1', 1],
  ]),
  recipe('hazmatSuit', 'hazmatSuit', 1, '防具台 Lv.2', '毒属性のダメージを和らげる防護服。', 'upgrade', 80, 280, [
    ['chemicalBottle', 2],
    ['mutantMeat', 1],
    ['armorUpgrade2', 1],
  ]),
  recipe('swordUpgrade1', 'swordUpgrade1', 1, '鍛冶台', '斧や短剣の材料になる鍛冶素材。', 'upgrade', 25, 90, [
    ['ironOre', 4],
    ['brokenBlade', 1],
  ]),
  recipe('swordUpgrade2', 'swordUpgrade2', 1, '鍛冶台 Lv.2', '上位の近接武器に使う鍛冶素材。', 'upgrade', 70, 260, [
    ['ironOre', 6],
    ['brokenBlade', 2],
    ['arcaneCore', 1],
  ]),
  recipe('bowUpgrade1', 'bowUpgrade1', 1, '鍛冶台', '吹き矢の材料になる素材。', 'upgrade', 25, 90, [
    ['copperOre', 3],
    ['boneShard', 2],
    ['wood', 2],
  ]),
  recipe('bowUpgrade2', 'bowUpgrade2', 1, '鍛冶台 Lv.2', '電撃弩に使う上位素材。', 'upgrade', 70, 260, [
    ['copperOre', 5],
    ['boneShard', 4],
    ['dataRecord', 1],
  ]),
  recipe('pickaxeUpgrade1', 'pickaxeUpgrade1', 1, '道具台', '採掘できる対象を増やす。', 'upgrade', 25, 90, [
    ['ironOre', 3],
    ['oldGear', 1],
    ['wood', 2],
  ]),
  recipe('pickaxeUpgrade2', 'pickaxeUpgrade2', 1, '道具台 Lv.2', '硬い壁やレア鉱脈に対応する。', 'upgrade', 70, 260, [
    ['ironOre', 6],
    ['oldGear', 2],
    ['arcaneCore', 1],
  ]),
  recipe('armorUpgrade1', 'armorUpgrade1', 1, '防具台', '革鎧の材料になる素材。', 'upgrade', 30, 100, [
    ['sturdyLeather', 3],
    ['hardShell', 2],
  ]),
  recipe('armorUpgrade2', 'armorUpgrade2', 1, '防具台 Lv.2', '防護服に使う上位素材。', 'upgrade', 70, 260, [
    ['sturdyLeather', 4],
    ['hardShell', 4],
    ['mutantMeat', 1],
  ]),
];

export const STARTER_RECIPE_IDS: RecipeId[] = CRAFTING_RECIPES.filter((definition) => definition.unlockCost === 0).map(
  (definition) => definition.id,
);

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
  commissionFee: number,
  unlockCost: number,
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
    commissionFee,
    unlockCost,
  };
}

function uniqueBiomes(biomes: BiomeId[]) {
  return biomes.filter((biome, index) => biomes.indexOf(biome) === index && Boolean(BIOME_DEFINITIONS[biome]));
}
