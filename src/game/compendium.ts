import { ENEMY_DEFINITIONS, ENEMY_KINDS } from './enemies';
import { ITEM_DEFINITIONS, ITEM_KINDS } from './items';
import { CRAFTING_RECIPES, formatStack } from './recipes';
import { BIOME_DEFINITIONS } from './biomes';

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
  biome: string;
};

export type ItemEntry = {
  id: string;
  name: string;
  description: string;
  category: string;
  size: number;
  value: number;
  sources: string;
  obtain: string;
  rarity: string;
};

export type RecipeEntry = {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  result: string;
  facility: string;
  target: string;
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
    drop: enemy.drops.map((drop) => ITEM_DEFINITIONS[drop].name).join(' / '),
    biome: enemy.biomes.map((biome) => BIOME_DEFINITIONS[biome].name).join(' / '),
  };
});

export const ITEM_ENTRIES: ItemEntry[] = ITEM_KINDS.map((id) => {
  const item = ITEM_DEFINITIONS[id];
  return {
    id,
    name: item.name,
    description: item.description,
    category: item.category === 'consumable' ? '消耗品' : item.category === 'equipment' ? '装備' : item.category === 'upgrade' ? '強化' : '素材',
    size: item.size,
    value: item.value,
    sources: item.sources.map((biome) => BIOME_DEFINITIONS[biome].name).join(' / ') || '拠点',
    obtain: item.obtain,
    rarity: item.rarity,
  };
});

export const RECIPE_ENTRIES: RecipeEntry[] = CRAFTING_RECIPES.map((recipe) => ({
  id: recipe.id,
  name: ITEM_DEFINITIONS[recipe.result.item].name,
  description: recipe.description,
  ingredients: recipe.ingredients.map(formatStack),
  result: formatStack(recipe.result),
  facility: recipe.facility,
  target: recipe.targetBiomes.map((biome) => BIOME_DEFINITIONS[biome].name).join(' / ') || '拠点',
}));
