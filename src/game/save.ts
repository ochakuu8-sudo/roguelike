import type { BiomeId, CombatEffect, Entity, GameMode, Inventory, ItemKind, MapId, Point, Tile } from '../engine/types';

const SAVE_KEY = 'roguelike-save';
const SAVE_VERSION = 1;

export type SaveData = {
  version: number;
  width: number;
  height: number;
  tiles: Tile[];
  entities: Entity[];
  messages: string[];
  combatEffects: CombatEffect[];
  effectId: number;
  seed: number;
  depth: number;
  mode: GameMode;
  biome: BiomeId | null;
  activeMapId: MapId | null;
  activeBiomes: BiomeId[];
  stash: Inventory;
  baseLoadout: Inventory;
  raidInventory: Inventory;
  handInventory: Inventory;
  selectedHandItem: ItemKind | null;
  money: number;
  dropId: number;
  facing: Point;
  gameOver: boolean;
  stamina: number;
  equipmentDurability: Partial<Record<ItemKind, number[]>>;
};

export const createSaveData = (data: Omit<SaveData, 'version'>): SaveData => ({ ...data, version: SAVE_VERSION });

export const saveGame = (data: SaveData): void => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Storage full, disabled, or unavailable (e.g. private browsing) -- saving is best-effort.
  }
};

export const loadGame = (): SaveData | undefined => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return undefined;
    }

    const parsed = JSON.parse(raw) as SaveData;
    return parsed.version === SAVE_VERSION ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export const hasSavedGame = (): boolean => {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
};

export const clearSave = (): void => {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore.
  }
};

/** Asks the browser not to evict this origin's storage under disk pressure. Best-effort; unsupported in Safari. */
export const requestPersistentStorage = (): void => {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return;
  }

  navigator.storage.persist().catch(() => {});
};
