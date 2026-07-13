import type { ElementId, ItemKind } from '../engine/types';
import { ENEMY_DEFINITIONS, ENEMY_KINDS } from './enemies';
import { ITEM_DEFINITIONS, ITEM_KINDS } from './items';
import { CRAFTING_RECIPES, formatStack } from './recipes';
import { BIOME_DEFINITIONS } from './biomes';

export const ELEMENT_LABELS: Record<ElementId, string> = {
  impact: '打撃',
  pierce: '貫通',
  poison: '毒',
  shock: '感電',
};

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
  attackElement: string;
  weakness?: string;
  resistance?: string;
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
  attackInfo?: string;
  resistanceInfo?: string;
};

export type RecipeEntry = {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  resultItem: ItemKind;
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
    attackElement: ELEMENT_LABELS[enemy.attackElement],
    weakness: enemy.weakness ? ELEMENT_LABELS[enemy.weakness] : undefined,
    resistance: enemy.resistance ? ELEMENT_LABELS[enemy.resistance] : undefined,
  };
});

export const ITEM_ENTRIES: ItemEntry[] = ITEM_KINDS.map((id) => {
  const item = ITEM_DEFINITIONS[id];
  return {
    id,
    name: item.name,
    description: item.description,
    category:
      item.category === 'consumable'
        ? '消耗品'
        : item.category === 'equipment'
          ? '装備'
          : item.category === 'upgrade'
            ? '強化'
            : item.category === 'collection'
              ? 'コレクション'
              : item.category === 'map'
                ? '地図'
                : '素材',
    size: item.size,
    value: item.value,
    sources: item.sources.map((biome) => BIOME_DEFINITIONS[biome].name).join(' / ') || '拠点',
    obtain: item.obtain,
    rarity: item.rarity,
    attackInfo:
      item.attackPower !== undefined && item.attackElement
        ? `${ELEMENT_LABELS[item.attackElement]}属性 威力${item.attackPower}${item.attackRange && item.attackRange > 1 ? ` / 射程${item.attackRange}` : ''}`
        : undefined,
    resistanceInfo: item.resistance ? `${ELEMENT_LABELS[item.resistance]}耐性` : undefined,
  };
});

export const RECIPE_ENTRIES: RecipeEntry[] = CRAFTING_RECIPES.map((recipe) => ({
  id: recipe.id,
  name: ITEM_DEFINITIONS[recipe.result.item].name,
  description: recipe.description,
  ingredients: recipe.ingredients.map(formatStack),
  resultItem: recipe.result.item,
  result: formatStack(recipe.result),
  facility: recipe.facility,
  target: recipe.targetBiomes.map((biome) => BIOME_DEFINITIONS[biome].name).join(' / ') || '拠点',
}));
