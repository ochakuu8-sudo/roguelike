import type { Inventory, ItemKind } from '../engine/types';

type ItemCategory = 'consumable' | 'material';

type ItemDefinition = {
  name: string;
  description: string;
  category: ItemCategory;
  glyph: string;
  color: string;
};

export const ITEM_DEFINITIONS: Record<ItemKind, ItemDefinition> = {
  potion: {
    name: 'Healing Potion',
    description: 'Restores up to 10 HP.',
    category: 'consumable',
    glyph: '!',
    color: '#7dd3fc',
  },
  impFang: {
    name: 'Imp Fang',
    description: 'A small crafting material from Cave Imps.',
    category: 'material',
    glyph: '*',
    color: '#f59e0b',
  },
  gnollHide: {
    name: 'Gnoll Hide',
    description: 'A tough crafting material from Stone Gnolls.',
    category: 'material',
    glyph: '*',
    color: '#a3e635',
  },
};

export const ITEM_KINDS = Object.keys(ITEM_DEFINITIONS) as ItemKind[];

export const createInventory = (): Inventory => ({
  potion: 1,
  impFang: 0,
  gnollHide: 0,
});
