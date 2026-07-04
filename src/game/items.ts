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
    name: '回復薬',
    description: 'HPを最大10回復する。',
    category: 'consumable',
    glyph: '!',
    color: '#7dd3fc',
  },
  impFang: {
    name: 'インプの牙',
    description: '洞窟インプから取れる小さな素材。',
    category: 'material',
    glyph: '*',
    color: '#f59e0b',
  },
  gnollHide: {
    name: 'ノールの皮',
    description: '石肌ノールから取れる丈夫な素材。',
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
