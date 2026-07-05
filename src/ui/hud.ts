import type { Entity, GameSnapshot, Inventory, ItemKind } from '../engine/types';
import { inventoryItemCount, ITEM_DEFINITIONS, ITEM_KINDS } from '../game/items';
import { CRAFTING_RECIPES, formatStack, hasIngredients } from '../game/recipes';

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
};

type ContextAction = {
  label: string;
  hint: string;
  disabled?: boolean;
};

const STASH_MIN_SLOTS = 24;

export const updateHud = (snapshot: GameSnapshot, roots: HudRoots) => {
  const player = snapshot.entities.find((entity) => entity.id === snapshot.playerId);
  const stats = player?.stats;
  const inventorySource = snapshot.mode === 'base' ? snapshot.stash : snapshot.player.raidInventory;
  const itemDialogSource = snapshot.mode === 'base' ? snapshot.stash : snapshot.player.raidInventory;
  roots.statusRoot.replaceChildren(hpBar(Math.max(0, stats?.hp ?? 0), stats?.maxHp ?? 0));
  updateHandSwitcher(snapshot, roots);

  roots.inventoryRoot.replaceChildren(
    inventorySummary(snapshot, inventorySource),
    inventoryGrid(inventorySource, {
      layout: snapshot.mode === 'base' ? 'stash' : 'raidBag',
      minSlots: snapshot.mode === 'base' ? STASH_MIN_SLOTS : snapshot.player.raidCapacity,
    }),
  );

  roots.logRoot.replaceChildren(
    ...snapshot.messages.map((message) => {
      const item = document.createElement('li');
      item.textContent = message;
      return item;
    }),
  );
  roots.logRoot.scrollTop = roots.logRoot.scrollHeight;

  roots.itemListRoot.replaceChildren(
    inventorySummary(snapshot, itemDialogSource),
    inventoryGrid(itemDialogSource, {
      layout: snapshot.mode === 'base' ? 'stash' : 'raidBag',
      minSlots: snapshot.mode === 'base' ? STASH_MIN_SLOTS : snapshot.player.raidCapacity,
    }),
  );

  updateActionControls(snapshot, roots);
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

const updateHandSwitcher = (snapshot: GameSnapshot, roots: HudRoots) => {
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

const inventorySummary = (snapshot: GameSnapshot, inventory: Inventory) => {
  const root = document.createElement('div');
  root.className = 'inventory-summary';

  const label = document.createElement('strong');
  const detail = document.createElement('small');

  if (snapshot.mode === 'raid') {
    const used = inventoryItemCount(inventory);
    label.textContent = `持ち帰りバッグ ${used}/${snapshot.player.raidCapacity}枠`;
    detail.textContent = 'この枠に入った素材だけ拠点へ持ち帰れる。';
  } else {
    const stored = inventoryItemCount(inventory);
    label.textContent = `倉庫 ${stored}個`;
    detail.textContent = `拠点保管。探索で持ち帰れるバッグは${snapshot.player.raidCapacity}枠。`;
  }

  root.append(label, detail);
  return root;
};

const inventoryGrid = (
  inventory: Inventory,
  options: {
    layout: 'stash' | 'raidBag' | 'hand';
    minSlots: number;
    onUseItem?: (item: ItemKind) => void;
  },
) => {
  const items = inventoryItems(inventory);
  const slotCount = Math.max(options.minSlots, items.length);
  const grid = document.createElement('div');
  grid.className = `inventory-grid inventory-grid-${options.layout}`;

  for (let index = 0; index < slotCount; index += 1) {
    const item = items[index];
    grid.append(item ? inventorySlot(item, options.onUseItem) : emptyInventorySlot(index));
  }

  return grid;
};

const inventorySlot = (itemKind: ItemKind, onUseItem?: (item: ItemKind) => void) => {
  const definition = ITEM_DEFINITIONS[itemKind];
  const interactive = Boolean(onUseItem && definition.category === 'consumable');
  const slot = document.createElement(interactive ? 'button' : 'div');
  slot.className = 'inventory-slot';
  slot.setAttribute('aria-label', definition.name);
  slot.title = `${definition.name}: ${definition.description}`;

  if (slot instanceof HTMLButtonElement) {
    slot.type = 'button';
    slot.addEventListener('click', () => onUseItem?.(itemKind));
  }

  const glyph = document.createElement('span');
  glyph.className = 'inventory-slot-glyph';
  glyph.textContent = definition.glyph;
  glyph.style.color = definition.color;

  const name = document.createElement('small');
  name.textContent = definition.name;

  slot.append(glyph, name);
  return slot;
};

const emptyInventorySlot = (index: number) => {
  const slot = document.createElement('div');
  slot.className = 'inventory-slot is-empty';
  slot.setAttribute('aria-label', `空きスロット ${index + 1}`);
  return slot;
};

const inventoryItems = (inventory: Inventory) =>
  ITEM_KINDS.flatMap((item) => Array.from({ length: inventory[item] }, () => item));

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

  if (selected === 'potion') {
    const canHeal = Boolean(stats && stats.hp < stats.maxHp);
    return {
      label: '回復',
      hint: canHeal ? `${definition.name}を使ってHPを回復する。` : 'HPが最大なので回復薬はまだ使えない。',
      disabled: !canHeal,
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
  inventoryItemCount(inventory) + 1 <= capacity;

const hasSellableMaterial = (stash: Inventory) =>
  ITEM_KINDS.some((item) => ITEM_DEFINITIONS[item].category === 'material' && stash[item] > 0);

const distance = (a: Entity, b: Entity) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
