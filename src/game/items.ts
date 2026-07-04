import type { Inventory, ItemKind } from '../engine/types';

type ItemCategory = 'consumable' | 'material';

type ItemDefinition = {
  name: string;
  description: string;
  category: ItemCategory;
  glyph: string;
  color: string;
  value: number;
  size: number;
};

export const ITEM_DEFINITIONS: Record<ItemKind, ItemDefinition> = {
  potion: {
    name: '回復薬',
    description: 'HPを最大10回復する。',
    category: 'consumable',
    glyph: '!',
    color: '#7dd3fc',
    value: 35,
    size: 1,
  },
  impFang: {
    name: 'インプの牙',
    description: '洞窟インプから取れる小さな素材。',
    category: 'material',
    glyph: '*',
    color: '#f59e0b',
    value: 18,
    size: 1,
  },
  gnollHide: {
    name: 'ノールの皮',
    description: '石肌ノールから取れる丈夫な素材。',
    category: 'material',
    glyph: '*',
    color: '#a3e635',
    value: 42,
    size: 2,
  },
  batWing: {
    name: '毒羽コウモリの羽',
    description: '毒羽コウモリから取れる薄い羽。軽く、換金しやすい。',
    category: 'material',
    glyph: '*',
    color: '#c084fc',
    value: 24,
    size: 1,
  },
  slimeGel: {
    name: 'スライムゲル',
    description: '錆びたスライムが残す粘液状の素材。',
    category: 'material',
    glyph: '*',
    color: '#67e8f9',
    value: 28,
    size: 1,
  },
  boneShard: {
    name: '古い骨片',
    description: '骨の番兵から砕け落ちた硬い骨片。',
    category: 'material',
    glyph: '*',
    color: '#e5e7eb',
    value: 36,
    size: 1,
  },
};

export const ITEM_KINDS = Object.keys(ITEM_DEFINITIONS) as ItemKind[];
export const RAID_CAPACITY = 12;

export const createEmptyInventory = (): Inventory => ({
  potion: 0,
  impFang: 0,
  gnollHide: 0,
  batWing: 0,
  slimeGel: 0,
  boneShard: 0,
});

export const createStartingStash = (): Inventory => ({
  ...createEmptyInventory(),
  potion: 1,
});

export const inventoryUsedSize = (inventory: Inventory) =>
  ITEM_KINDS.reduce((total, item) => total + inventory[item] * ITEM_DEFINITIONS[item].size, 0);
