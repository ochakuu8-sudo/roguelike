import type { Inventory, ItemKind, RecipeId } from '../engine/types';
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
};

export const CRAFTING_RECIPES: RecipeDefinition[] = [
  {
    id: 'potion',
    result: { item: 'potion', amount: 1 },
    ingredients: [
      { item: 'impFang', amount: 1 },
      { item: 'gnollHide', amount: 1 },
    ],
    facility: '作業台 Lv.1',
    description: '探索に持ち込む基本的な回復アイテムを作成する。',
  },
];

export const recipeById = (id: RecipeId) => CRAFTING_RECIPES.find((recipe) => recipe.id === id);

export const hasIngredients = (inventory: Inventory, recipe: RecipeDefinition) =>
  recipe.ingredients.every((ingredient) => inventory[ingredient.item] >= ingredient.amount);

export const consumeIngredients = (inventory: Inventory, recipe: RecipeDefinition) => {
  recipe.ingredients.forEach((ingredient) => {
    inventory[ingredient.item] -= ingredient.amount;
  });
};

export const addRecipeResult = (inventory: Inventory, recipe: RecipeDefinition) => {
  inventory[recipe.result.item] += recipe.result.amount;
};

export const formatStack = ({ item, amount }: ItemStack) => `${ITEM_DEFINITIONS[item].name} ×${amount}`;

