import { ENEMY_DEFINITIONS, ENEMY_KINDS } from './enemies';
import { ITEM_DEFINITIONS, ITEM_KINDS } from './items';
import { CRAFTING_RECIPES, formatStack } from './recipes';

export type EnemyEntry = {
  id: string;
  name: string;
  description: string;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
  };
  drop: string;
};

export type ItemEntry = {
  id: string;
  name: string;
  description: string;
  category: string;
  size: number;
  value: number;
};

export type RecipeEntry = {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  result: string;
  facility: string;
};

export const ENEMY_ENTRIES: EnemyEntry[] = ENEMY_KINDS.map((id) => {
  const enemy = ENEMY_DEFINITIONS[id];
  return {
    id,
    name: enemy.name,
    description: enemy.description,
    stats: {
      hp: enemy.stats.maxHp,
      attack: enemy.stats.attack,
      defense: enemy.stats.defense,
      speed: enemy.stats.speed,
    },
    drop: ITEM_DEFINITIONS[enemy.drop].name,
  };
});

export const ITEM_ENTRIES: ItemEntry[] = ITEM_KINDS.map((id) => {
  const item = ITEM_DEFINITIONS[id];
  return {
    id,
    name: item.name,
    description: item.description,
    category: item.category === 'consumable' ? '消耗品' : '素材',
    size: item.size,
    value: item.value,
  };
});

export const RECIPE_ENTRIES: RecipeEntry[] = CRAFTING_RECIPES.map((recipe) => ({
  id: recipe.id,
  name: ITEM_DEFINITIONS[recipe.result.item].name,
  description: recipe.description,
  ingredients: recipe.ingredients.map(formatStack),
  result: formatStack(recipe.result),
  facility: recipe.facility,
}));
