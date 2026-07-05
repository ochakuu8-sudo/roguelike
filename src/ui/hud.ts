import type { Entity, GameSnapshot, Inventory, ItemKind } from '../engine/types';
import { ITEM_DEFINITIONS, ITEM_KINDS } from '../game/items';
import { CRAFTING_RECIPES, formatStack, hasIngredients } from '../game/recipes';

type HudRoots = {
  statusRoot: HTMLElement;
  inventoryRoot: HTMLElement;
  itemListRoot: HTMLElement;
  logRoot: HTMLOListElement;
  actionHintRoot: HTMLElement;
  pickupButton: HTMLButtonElement;
  interactButton: HTMLButtonElement;
  onUseItem: (item: ItemKind) => void;
};

export const updateHud = (snapshot: GameSnapshot, roots: HudRoots) => {
  const player = snapshot.entities.find((entity) => entity.id === snapshot.playerId);
  const stats = player?.stats;
  const inventorySource = snapshot.mode === 'base' ? snapshot.stash : snapshot.player.raidInventory;
  roots.statusRoot.replaceChildren(hpBar(Math.max(0, stats?.hp ?? 0), stats?.maxHp ?? 0));

  const inventoryEntries = ITEM_KINDS.filter((item) => inventorySource[item] > 0);

  roots.inventoryRoot.replaceChildren(
    ...nonEmptyNodes(
      inventoryEntries.map((item) => inventoryItem(item, inventorySource[item])),
      snapshot.mode === 'base' ? '倉庫は空です' : '道具なし',
    ),
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
    ...nonEmptyNodes(
      snapshot.mode === 'base'
        ? inventoryEntries.map((item) => inventoryItem(item, inventorySource[item]))
        : inventoryEntries.map((item) => inventoryAction(item, inventorySource[item], () => roots.onUseItem(item))),
      snapshot.mode === 'base' ? '倉庫は空です' : '道具なし',
    ),
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

const inventoryItem = (itemKind: ItemKind, count: number) => {
  const definition = ITEM_DEFINITIONS[itemKind];
  const item = document.createElement('div');
  item.className = 'inventory-item';

  const label = document.createElement('strong');
  label.textContent = definition.name;

  const value = document.createElement('span');
  value.textContent = `×${count}`;

  const detail = document.createElement('small');
  detail.textContent = definition.description;

  item.append(label, value, detail);
  return item;
};

const inventoryAction = (itemKind: ItemKind, count: number, onUse: () => void) => {
  const definition = ITEM_DEFINITIONS[itemKind];
  const item = document.createElement('div');
  item.className = 'item-row';

  const body = document.createElement('div');
  const label = document.createElement('strong');
  label.textContent = definition.name;

  const detail = document.createElement('small');
  detail.textContent = `${definition.description} ${count}個`;

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = definition.category === 'consumable' ? '使う' : '素材';
  button.disabled = definition.category !== 'consumable' || count <= 0;
  if (definition.category === 'consumable') {
    button.addEventListener('click', onUse);
  }

  body.append(label, detail);
  item.append(body, button);
  return item;
};

const updateActionControls = (snapshot: GameSnapshot, roots: HudRoots) => {
  const pickup = pickupAction(snapshot);
  const interact = interactAction(snapshot);
  const hints = [pickup?.hint, interact?.hint].filter(Boolean);

  roots.pickupButton.hidden = !pickup;
  roots.pickupButton.disabled = !pickup;
  roots.pickupButton.textContent = pickup?.label ?? '拾う';
  roots.pickupButton.setAttribute('aria-label', pickup?.hint ?? '拾う');

  roots.interactButton.hidden = !interact;
  roots.interactButton.disabled = !interact;
  roots.interactButton.textContent = interact?.label ?? '調べる';
  roots.interactButton.setAttribute('aria-label', interact?.hint ?? '調べる');

  roots.actionHintRoot.hidden = hints.length === 0;
  roots.actionHintRoot.textContent = hints.join(' / ');
};

const pickupAction = (snapshot: GameSnapshot) => {
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

const interactAction = (snapshot: GameSnapshot) => {
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

const playerEntity = (snapshot: GameSnapshot) => snapshot.entities.find((entity) => entity.id === snapshot.playerId);

const itemAt = (snapshot: GameSnapshot, x: number, y: number) =>
  snapshot.entities.find((entity) => entity.kind === 'item' && entity.x === x && entity.y === y);

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
  ITEM_KINDS.reduce((total, itemKind) => total + inventory[itemKind] * ITEM_DEFINITIONS[itemKind].size, 0) + ITEM_DEFINITIONS[item].size <= capacity;

const hasSellableMaterial = (stash: Inventory) =>
  ITEM_KINDS.some((item) => ITEM_DEFINITIONS[item].category === 'material' && stash[item] > 0);

const distance = (a: Entity, b: Entity) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

const nonEmptyNodes = (nodes: HTMLElement[], emptyText: string) => {
  if (nodes.length > 0) {
    return nodes;
  }

  const empty = document.createElement('p');
  empty.className = 'empty-list';
  empty.textContent = emptyText;
  return [empty];
};
