import type { BiomeId, Entity, GameSnapshot, Inventory, InventoryLocation, ItemKind, RecipeId } from '../engine/types';
import { BIOME_DEFINITIONS, BIOME_IDS } from '../game/biomes';
import { inventoryItemCount, ITEM_DEFINITIONS, ITEM_KINDS } from '../game/items';
import { CRAFTING_RECIPES, formatStack, hasIngredients, missingIngredients, suggestedBiomesForRecipe } from '../game/recipes';

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
  attackButton: HTMLButtonElement;
  heldActionButton: HTMLButtonElement;
  onUseItem: (item: ItemKind) => void;
  onMoveItem: (item: ItemKind, from: InventoryLocation, to: InventoryLocation) => void;
};

type BasePlanningRoots = {
  biomeRoot: HTMLElement;
  stashRoot: HTMLElement;
  recipeRoot: HTMLElement;
  moneyRoot: HTMLElement;
  onStartRaid: (biome: BiomeId) => void;
  onCraftRecipe: (recipe: RecipeId) => void;
};

type ContextAction = {
  label: string;
  hint: string;
  disabled?: boolean;
};

type InventoryGridOptions = {
  layout: 'stash' | 'raidBag' | 'hand';
  location: InventoryLocation;
  moveTarget: InventoryLocation;
  minSlots: number;
  onUseItem?: (item: ItemKind) => void;
  onMoveItem?: (item: ItemKind, from: InventoryLocation, to: InventoryLocation) => void;
};

const STASH_MIN_SLOTS = 60;
const EQUIPMENT_SLOTS = 6;
const SWIPE_MOVE_THRESHOLD = 28;

export const updateHud = (snapshot: GameSnapshot, roots: HudRoots) => {
  const player = snapshot.entities.find((entity) => entity.id === snapshot.playerId);
  const stats = player?.stats;
  roots.statusRoot.replaceChildren(hpBar(Math.max(0, stats?.hp ?? 0), stats?.maxHp ?? 0));
  updateHandSwitcher(snapshot, roots);

  roots.inventoryRoot.replaceChildren(...inventoryPanelNodes(snapshot, undefined, roots.onMoveItem));

  roots.logRoot.replaceChildren(
    ...snapshot.messages.map((message) => {
      const item = document.createElement('li');
      item.textContent = message;
      return item;
    }),
  );
  roots.logRoot.scrollTop = roots.logRoot.scrollHeight;

  roots.itemListRoot.replaceChildren(...inventoryPanelNodes(snapshot, roots.onUseItem, roots.onMoveItem));

  updateActionControls(snapshot, roots);
};

export const updateBasePlanning = (snapshot: GameSnapshot, roots: BasePlanningRoots) => {
  roots.moneyRoot.textContent = `${snapshot.money}G`;
  roots.biomeRoot.replaceChildren(...BIOME_IDS.map((biome) => biomeCard(biome, roots.onStartRaid)));
  roots.stashRoot.replaceChildren(...stashCards(snapshot.stash));
  roots.recipeRoot.replaceChildren(...CRAFTING_RECIPES.map((recipe) => recipePlanCard(snapshot.stash, recipe.id, roots.onCraftRecipe)));
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

const biomeCard = (biomeId: BiomeId, onStartRaid: (biome: BiomeId) => void) => {
  const biome = BIOME_DEFINITIONS[biomeId];
  const card = document.createElement('article');
  card.className = 'biome-card';
  card.style.setProperty('--biome-color', biome.color);

  const heading = document.createElement('h3');
  heading.textContent = biome.name;

  const meta = document.createElement('p');
  meta.textContent = `危険度 ${biome.danger} / ${biome.purpose}`;

  const terrain = document.createElement('small');
  terrain.textContent = `${biome.terrain} / ${biome.landmark}`;

  const materials = document.createElement('div');
  materials.className = 'biome-materials';
  biome.materials.forEach((item) => {
    const chip = document.createElement('span');
    chip.textContent = ITEM_DEFINITIONS[item].name;
    materials.append(chip);
  });

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '出撃';
  button.addEventListener('click', () => onStartRaid(biomeId));

  card.append(heading, meta, terrain, materials, button);
  return card;
};

const stashCards = (inventory: Inventory) => {
  const items = ITEM_KINDS.filter((item) => inventory[item] > 0 && ITEM_DEFINITIONS[item].category !== 'upgrade');
  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-list';
    empty.textContent = '倉庫は空です。まず探索で素材を持ち帰りましょう。';
    return [empty];
  }

  return items.map((item) => {
    const definition = ITEM_DEFINITIONS[item];
    const card = document.createElement('article');
    card.className = `stash-card stash-card-${definition.category}`;
    card.title = `${definition.name}: ${definition.description}`;

    const glyph = document.createElement('span');
    glyph.className = 'stash-card-glyph';
    glyph.textContent = definition.glyph;
    glyph.style.color = definition.color;

    const body = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = definition.name;
    const detail = document.createElement('small');
    detail.textContent = `${categoryLabel(definition.category)} / ${definition.sources.map(biomeName).join('・') || definition.obtain}`;
    body.append(name, detail);

    const count = document.createElement('b');
    count.textContent = `x${inventory[item]}`;

    card.append(glyph, body, count);
    return card;
  });
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
    const loadout = snapshot.baseLoadout;
    const loadoutCount = inventoryItemCount(loadout);
    roots.previousHandButton.disabled = true;
    roots.nextHandButton.disabled = true;
    roots.handSlotRoot.classList.remove('is-empty');
    roots.handSlotRoot.replaceChildren(slotText('手持ち予定', `${loadoutCount}/${EQUIPMENT_SLOTS}枠 次の出撃で持ち込み`));
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
  onUseItem?: (item: ItemKind) => void,
  onMoveItem?: (item: ItemKind, from: InventoryLocation, to: InventoryLocation) => void,
) => {
  if (snapshot.mode === 'base') {
    const loadout = snapshot.baseLoadout;
    const storage = snapshot.stash;
    return [
      inventorySummary('手持ち予定', `${inventoryItemCount(loadout)}/${EQUIPMENT_SLOTS}枠`, '次の探索で自動的に持ち込む装備と道具です。'),
      inventoryGrid(loadout, {
        layout: 'hand',
        location: 'hand',
        moveTarget: 'stash',
        minSlots: EQUIPMENT_SLOTS,
        onMoveItem,
      }),
      inventorySummary('倉庫', `${inventoryItemCount(storage)}個`, '拠点に保管している素材と予備品です。大量保管用に小さくまとめて表示します。'),
      inventoryGrid(storage, {
        layout: 'stash',
        location: 'stash',
        moveTarget: 'hand',
        minSlots: STASH_MIN_SLOTS,
        onMoveItem,
      }),
    ];
  }

  return [
    inventorySummary(
      '手持ち',
      `${inventoryItemCount(snapshot.player.handInventory)}/${EQUIPMENT_SLOTS}枠`,
      '上部の切り替えに出る装備と消耗品です。',
    ),
    inventoryGrid(snapshot.player.handInventory, {
      layout: 'hand',
      location: 'hand',
      moveTarget: 'raidBag',
      minSlots: EQUIPMENT_SLOTS,
      onUseItem,
      onMoveItem,
    }),
    inventorySummary(
      '持ち帰りバッグ',
      `${inventoryItemCount(snapshot.player.raidInventory)}/${snapshot.player.raidCapacity}枠`,
      'ここに入った素材だけが拠点へ持ち帰れます。',
    ),
    inventoryGrid(snapshot.player.raidInventory, {
      layout: 'raidBag',
      location: 'raidBag',
      moveTarget: 'hand',
      minSlots: snapshot.player.raidCapacity,
      onMoveItem,
    }),
  ];
};

const inventorySummary = (labelText: string, countText: string, detailText: string) => {
  const root = document.createElement('div');
  root.className = 'inventory-summary';

  const label = document.createElement('strong');
  label.textContent = `${labelText} ${countText}`;

  const detail = document.createElement('small');
  detail.textContent = detailText;

  root.append(label, detail);
  return root;
};

const inventoryGrid = (
  inventory: Inventory,
  options: InventoryGridOptions,
) => {
  const items = inventoryEntries(inventory);
  const slotCount = Math.max(options.minSlots, items.length);
  const grid = document.createElement('div');
  grid.className = `inventory-grid inventory-grid-${options.layout}`;
  grid.dataset.inventoryLocation = options.location;

  for (let index = 0; index < slotCount; index += 1) {
    const item = items[index];
    grid.append(item ? inventorySlot(item.item, item.count, options) : emptyInventorySlot(index));
  }

  return grid;
};

const inventorySlot = (itemKind: ItemKind, countValue: number, options: InventoryGridOptions) => {
  const definition = ITEM_DEFINITIONS[itemKind];
  const interactive = Boolean(options.onUseItem && definition.category === 'consumable');
  const slot = document.createElement(interactive ? 'button' : 'div');
  slot.className = 'inventory-slot';
  slot.dataset.item = itemKind;
  slot.dataset.inventoryLocation = options.location;
  slot.setAttribute('aria-label', `${definition.name} x${countValue}`);
  slot.title = `${definition.name} x${countValue}: ${definition.description}`;

  if (slot instanceof HTMLButtonElement) {
    slot.type = 'button';
    slot.addEventListener('click', (event) => {
      if (slot.dataset.swipeMoved === 'true') {
        event.preventDefault();
        slot.dataset.swipeMoved = '';
        return;
      }
      options.onUseItem?.(itemKind);
    });
  }

  bindInventorySwipe(slot, itemKind, options);

  const glyph = document.createElement('span');
  glyph.className = 'inventory-slot-glyph';
  glyph.textContent = definition.glyph;
  glyph.style.color = definition.color;

  const name = document.createElement('small');
  name.textContent = definition.name;

  const count = document.createElement('b');
  count.className = 'inventory-slot-count';
  count.textContent = `x${countValue}`;

  slot.append(glyph, count, name);
  return slot;
};

const bindInventorySwipe = (slot: HTMLElement, itemKind: ItemKind, options: InventoryGridOptions) => {
  if (!options.onMoveItem) {
    return;
  }

  let startX = 0;
  let startY = 0;
  let pointerId: number | null = null;
  let activeInput: 'pointer' | 'mouse' | null = null;

  const beginSwipe = (x: number, y: number, input: 'pointer' | 'mouse') => {
    if (activeInput && activeInput !== input) {
      return false;
    }

    activeInput = input;
    startX = x;
    startY = y;
    slot.classList.add('is-swiping');
    return true;
  };

  const cancelSwipe = () => {
    pointerId = null;
    activeInput = null;
    slot.classList.remove('is-swiping');
  };

  const finishSwipe = (x: number, y: number, event: Event) => {
    if (!activeInput) {
      return;
    }

    const dx = x - startX;
    const dy = y - startY;
    const distance = Math.hypot(dx, dy);
    cancelSwipe();

    if (distance < SWIPE_MOVE_THRESHOLD) {
      return;
    }

    const target = inventoryDropTarget(x, y, options.location) ?? directionalMoveTarget(dy, options);
    if (!target) {
      return;
    }

    slot.dataset.swipeMoved = 'true';
    event.preventDefault();
    options.onMoveItem?.(itemKind, options.location, target);
  };

  slot.addEventListener('pointerdown', (event) => {
    pointerId = event.pointerId;
    beginSwipe(event.clientX, event.clientY, 'pointer');
    slot.setPointerCapture(event.pointerId);

    const onPointerUp = (pointerUpEvent: PointerEvent) => {
      if (pointerId !== pointerUpEvent.pointerId) {
        return;
      }

      document.removeEventListener('pointerup', onPointerUp);
      pointerId = null;
      finishSwipe(pointerUpEvent.clientX, pointerUpEvent.clientY, pointerUpEvent);
    };

    document.addEventListener('pointerup', onPointerUp);
  });

  slot.addEventListener('pointercancel', cancelSwipe);

  slot.addEventListener('lostpointercapture', () => {
    slot.classList.remove('is-swiping');
  });

  slot.addEventListener('pointerup', (event) => {
    if (pointerId !== event.pointerId) {
      return;
    }

    pointerId = null;
    finishSwipe(event.clientX, event.clientY, event);
  });

  slot.addEventListener('mousedown', (event) => {
    if (event.button !== 0 || !beginSwipe(event.clientX, event.clientY, 'mouse')) {
      return;
    }

    const onMouseUp = (mouseUpEvent: MouseEvent) => {
      document.removeEventListener('mouseup', onMouseUp);
      finishSwipe(mouseUpEvent.clientX, mouseUpEvent.clientY, mouseUpEvent);
    };

    document.addEventListener('mouseup', onMouseUp);
  });
};

const inventoryDropTarget = (x: number, y: number, source: InventoryLocation): InventoryLocation | undefined => {
  const element = document.elementFromPoint(x, y);
  const grid = element?.closest<HTMLElement>('.inventory-grid');
  const location = grid?.dataset.inventoryLocation as InventoryLocation | undefined;
  return location && location !== source ? location : undefined;
};

const directionalMoveTarget = (dy: number, options: InventoryGridOptions): InventoryLocation | undefined => {
  if (options.moveTarget === 'hand') {
    return dy < -SWIPE_MOVE_THRESHOLD * 0.6 ? options.moveTarget : undefined;
  }
  return dy > SWIPE_MOVE_THRESHOLD * 0.6 ? options.moveTarget : undefined;
};

const emptyInventorySlot = (index: number) => {
  const slot = document.createElement('div');
  slot.className = 'inventory-slot is-empty';
  slot.setAttribute('aria-label', `空きスロット ${index + 1}`);
  return slot;
};

const inventoryEntries = (inventory: Inventory) =>
  ITEM_KINDS.filter((item) => inventory[item] > 0).map((item) => ({
    item,
    count: inventory[item],
  }));

const updateActionControls = (snapshot: GameSnapshot, roots: HudRoots) => {
  const pickup = pickupAction(snapshot);
  const interact = interactAction(snapshot);
  const attack = attackAction(snapshot);
  const held = heldItemAction(snapshot);
  const hints = [pickup?.hint, interact?.hint, attack?.hint, held?.hint].filter(Boolean);

  roots.pickupButton.hidden = !pickup;
  roots.pickupButton.disabled = !pickup;
  roots.pickupButton.textContent = pickup?.label ?? '拾う';
  roots.pickupButton.setAttribute('aria-label', pickup?.hint ?? '拾う');

  roots.interactButton.hidden = !interact;
  roots.interactButton.disabled = !interact;
  roots.interactButton.textContent = interact?.label ?? '調べる';
  roots.interactButton.setAttribute('aria-label', interact?.hint ?? '調べる');

  roots.attackButton.hidden = !attack;
  roots.attackButton.disabled = !attack || attack.disabled === true;
  roots.attackButton.textContent = attack?.label ?? '攻撃';
  roots.attackButton.setAttribute('aria-label', attack?.hint ?? '攻撃');

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
  if (!canCarry(snapshot.player.raidInventory, item.item, snapshot.player.raidCapacity)) {
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

  const tile = snapshot.tiles[player.y * snapshot.width + player.x];
  if (tile?.kind === 'stairs') {
    return {
      label: '脱出',
      hint: '脱出してバッグの中身を倉庫に持ち帰る。',
    };
  }

  return undefined;
};

const attackAction = (snapshot: GameSnapshot): ContextAction | undefined => {
  if (snapshot.mode !== 'raid') {
    return undefined;
  }

  const player = playerEntity(snapshot);
  const target = player ? entityInFront(snapshot, player) : undefined;
  if (target?.kind !== 'monster') {
    return undefined;
  }

  return {
    label: '攻撃',
    hint: `${target.name}を攻撃する。`,
  };
};

const heldItemAction = (snapshot: GameSnapshot): ContextAction | undefined => {
  if (snapshot.mode !== 'raid') {
    return undefined;
  }

  const selected = snapshot.player.selectedHandItem;
  if (!selected || snapshot.player.handInventory[selected] <= 0) {
    return undefined;
  }

  const player = playerEntity(snapshot);
  const stats = player?.stats;
  const definition = ITEM_DEFINITIONS[selected];

  if (definition.category === 'consumable') {
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
      return '出撃ゲートを調べると探索へ出撃する。';
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
      return hasSellableMaterial(stash) ? '換金所で素材をまとめて売る。' : '換金所を調べる。売れる素材はない。';
    case 'compendium':
      return '図鑑端末を調べると図鑑の案内を表示する。';
    default:
      return `${station.name}を調べる。`;
  }
};

const canCarry = (inventory: Inventory, item: ItemKind, capacity: number) =>
  ITEM_DEFINITIONS[item].category === 'consumable' ||
  ITEM_DEFINITIONS[item].category === 'equipment' ||
  inventoryItemCount(inventory) + 1 <= capacity;

const hasSellableMaterial = (stash: Inventory) =>
  ITEM_KINDS.some((item) => ITEM_DEFINITIONS[item].category === 'material' && stash[item] > 0);

const distance = (a: Entity, b: Entity) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

const isGatheringTile = (kind: GameSnapshot['tiles'][number]['kind']) =>
  kind === 'ore' || kind === 'forage' || kind === 'crate' || kind === 'device' || kind === 'locked';

const biomeName = (biome: BiomeId) => BIOME_DEFINITIONS[biome].name;

const categoryLabel = (category: (typeof ITEM_DEFINITIONS)[ItemKind]['category']) => {
  if (category === 'consumable') {
    return '消耗品';
  }
  if (category === 'equipment') {
    return '装備';
  }
  if (category === 'upgrade') {
    return '強化';
  }
  return '素材';
};
