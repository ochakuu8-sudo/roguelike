import type { Inventory, ItemKind } from '../engine/types';

type ItemCategory = 'consumable' | 'material' | 'equipment';

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
  sword: {
    name: '剣',
    description: '近くの敵を斬る基本武器。',
    category: 'equipment',
    glyph: '/',
    color: '#e5e7eb',
    value: 80,
    size: 1,
  },
  bow: {
    name: '弓',
    description: '向いている方向へ矢を放つ遠距離武器。',
    category: 'equipment',
    glyph: ')',
    color: '#fbbf24',
    value: 90,
    size: 1,
  },
  pickaxe: {
    name: 'ピッケル',
    description: '壁や鉱石ブロックを掘れる道具。',
    category: 'equipment',
    glyph: 'T',
    color: '#93c5fd',
    value: 70,
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
  ore: {
    name: '鉱石',
    description: '鉱石ブロックから採れる素材。拠点で換金やクラフトに使う。',
    category: 'material',
    glyph: '*',
    color: '#60a5fa',
    value: 55,
    size: 1,
  },
};

export const ITEM_KINDS = Object.keys(ITEM_DEFINITIONS) as ItemKind[];
export const RAID_CAPACITY = 12;

export const createEmptyInventory = (): Inventory => ({
  potion: 0,
  sword: 0,
  bow: 0,
  pickaxe: 0,
  impFang: 0,
  gnollHide: 0,
  batWing: 0,
  slimeGel: 0,
  boneShard: 0,
  ore: 0,
});

export const createStartingStash = (): Inventory => ({
  ...createEmptyInventory(),
  potion: 1,
  sword: 1,
  bow: 1,
  pickaxe: 1,
});

export const inventoryItemCount = (inventory: Inventory) =>
  ITEM_KINDS.reduce((total, item) => total + inventory[item], 0);
