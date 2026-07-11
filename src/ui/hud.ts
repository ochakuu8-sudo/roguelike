import type { BiomeId, Entity, GameSnapshot, Inventory, InventoryLocation, ItemKind, MapId, PlacedItem, RecipeId } from '../engine/types';
import { BIOME_DEFINITIONS } from '../game/biomes';
import { canFitAdditionalUnit, GRID_DIMENSIONS, overlaps } from '../game/grid-inventory';
import { ITEM_DEFINITIONS, ITEM_KINDS } from '../game/items';
import { BARTER_TRADES, MAP_DEFINITIONS, MAP_IDS } from '../game/maps';
import { CRAFTING_RECIPES, formatStack, hasIngredients, missingIngredients, suggestedBiomesForRecipe } from '../game/recipes';
import { SPRITE_SHAPES, spriteKeyForItem } from './canvas-renderer';

const emojiForItem = (item: ItemKind) => SPRITE_SHAPES[spriteKeyForItem(item)];

type HudRoots = {
  statusRoot: HTMLElement;
  handSlotRoot: HTMLElement;
  inventoryRoot: HTMLElement;
  itemListRoot: HTMLElement;
  logRoot: HTMLOListElement;
  actionHintRoot: HTMLElement;
  previousHandButton: HTMLButtonElement;
  nextHandButton: HTMLButtonElement;
  pickupButton: HTMLButtonElement;
  interactButton: HTMLButtonElement;
  heldActionButton: HTMLButtonElement;
  returnToBaseButton: HTMLButtonElement;
  onMoveItem: (item: ItemKind, from: InventoryLocation, to: InventoryLocation, x?: number, y?: number) => void;
  onPlaceItem: (item: ItemKind, location: InventoryLocation, x: number, y: number) => void;
};

type BasePlanningRoots = {
  biomeRoot: HTMLElement;
  stashRoot: HTMLElement;
  recipeRoot: HTMLElement;
  moneyRoot: HTMLElement;
  onStartRaid: (mapId: MapId) => void;
  onCraftRecipe: (recipe: RecipeId) => void;
  onAppraiseCollection: () => void;
  onMoveItem: (item: ItemKind, from: InventoryLocation, to: InventoryLocation, x?: number, y?: number) => void;
  onPlaceItem: (item: ItemKind, location: InventoryLocation, x: number, y: number) => void;
};

type ContextAction = {
  label: string;
  hint: string;
  disabled?: boolean;
};

type InventoryDragState = {
  item: ItemKind;
  from: InventoryLocation;
  startX: number;
  startY: number;
  ghost: HTMLElement;
  isTouchDrag: boolean;
  onMoveItem?: (item: ItemKind, from: InventoryLocation, to: InventoryLocation, x?: number, y?: number) => void;
  onPlaceItem?: (item: ItemKind, location: InventoryLocation, x: number, y: number) => void;
};

const gridCellCount = (location: InventoryLocation) => GRID_DIMENSIONS[location].cols * GRID_DIMENSIONS[location].rows;
const DRAG_MOVE_THRESHOLD = 12;
const TOUCH_DRAG_GHOST_OFFSET = -18;

let inventoryDragState: InventoryDragState | null = null;

document.addEventListener('pointermove', (event) => {
  if (inventoryDragState) {
    event.preventDefault();
    moveInventoryGhost(event.clientX, event.clientY);
  }
});

document.addEventListener('pointerup', (event) => {
  endInventoryDrag(true, event.clientX, event.clientY);
});

document.addEventListener('pointercancel', () => {
  endInventoryDrag(false);
});

document.addEventListener('mousemove', (event) => {
  if (inventoryDragState) {
    event.preventDefault();
    moveInventoryGhost(event.clientX, event.clientY);
  }
});

document.addEventListener('mouseup', (event) => {
  endInventoryDrag(true, event.clientX, event.clientY);
});

document.addEventListener(
  'touchmove',
  (event) => {
    if (!inventoryDragState) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    event.preventDefault();
    moveInventoryGhost(touch.clientX, touch.clientY);
  },
  { passive: false },
);

document.addEventListener('touchend', (event) => {
  const touch = event.changedTouches[0];
  endInventoryDrag(true, touch?.clientX ?? 0, touch?.clientY ?? 0);
});

document.addEventListener('touchcancel', () => {
  endInventoryDrag(false);
});

export const updateHud = (snapshot: GameSnapshot, roots: HudRoots) => {
  const player = snapshot.entities.find((entity) => entity.id === snapshot.playerId);
  const stats = player?.stats;
  roots.statusRoot.replaceChildren(
    hpBar(Math.max(0, stats?.hp ?? 0), stats?.maxHp ?? 0),
    staminaBar(snapshot.player.stamina, snapshot.player.maxStamina),
  );
  updateHandSwitcher(snapshot, roots);

  roots.inventoryRoot.replaceChildren(...inventoryPanelNodes(snapshot, roots.onMoveItem, roots.onPlaceItem));

  roots.logRoot.replaceChildren(
    ...snapshot.messages.map((message) => {
      const item = document.createElement('li');
      item.textContent = message;
      return item;
    }),
  );
  roots.logRoot.scrollTop = roots.logRoot.scrollHeight;

  roots.itemListRoot.replaceChildren(...inventoryPanelNodes(snapshot, roots.onMoveItem, roots.onPlaceItem));

  updateActionControls(snapshot, roots);
};

export const updateBasePlanning = (snapshot: GameSnapshot, roots: BasePlanningRoots) => {
  roots.moneyRoot.textContent = `${snapshot.money}G`;
  roots.biomeRoot.replaceChildren(...MAP_IDS.map((mapId) => mapCard(mapId, roots.onStartRaid)));
  roots.stashRoot.replaceChildren(
    ...collectionSummaryCard(snapshot.collectionCount, roots.onAppraiseCollection),
    inventorySummary('倉庫', 'stash', gridCellsUsed(snapshot.grids.stash), 'ドラッグで自由に並べ替えられます。'),
    inventoryGridElement('stash', snapshot.grids.stash, snapshot.stash, roots.onMoveItem, roots.onPlaceItem),
  );
  roots.recipeRoot.replaceChildren(...CRAFTING_RECIPES.map((recipe) => recipePlanCard(snapshot.stash, recipe.id, roots.onCraftRecipe)));
};

const collectionSummaryCard = (collectionCount: number, onAppraiseCollection: () => void) => {
  if (collectionCount <= 0) {
    return [];
  }

  const card = document.createElement('article');
  card.className = 'stash-card stash-card-collection';

  const glyph = document.createElement('span');
  glyph.className = 'stash-card-glyph';
  glyph.textContent = '?';

  const body = document.createElement('div');
  const name = document.createElement('strong');
  name.textContent = '未鑑定のコレクションアイテム';
  const detail = document.createElement('small');
  detail.textContent = '鑑定士に見せると正体が分かり、その場で買い取ってもらえる。';
  body.append(name, detail);

  const count = document.createElement('b');
  count.textContent = `x${collectionCount}`;

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '鑑定して売る';
  button.addEventListener('click', onAppraiseCollection);

  card.append(glyph, body, count, button);
  return [card];
};

const hpBar = (hp: number, maxHp: number) => {
  const root = document.createElement('div');
  root.className = 'hp-bar';

  const label = document.createElement('span');
  label.textContent = 'HP';

  const track = document.createElement('div');
  track.className = 'hp-bar-track';

  const fill = document.createElement('div');
  fill.className = 'hp-bar-fill';
  fill.style.width = `${maxHp > 0 ? Math.round((hp / maxHp) * 100) : 0}%`;

  const value = document.createElement('strong');
  value.textContent = `${hp}/${maxHp}`;

  track.append(fill);
  root.append(label, track, value);
  return root;
};

const staminaBar = (stamina: number, maxStamina: number) => {
  const root = document.createElement('div');
  root.className = 'hp-bar stamina-bar';

  const label = document.createElement('span');
  label.textContent = 'スタミナ';

  const track = document.createElement('div');
  track.className = 'hp-bar-track stamina-bar-track';

  const fill = document.createElement('div');
  fill.className = 'hp-bar-fill stamina-bar-fill';
  fill.style.width = `${maxStamina > 0 ? Math.round((stamina / maxStamina) * 100) : 0}%`;

  const value = document.createElement('strong');
  value.textContent = `${stamina}/${maxStamina}`;

  track.append(fill);
  root.append(label, track, value);
  return root;
};

const mapCard = (mapId: MapId, onStartRaid: (mapId: MapId) => void) => {
  const map = MAP_DEFINITIONS[mapId];
  const biomes = map.biomes.map((biomeId) => BIOME_DEFINITIONS[biomeId]);
  const maxDanger = Math.max(...biomes.map((biome) => biome.danger));

  const card = document.createElement('article');
  card.className = 'biome-card';
  card.style.setProperty('--biome-color', biomes[0]?.color ?? '#93c5fd');

  const heading = document.createElement('h3');
  heading.textContent = map.name;

  const meta = document.createElement('p');
  meta.textContent = `危険度 ${maxDanger} / ${biomes.map((biome) => biome.name).join(' + ')}`;

  const terrain = document.createElement('small');
  terrain.textContent = map.tagline;

  const materials = document.createElement('div');
  materials.className = 'biome-materials';
  biomes.forEach((biome) => {
    biome.materials.forEach((item) => {
      const chip = document.createElement('span');
      chip.textContent = ITEM_DEFINITIONS[item].name;
      materials.append(chip);
    });
  });

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '出撃';
  button.addEventListener('click', () => onStartRaid(mapId));

  card.append(heading, meta, terrain, materials, button);
  return card;
};

const recipePlanCard = (inventory: Inventory, recipeId: RecipeId, onCraftRecipe: (recipe: RecipeId) => void) => {
  const recipe = CRAFTING_RECIPES.find((candidate) => candidate.id === recipeId);
  if (!recipe) {
    return document.createElement('article');
  }

  const complete = hasIngredients(inventory, recipe);
  const missing = missingIngredients(inventory, recipe);
  const suggestions = suggestedBiomesForRecipe(inventory, recipe);
  const card = document.createElement('article');
  card.className = complete ? 'recipe-plan-card is-ready' : 'recipe-plan-card';

  const header = document.createElement('div');
  header.className = 'recipe-plan-header';
  const title = document.createElement('h3');
  title.textContent = ITEM_DEFINITIONS[recipe.result.item].name;
  const tag = document.createElement('span');
  tag.textContent = complete ? '作れる' : '不足';
  header.append(title, tag);

  const description = document.createElement('p');
  description.textContent = recipe.description;

  const ingredients = document.createElement('dl');
  ingredients.className = 'recipe-ingredients';
  recipe.ingredients.forEach((ingredient) => {
    const definition = ITEM_DEFINITIONS[ingredient.item];
    const owned = inventory[ingredient.item];
    const enough = owned >= ingredient.amount;
    const term = document.createElement('dt');
    term.className = enough ? 'has-enough' : 'is-missing';
    term.textContent = definition.name;

    const detail = document.createElement('dd');
    const source = definition.sources.map(biomeName).join(' / ') || definition.obtain;
    detail.textContent = enough ? `${owned}/${ingredient.amount}` : `${owned}/${ingredient.amount} あと${ingredient.amount - owned} / ${source}`;
    ingredients.append(term, detail);
  });

  const footer = document.createElement('div');
  footer.className = 'recipe-plan-footer';
  const target = document.createElement('small');
  target.textContent =
    missing.length === 0
      ? `${recipe.facility}で作成可能`
      : `次の候補: ${suggestions.map(biomeName).join(' / ') || recipe.targetBiomes.map(biomeName).join(' / ')}`;
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '作る';
  button.disabled = !complete;
  button.addEventListener('click', () => onCraftRecipe(recipe.id));
  footer.append(target, button);

  card.append(header, description, ingredients, footer);
  return card;
};

const updateHandSwitcher = (snapshot: GameSnapshot, roots: HudRoots) => {
  if (snapshot.mode === 'base') {
    const cellsUsed = gridCellsUsed(snapshot.grids.hand);
    roots.previousHandButton.disabled = true;
    roots.nextHandButton.disabled = true;
    roots.handSlotRoot.classList.remove('is-empty');
    roots.handSlotRoot.replaceChildren(slotText('手持ち予定', `${cellsUsed}/${gridCellCount('hand')}マス 次の出撃で持ち込み`));
    return;
  }

  const handItems = ITEM_KINDS.filter((item) => snapshot.player.handInventory[item] > 0);
  const selected = snapshot.player.selectedHandItem;
  const selectedCount = selected ? snapshot.player.handInventory[selected] : 0;

  roots.previousHandButton.disabled = handItems.length <= 1;
  roots.nextHandButton.disabled = handItems.length <= 1;

  if (!selected || selectedCount <= 0) {
    roots.handSlotRoot.classList.add('is-empty');
    roots.handSlotRoot.replaceChildren(slotText('手持ちなし', '装備インベントリは空です'));
    return;
  }

  const definition = ITEM_DEFINITIONS[selected];
  const name = document.createElement('strong');
  name.textContent = definition.name;

  const count = document.createElement('span');
  count.textContent = `x${selectedCount}`;

  const detail = document.createElement('small');
  detail.textContent = definition.category === 'consumable' ? '使用できる道具' : '手持ち装備';

  roots.handSlotRoot.classList.remove('is-empty');
  roots.handSlotRoot.replaceChildren(name, count, detail);
};

const slotText = (labelText: string, detailText: string) => {
  const fragment = document.createDocumentFragment();
  const label = document.createElement('strong');
  label.textContent = labelText;
  const detail = document.createElement('small');
  detail.textContent = detailText;
  fragment.append(label, detail);
  return fragment;
};

const inventoryPanelNodes = (
  snapshot: GameSnapshot,
  onMoveItem?: (item: ItemKind, from: InventoryLocation, to: InventoryLocation, x?: number, y?: number) => void,
  onPlaceItem?: (item: ItemKind, location: InventoryLocation, x: number, y: number) => void,
) => {
  if (snapshot.mode === 'base') {
    return [
      inventorySummary('手持ち予定', 'hand', gridCellsUsed(snapshot.grids.hand), '次の探索で自動的に持ち込む装備と道具です。'),
      inventoryGridElement('hand', snapshot.grids.hand, snapshot.baseLoadout, onMoveItem, onPlaceItem),
      inventorySummary('倉庫', 'stash', gridCellsUsed(snapshot.grids.stash), '拠点に保管している素材と予備品です。ドラッグで自由に並べ替えられます。'),
      inventoryGridElement('stash', snapshot.grids.stash, snapshot.stash, onMoveItem, onPlaceItem),
    ];
  }

  return [
    inventorySummary('手持ち', 'hand', gridCellsUsed(snapshot.grids.hand), '上部の切り替えに出る装備と消耗品です。'),
    inventoryGridElement('hand', snapshot.grids.hand, snapshot.player.handInventory, onMoveItem, onPlaceItem),
    inventorySummary('持ち帰りバッグ', 'raidBag', gridCellsUsed(snapshot.grids.raidBag), 'ここに入った物だけが拠点へ持ち帰れます。'),
    inventoryGridElement('raidBag', snapshot.grids.raidBag, snapshot.player.raidInventory, onMoveItem, onPlaceItem),
  ];
};

const gridCellsUsed = (placed: PlacedItem[]) => placed.reduce((total, entry) => total + entry.width * entry.height, 0);

const inventorySummary = (labelText: string, location: InventoryLocation, cellsUsed: number, detailText: string) => {
  const root = document.createElement('div');
  root.className = 'inventory-summary';

  const label = document.createElement('strong');
  label.textContent = `${labelText} ${cellsUsed}/${gridCellCount(location)}マス`;

  const detail = document.createElement('small');
  detail.textContent = detailText;

  root.append(label, detail);
  return root;
};

const lastKnownLayouts: Partial<Record<InventoryLocation, PlacedItem[]>> = {};

const inventoryGridElement = (
  location: InventoryLocation,
  placed: PlacedItem[],
  inventory: Inventory,
  onMoveItem?: (item: ItemKind, from: InventoryLocation, to: InventoryLocation, x?: number, y?: number) => void,
  onPlaceItem?: (item: ItemKind, location: InventoryLocation, x: number, y: number) => void,
) => {
  lastKnownLayouts[location] = placed;

  const { cols, rows } = GRID_DIMENSIONS[location];
  const grid = document.createElement('div');
  grid.className = 'inventory-grid';
  grid.dataset.inventoryLocation = location;
  grid.style.setProperty('--grid-cols', String(cols));
  grid.style.setProperty('--grid-rows', String(rows));

  for (let index = 0; index < cols * rows; index += 1) {
    const cell = document.createElement('div');
    cell.className = 'inventory-cell';
    cell.style.gridColumn = String((index % cols) + 1);
    cell.style.gridRow = String(Math.floor(index / cols) + 1);
    grid.append(cell);
  }

  placed.forEach((entry) => {
    grid.append(inventorySlot(entry, inventory[entry.item] ?? 0, location, onMoveItem, onPlaceItem));
  });

  return grid;
};

const inventorySlot = (
  entry: PlacedItem,
  count: number,
  location: InventoryLocation,
  onMoveItem?: (item: ItemKind, from: InventoryLocation, to: InventoryLocation, x?: number, y?: number) => void,
  onPlaceItem?: (item: ItemKind, location: InventoryLocation, x: number, y: number) => void,
) => {
  const definition = ITEM_DEFINITIONS[entry.item];
  const isUnidentified = definition.category === 'collection';
  const slot = document.createElement('button');
  slot.type = 'button';
  slot.className = 'inventory-slot';
  slot.style.gridColumn = `${entry.x + 1} / span ${entry.width}`;
  slot.style.gridRow = `${entry.y + 1} / span ${entry.height}`;
  slot.dataset.item = entry.item;
  slot.dataset.inventoryLocation = location;
  slot.setAttribute('aria-label', isUnidentified ? `未鑑定のコレクションアイテム x${count}` : `${definition.name} x${count}`);
  slot.title = isUnidentified
    ? '未鑑定のコレクションアイテム。鑑定士に見せるまで正体が分からない。'
    : `${definition.name} x${count}: ${definition.description}`;
  bindInventoryDrag(slot, entry.item, location, onMoveItem, onPlaceItem);

  const glyph = document.createElement('span');
  glyph.className = 'inventory-slot-glyph';
  glyph.textContent = emojiForItem(entry.item);
  slot.append(glyph);

  if (count > 1) {
    const countEl = document.createElement('b');
    countEl.className = 'inventory-slot-count';
    countEl.textContent = `x${count}`;
    slot.append(countEl);
  }

  const name = document.createElement('small');
  name.textContent = isUnidentified ? '未鑑定' : definition.name;
  slot.append(name);

  if (entry.maxDurability !== undefined && entry.durability !== undefined) {
    const durabilityTrack = document.createElement('div');
    durabilityTrack.className = 'inventory-slot-durability';
    const durabilityFill = document.createElement('div');
    durabilityFill.className = 'inventory-slot-durability-fill';
    durabilityFill.style.width = `${Math.max(0, Math.round((entry.durability / entry.maxDurability) * 100))}%`;
    durabilityTrack.append(durabilityFill);
    slot.append(durabilityTrack);
  }

  return slot;
};

const bindInventoryDrag = (
  slot: HTMLElement,
  itemKind: ItemKind,
  location: InventoryLocation,
  onMoveItem?: (item: ItemKind, from: InventoryLocation, to: InventoryLocation, x?: number, y?: number) => void,
  onPlaceItem?: (item: ItemKind, location: InventoryLocation, x: number, y: number) => void,
) => {
  if (!onMoveItem) {
    return;
  }

  const beginDrag = (x: number, y: number, isTouchDrag = false) => {
    if (inventoryDragState) {
      return;
    }

    endInventoryDrag(false);
    const ghost = inventoryDragGhost(itemKind, slot);
    const ghostHost = slot.closest('dialog') ?? document.body;
    ghostHost.append(ghost);
    inventoryDragState = {
      item: itemKind,
      from: location,
      startX: x,
      startY: y,
      ghost,
      isTouchDrag,
      onMoveItem,
      onPlaceItem,
    };
    slot.classList.add('is-drag-source');
    moveInventoryGhost(x, y);
  };

  slot.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    beginDrag(event.clientX, event.clientY, event.pointerType === 'touch');
    try {
      slot.setPointerCapture(event.pointerId);
    } catch {
      // Some touch browsers do not allow capture after DOM updates.
    }
  });

  slot.addEventListener('mousedown', (event) => {
    if (event.button !== 0 || inventoryDragState) {
      return;
    }

    event.preventDefault();
    beginDrag(event.clientX, event.clientY);
  });

  slot.addEventListener(
    'touchstart',
    (event) => {
      if (inventoryDragState) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      event.preventDefault();
      beginDrag(touch.clientX, touch.clientY, true);
    },
    { passive: false },
  );
};

const inventoryDragGhost = (itemKind: ItemKind, sourceSlot: HTMLElement) => {
  const ghost = document.createElement('div');
  const sourceRect = sourceSlot.getBoundingClientRect();
  const sourceCount = sourceSlot.querySelector<HTMLElement>('.inventory-slot-count')?.textContent;
  ghost.className = 'inventory-drag-ghost';
  ghost.style.setProperty('--drag-item-size', `${sourceRect.width}px`);
  ghost.style.left = '0px';
  ghost.style.top = '0px';

  const glyph = document.createElement('span');
  glyph.className = 'inventory-drag-ghost-glyph';
  glyph.textContent = emojiForItem(itemKind);

  const count = document.createElement('b');
  count.className = 'inventory-drag-ghost-count';
  count.textContent = sourceCount ?? '';

  ghost.append(glyph, count);
  return ghost;
};

const moveInventoryGhost = (x: number, y: number) => {
  if (!inventoryDragState) {
    return;
  }

  const point = inventoryDragPoint(x, y);
  inventoryDragState.ghost.style.transform = `translate3d(${Math.round(point.x)}px, ${Math.round(point.y)}px, 0) translate(-50%, -50%)`;
  updateInventoryDropPreview(point.x, point.y);
};

const inventoryDragPoint = (x: number, y: number) => {
  if (!inventoryDragState?.isTouchDrag) {
    return { x, y };
  }

  return {
    x: x + TOUCH_DRAG_GHOST_OFFSET,
    y: y + TOUCH_DRAG_GHOST_OFFSET,
  };
};

const gridElementAtPoint = (x: number, y: number) => document.elementFromPoint(x, y)?.closest<HTMLElement>('.inventory-grid') ?? undefined;

// Snaps to the nearest cell (not just whichever cell the raw pointer sits in) and
// centers the dragged item's footprint on the pointer, so lining it up feels forgiving.
const snappedCellAtPoint = (grid: HTMLElement, x: number, y: number, width: number, height: number) => {
  const location = grid.dataset.inventoryLocation as InventoryLocation;
  const { cols, rows } = GRID_DIMENSIONS[location];
  const rect = grid.getBoundingClientRect();
  const cellWidth = rect.width / cols;
  const cellHeight = rect.height / rows;
  const rawX = (x - rect.left) / cellWidth - width / 2;
  const rawY = (y - rect.top) / cellHeight - height / 2;
  return {
    x: Math.max(0, Math.min(cols - width, Math.round(rawX))),
    y: Math.max(0, Math.min(rows - height, Math.round(rawY))),
  };
};

let placementPreviewEl: HTMLElement | null = null;

const clearPlacementPreview = () => {
  placementPreviewEl?.remove();
  placementPreviewEl = null;
};

const showPlacementPreview = (grid: HTMLElement, cell: { x: number; y: number }, width: number, height: number, blocked: boolean) => {
  if (!placementPreviewEl) {
    placementPreviewEl = document.createElement('div');
    placementPreviewEl.className = 'inventory-placement-preview';
  }
  placementPreviewEl.classList.toggle('is-blocked', blocked);
  placementPreviewEl.style.gridColumn = `${cell.x + 1} / span ${width}`;
  placementPreviewEl.style.gridRow = `${cell.y + 1} / span ${height}`;
  if (placementPreviewEl.parentElement !== grid) {
    grid.append(placementPreviewEl);
  }
};

const updateInventoryDropPreview = (x: number, y: number) => {
  const state = inventoryDragState;
  if (!state) {
    clearInventoryDropPreview();
    return;
  }

  const grid = gridElementAtPoint(x, y);
  const location = grid?.dataset.inventoryLocation as InventoryLocation | undefined;
  clearInventoryDropPreview();

  if (!grid || !location) {
    return;
  }

  const { width, height } = ITEM_DEFINITIONS[state.item].gridSize;
  const cell = snappedCellAtPoint(grid, x, y, width, height);
  const layout = lastKnownLayouts[location] ?? [];
  const blocked = layout.some((entry) => entry.item !== state.item && overlaps(entry, cell.x, cell.y, width, height));
  if (location !== state.from) {
    grid.classList.add('is-drop-target');
  }
  showPlacementPreview(grid, cell, width, height, blocked);
};

const clearInventoryDropPreview = () => {
  document.querySelectorAll<HTMLElement>('.inventory-grid.is-drop-target').forEach((grid) => {
    grid.classList.remove('is-drop-target');
  });
  clearPlacementPreview();
};

const endInventoryDrag = (commit: boolean, x = 0, y = 0) => {
  const state = inventoryDragState;
  if (!state) {
    return;
  }

  const distance = Math.hypot(x - state.startX, y - state.startY);
  state.ghost.remove();
  inventoryDragState = null;
  document.querySelectorAll<HTMLElement>('.inventory-slot.is-drag-source').forEach((slot) => {
    slot.classList.remove('is-drag-source');
  });
  clearInventoryDropPreview();

  if (!commit || distance < DRAG_MOVE_THRESHOLD) {
    return;
  }

  const point = inventoryDragPoint(x, y);
  const grid = gridElementAtPoint(point.x, point.y);
  const location = grid?.dataset.inventoryLocation as InventoryLocation | undefined;

  if (!grid || !location) {
    return;
  }

  const { width, height } = ITEM_DEFINITIONS[state.item].gridSize;
  const cell = snappedCellAtPoint(grid, point.x, point.y, width, height);

  if (location === state.from) {
    state.onPlaceItem?.(state.item, location, cell.x, cell.y);
    return;
  }

  state.onMoveItem?.(state.item, state.from, location, cell.x, cell.y);
};

const updateActionControls = (snapshot: GameSnapshot, roots: HudRoots) => {
  roots.returnToBaseButton.hidden = !snapshot.gameOver;
  roots.returnToBaseButton.disabled = !snapshot.gameOver;

  if (snapshot.gameOver) {
    roots.pickupButton.hidden = true;
    roots.pickupButton.disabled = true;
    roots.interactButton.hidden = true;
    roots.interactButton.disabled = true;
    roots.heldActionButton.hidden = true;
    roots.heldActionButton.disabled = true;
    roots.actionHintRoot.hidden = true;
    return;
  }

  const pickup = pickupAction(snapshot);
  const interact = interactAction(snapshot);
  const held = heldItemAction(snapshot);
  const hints = [pickup?.hint, interact?.hint, held?.hint].filter(Boolean);

  roots.pickupButton.hidden = !pickup;
  roots.pickupButton.disabled = !pickup;
  roots.pickupButton.textContent = pickup?.label ?? '拾う';
  roots.pickupButton.setAttribute('aria-label', pickup?.hint ?? '拾う');

  roots.interactButton.hidden = !interact;
  roots.interactButton.disabled = !interact;
  roots.interactButton.textContent = interact?.label ?? '調べる';
  roots.interactButton.setAttribute('aria-label', interact?.hint ?? '調べる');

  roots.heldActionButton.hidden = !held;
  roots.heldActionButton.disabled = !held || held.disabled === true;
  roots.heldActionButton.textContent = held?.label ?? '使う';
  roots.heldActionButton.setAttribute('aria-label', held?.hint ?? '使う');

  roots.actionHintRoot.hidden = hints.length === 0;
  roots.actionHintRoot.textContent = hints.join(' / ');
};

const pickupAction = (snapshot: GameSnapshot): ContextAction | undefined => {
  if (snapshot.mode !== 'raid') {
    return undefined;
  }

  const player = playerEntity(snapshot);
  const item = player ? itemAt(snapshot, player.x, player.y) : undefined;
  if (!item?.item) {
    return undefined;
  }

  const definition = ITEM_DEFINITIONS[item.item];
  const usesHandSlot = definition.category === 'consumable' || definition.category === 'equipment';
  const fits = usesHandSlot
    ? canFitAdditionalUnit(snapshot.player.handInventory, snapshot.grids.hand, item.item, GRID_DIMENSIONS.hand)
    : canFitAdditionalUnit(snapshot.player.raidInventory, snapshot.grids.raidBag, item.item, GRID_DIMENSIONS.raidBag);

  if (!fits) {
    return undefined;
  }

  return {
    label: '拾う',
    hint: `${definition.name}を拾ってバッグに入れる。`,
  };
};

const interactAction = (snapshot: GameSnapshot): ContextAction | undefined => {
  const player = playerEntity(snapshot);
  if (!player) {
    return undefined;
  }

  if (snapshot.mode === 'base') {
    const station = stationForInteraction(snapshot, player);
    if (!station) {
      return undefined;
    }

    return {
      label: '調べる',
      hint: stationHint(station, snapshot.stash),
    };
  }

  const raidStation = stationForInteraction(snapshot, player);
  if (raidStation?.station === 'barterMerchant') {
    return {
      label: '取引',
      hint: barterHint(raidStation, snapshot),
    };
  }

  const tile = snapshot.tiles[player.y * snapshot.width + player.x];
  if (tile?.kind === 'stairs') {
    return {
      label: '脱出',
      hint: '脱出してバッグの中身を倉庫に持ち帰る。',
    };
  }

  return undefined;
};

const barterHint = (station: Entity, snapshot: GameSnapshot) => {
  const tile = snapshot.tiles[station.y * snapshot.width + station.x];
  const biome = tile?.biome;
  const trade = biome ? BARTER_TRADES[biome] : undefined;
  if (!trade) {
    return '行商人と話す。';
  }

  const owned = snapshot.player.raidInventory[trade.give];
  const giveName = ITEM_DEFINITIONS[trade.give].name;
  const getName = ITEM_DEFINITIONS[trade.get].name;
  return owned >= trade.giveAmount
    ? `行商人と取引し、${giveName}x${trade.giveAmount}を${getName}と交換する。`
    : `行商人: ${giveName}を${trade.giveAmount}個持ってくると${getName}と交換する。今は${owned}個。`;
};

const heldItemAction = (snapshot: GameSnapshot): ContextAction | undefined => {
  if (snapshot.mode !== 'raid') {
    return undefined;
  }

  const player = playerEntity(snapshot);
  const selected = snapshot.player.selectedHandItem;
  const hasSelected = Boolean(selected && snapshot.player.handInventory[selected] > 0);

  if (!hasSelected) {
    const targetTile = player ? tileInFront(snapshot, player) : undefined;
    if (targetTile && isGatheringTile(targetTile.kind)) {
      return {
        label: '掘る(素手)',
        hint: '素手で採取する。ピッケルより効率が悪く、スタミナを多く使う。',
      };
    }

    return undefined;
  }

  const stats = player?.stats;
  const definition = ITEM_DEFINITIONS[selected as ItemKind];

  if (definition.category === 'consumable' || definition.staminaRestore) {
    if (definition.staminaRestore) {
      const canEat = snapshot.player.stamina < snapshot.player.maxStamina;
      return {
        label: '食べる',
        hint: canEat ? `${definition.name}を食べてスタミナを回復する。` : 'スタミナはすでに満タンだ。',
        disabled: !canEat,
      };
    }
    const canHeal = Boolean(stats && stats.hp < stats.maxHp);
    const isHealingItem = selected === 'potion' || selected === 'hiPotion' || selected === 'bandage';
    return {
      label: isHealingItem ? '回復' : '使う',
      hint: isHealingItem
        ? canHeal
          ? `${definition.name}を使ってHPを回復する。`
          : 'HPが最大なので回復系アイテムはまだ使えない。'
        : `${definition.name}を使う。`,
      disabled: isHealingItem && !canHeal,
    };
  }

  if (selected === 'pickaxe') {
    const targetTile = player ? tileInFront(snapshot, player) : undefined;
    const canMine = targetTile?.kind === 'wall' || Boolean(targetTile && isGatheringTile(targetTile.kind));
    return {
      label: '掘る',
      hint: canMine ? '正面の壁や採取ポイントを調べる。' : '正面に掘れる壁や採取ポイントがない。',
      disabled: !canMine,
    };
  }

  if (selected === 'sword') {
    const target = player ? entityInFront(snapshot, player) : undefined;
    const canSlash = target?.kind === 'monster';
    return {
      label: '斬る',
      hint: canSlash ? `${target.name}を斬る。` : '正面に斬れる敵がいない。',
      disabled: !canSlash,
    };
  }

  if (selected === 'bow') {
    const target = player ? monsterInLine(snapshot, player, 5) : undefined;
    return {
      label: '射る',
      hint: target ? `${target.name}を弓で狙う。` : '向いている方向に狙える敵がいない。',
      disabled: !target,
    };
  }

  return {
    label: '使う',
    hint: `${definition.name}は今は使えない。`,
    disabled: true,
  };
};

const playerEntity = (snapshot: GameSnapshot) => snapshot.entities.find((entity) => entity.id === snapshot.playerId);

const itemAt = (snapshot: GameSnapshot, x: number, y: number) =>
  snapshot.entities.find((entity) => entity.kind === 'item' && entity.x === x && entity.y === y);

const entityInFront = (snapshot: GameSnapshot, player: Entity) =>
  snapshot.entities.find(
    (entity) =>
      entity.blocks &&
      entity.x === player.x + snapshot.player.facing.x &&
      entity.y === player.y + snapshot.player.facing.y,
  );

const tileInFront = (snapshot: GameSnapshot, player: Entity) =>
  snapshot.tiles[(player.y + snapshot.player.facing.y) * snapshot.width + player.x + snapshot.player.facing.x];

const monsterInLine = (snapshot: GameSnapshot, player: Entity, range: number) => {
  for (let step = 1; step <= range; step += 1) {
    const x = player.x + snapshot.player.facing.x * step;
    const y = player.y + snapshot.player.facing.y * step;
    if (x < 0 || y < 0 || x >= snapshot.width || y >= snapshot.height) {
      return undefined;
    }

    const tile = snapshot.tiles[y * snapshot.width + x];
    if (tile?.kind === 'wall' || (tile && isGatheringTile(tile.kind))) {
      return undefined;
    }

    const target = snapshot.entities.find((entity) => entity.kind === 'monster' && entity.x === x && entity.y === y);
    if (target) {
      return target;
    }
  }

  return undefined;
};

const stationForInteraction = (snapshot: GameSnapshot, player: Entity) => {
  const inFront = snapshot.entities.find(
    (entity) =>
      entity.kind === 'station' &&
      entity.x === player.x + snapshot.player.facing.x &&
      entity.y === player.y + snapshot.player.facing.y,
  );
  if (inFront) {
    return inFront;
  }

  return snapshot.entities
    .filter((entity) => entity.kind === 'station' && distance(entity, player) <= 1)
    .sort((a, b) => a.id.localeCompare(b.id))[0];
};

const stationHint = (station: Entity, stash: Inventory) => {
  switch (station.station) {
    case 'raidGate':
      return '出撃ゲートを調べると最初のマップへ出撃する。行き先を選ぶには上の「出撃」ボタンから作戦画面を開こう。';
    case 'stash':
      return '倉庫を調べると中身と所持金をログに表示する。';
    case 'craft': {
      const recipe = CRAFTING_RECIPES[0];
      if (!recipe) {
        return 'クラフト台を調べる。';
      }
      if (hasIngredients(stash, recipe)) {
        return `クラフト台で${formatStack(recipe.result)}を作る。`;
      }
      return `クラフト台を調べる。素材不足: ${recipe.ingredients.map(formatStack).join(' / ')}。`;
    }
    case 'market':
      return hasSellableMaterial(stash) ? '商人娘の換金所で素材をまとめて売る。' : '商人娘の換金所を調べる。売れる素材はない。';
    case 'compendium':
      return '図鑑端末を調べると図鑑の案内を表示する。';
    case 'appraiser':
      return '鑑定士にコレクションアイテムを見せて鑑定し、その場で買い取ってもらう。';
    case 'barterMerchant':
      return '行商人と物々交換する。';
    default:
      return `${station.name}を調べる。`;
  }
};

const hasSellableMaterial = (stash: Inventory) =>
  ITEM_KINDS.some((item) => ITEM_DEFINITIONS[item].category === 'material' && stash[item] > 0);

const distance = (a: Entity, b: Entity) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

const isGatheringTile = (kind: GameSnapshot['tiles'][number]['kind']) =>
  kind === 'ore' || kind === 'forage' || kind === 'crate' || kind === 'device' || kind === 'locked';

const biomeName = (biome: BiomeId) => BIOME_DEFINITIONS[biome].name;
