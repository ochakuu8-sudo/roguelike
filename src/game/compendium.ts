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

export const ENEMY_ENTRIES: EnemyEntry[] = [
  {
    id: 'caveImp',
    name: '洞窟インプ',
    description: '素早く接近してくる小型の敵。防御は低いが、序盤では先に攻撃されやすい。',
    stats: { hp: 9, attack: 5, defense: 0, speed: 12 },
    drop: 'インプの牙',
  },
  {
    id: 'stoneGnoll',
    name: '石肌ノール',
    description: '硬い皮膚を持つ重い敵。動きは遅いが、攻撃と防御が高い。',
    stats: { hp: 20, attack: 8, defense: 2, speed: 8 },
    drop: 'ノールの皮',
  },
];

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
