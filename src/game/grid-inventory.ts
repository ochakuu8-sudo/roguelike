import type { Inventory, InventoryLocation, ItemKind, MapRoll, PlacedItem } from '../engine/types';
import { ITEM_DEFINITIONS, maxStackFor } from './items';

export type GridDimensions = { cols: number; rows: number };

// Every location is 8 columns wide so the hand row, the raid bag above it,
// and the base stash all read as the same grid system. The hand row is
// exactly 1 row tall since it's meant to sit as the bottom row of the
// combined hand+raid-bag block (see inventoryPanelNodes in ui/hud.ts).
export const GRID_DIMENSIONS: Record<InventoryLocation, GridDimensions> = {
  hand: { cols: 8, rows: 1 },
  raidBag: { cols: 8, rows: 3 },
  stash: { cols: 8, rows: 8 },
};

export const isStackable = (item: ItemKind): boolean => {
  const category = ITEM_DEFINITIONS[item].category;
  return category === 'material' || category === 'consumable' || category === 'upgrade' || category === 'ammo' || category === 'collection';
};

export const overlaps = (a: PlacedItem, x: number, y: number, width: number, height: number) =>
  x < a.x + a.width && x + width > a.x && y < a.y + a.height && y + height > a.y;

const findFreeSpot = (
  placed: PlacedItem[],
  width: number,
  height: number,
  dimensions: GridDimensions,
): { x: number; y: number } | undefined => {
  for (let y = 0; y <= dimensions.rows - height; y += 1) {
    for (let x = 0; x <= dimensions.cols - width; x += 1) {
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
 * Stackable kinds are split across as many slots as needed once their count
 * exceeds that item's max stack size (maxStackFor), each slot holding up to
 * that many units.
 */
export const layoutGridInventory = (
  inventory: Inventory,
  previous: PlacedItem[],
  durability: Partial<Record<ItemKind, number[]>>,
  mapRolls: Partial<Record<ItemKind, MapRoll[]>>,
  dimensions: GridDimensions,
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
    const stackSize = stackable ? maxStackFor(item) : 1;
    const instanceCount = stackable ? Math.ceil(count / stackSize) : count;
    const existingForItem = previous.filter((entry) => entry.item === item);
    const durabilityUnits = durability[item] ?? [];
    const rollsForItem = definition.category === 'map' ? (mapRolls[item] ?? []) : undefined;

    for (let index = 0; index < instanceCount; index += 1) {
      const kept = existingForItem[index];
      const canKeep = kept && !next.some((entry) => overlaps(entry, kept.x, kept.y, width, height));
      const durabilityValue = definition.maxDurability !== undefined ? durabilityUnits[index] : undefined;
      const mapRollId = rollsForItem?.[index]?.id;
      const stackCount = stackable ? Math.min(stackSize, count - index * stackSize) : 1;

      if (canKeep && kept) {
        next.push({ item, x: kept.x, y: kept.y, width, height, count: stackCount, durability: durabilityValue, maxDurability: definition.maxDurability, mapRollId });
        continue;
      }

      const spot = findFreeSpot(next, width, height, dimensions);
      if (spot) {
        next.push({ item, x: spot.x, y: spot.y, width, height, count: stackCount, durability: durabilityValue, maxDurability: definition.maxDurability, mapRollId });
      }
    }
  });

  return next;
};

export const canFitAdditionalUnit = (layout: PlacedItem[], item: ItemKind, dimensions: GridDimensions): boolean => {
  const definition = ITEM_DEFINITIONS[item];

  if (isStackable(item)) {
    const stackSize = maxStackFor(item);
    if (layout.some((entry) => entry.item === item && entry.count < stackSize)) {
      return true;
    }
  }

  return findFreeSpot(layout, definition.gridSize.width, definition.gridSize.height, dimensions) !== undefined;
};
