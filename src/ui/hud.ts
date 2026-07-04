import type { GameSnapshot, ItemKind } from '../engine/types';
import { ITEM_DEFINITIONS, ITEM_KINDS } from '../game/items';

type HudRoots = {
  statusRoot: HTMLElement;
  inventoryRoot: HTMLElement;
  itemListRoot: HTMLElement;
  logRoot: HTMLOListElement;
  onUseItem: (item: ItemKind) => void;
};

export const updateHud = (snapshot: GameSnapshot, roots: HudRoots) => {
  const player = snapshot.entities.find((entity) => entity.id === snapshot.playerId);
  const stats = player?.stats;

  roots.statusRoot.replaceChildren(
    metric('HP', `${Math.max(0, stats?.hp ?? 0)} / ${stats?.maxHp ?? 0}`),
    metric('Floor', String(snapshot.player.depth)),
    metric('Facing', directionLabel(snapshot.player.facing.x, snapshot.player.facing.y)),
    metric('Attack', String(stats?.attack ?? 0)),
    metric('Speed', String(stats?.speed ?? 0)),
  );

  const inventoryEntries = ITEM_KINDS.filter((item) => snapshot.player.inventory[item] > 0);

  roots.inventoryRoot.replaceChildren(
    ...nonEmptyNodes(
      inventoryEntries.map((item) => inventoryItem(item, snapshot.player.inventory[item])),
      'No items',
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
      inventoryEntries.map((item) => inventoryAction(item, snapshot.player.inventory[item], () => roots.onUseItem(item))),
      'No items',
    ),
  );
};

const metric = (label: string, value: string) => {
  const item = document.createElement('div');
  item.className = 'metric';

  const labelNode = document.createElement('span');
  labelNode.textContent = label;

  const valueNode = document.createElement('strong');
  valueNode.textContent = value;

  item.append(labelNode, valueNode);
  return item;
};

const inventoryItem = (itemKind: ItemKind, count: number) => {
  const definition = ITEM_DEFINITIONS[itemKind];
  const item = document.createElement('div');
  item.className = 'inventory-item';

  const label = document.createElement('strong');
  label.textContent = definition.name;

  const value = document.createElement('span');
  value.textContent = `x${count}`;

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
  detail.textContent = `${definition.description} x${count}`;

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = definition.category === 'consumable' ? 'Use' : 'Material';
  button.disabled = definition.category !== 'consumable' || count <= 0;
  if (definition.category === 'consumable') {
    button.addEventListener('click', onUse);
  }

  body.append(label, detail);
  item.append(body, button);
  return item;
};

const nonEmptyNodes = (nodes: HTMLElement[], emptyText: string) => {
  if (nodes.length > 0) {
    return nodes;
  }

  const empty = document.createElement('p');
  empty.className = 'empty-list';
  empty.textContent = emptyText;
  return [empty];
};

const directionLabel = (dx: number, dy: number) => {
  if (dx === 0 && dy < 0) {
    return 'N';
  }
  if (dx > 0 && dy < 0) {
    return 'NE';
  }
  if (dx > 0 && dy === 0) {
    return 'E';
  }
  if (dx > 0 && dy > 0) {
    return 'SE';
  }
  if (dx === 0 && dy > 0) {
    return 'S';
  }
  if (dx < 0 && dy > 0) {
    return 'SW';
  }
  if (dx < 0 && dy === 0) {
    return 'W';
  }
  return 'NW';
};
