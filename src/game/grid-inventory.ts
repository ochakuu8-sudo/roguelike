import type { Inventory, ItemKind, PlacedItem } from '../engine/types';
import { ITEM_DEFINITIONS } from './items';

export const GRID_COLS = 3;
export const GRID_ROWS = 5;

const isStackable = (item: ItemKind): boolean => {
  const category = ITEM_DEFINITIONS[item].category;
  return category === 'material' || category === 'consumable' || category === 'upgrade';
};

const overlaps = (a: PlacedItem, x: number, y: number, width: number, height: number) =>
  x < a.x + a.width && x + width > a.x && y < a.y + a.height && y + height > a.y;

const findFreeSpot = (placed: PlacedItem[], width: number, height: number): { x: number; y: number } | undefined => {
  for (let y = 0; y <= GRID_ROWS - height; y += 1) {
    for (let x = 0; x <= GRID_COLS - width; x += 1) {
      if (!placed.some((entry) => overlaps(entry, x, y, width, height))) {
        return { x, y };
      }
    }
  }
  return undefined;
};

/**
 * Rebuilds a location's grid layout from its item counts, keeping previously
 * placed stacks anchored where they were so items don't jump around on every
 * refresh. Durability carries over onto the item bearing the same kind.
 */
export const layoutGridInventory = (
  inventory: Inventory,
  previous: PlacedItem[],
  durability: Partial<Record<ItemKind, number[]>>,
): PlacedItem[] => {
  const next: PlacedItem[] = [];

  (Object.keys(inventory) as ItemKind[]).forEach((item) => {
    const count = inventory[item];
    if (count <= 0) {
      return;
    }

    const definition = ITEM_DEFINITIONS[item];
    const { width, height } = definition.gridSize;
    const stackable = isStackable(item);
    const instanceCount = stackable ? 1 : count;
    const existingForItem = previous.filter((entry) => entry.item === item);
    const durabilityUnits = durability[item] ?? [];

    for (let index = 0; index < instanceCount; index += 1) {
      const kept = existingForItem[index];
      const canKeep = kept && !next.some((entry) => overlaps(entry, kept.x, kept.y, width, height));
      const durabilityValue = definition.maxDurability !== undefined ? durabilityUnits[index] : undefined;

      if (canKeep && kept) {
        next.push({ item, x: kept.x, y: kept.y, width, height, durability: durabilityValue, maxDurability: definition.maxDurability });
        continue;
      }

      const spot = findFreeSpot(next, width, height);
      if (spot) {
        next.push({ item, x: spot.x, y: spot.y, width, height, durability: durabilityValue, maxDurability: definition.maxDurability });
      }
    }
  });

  return next;
};

export const canFitAdditionalUnit = (inventory: Inventory, layout: PlacedItem[], item: ItemKind): boolean => {
  const definition = ITEM_DEFINITIONS[item];

  if (isStackable(item) && (inventory[item] ?? 0) > 0) {
    return true;
  }

  return findFreeSpot(layout, definition.gridSize.width, definition.gridSize.height) !== undefined;
};
