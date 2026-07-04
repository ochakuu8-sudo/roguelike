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
  const inventorySource = snapshot.mode === 'base' ? snapshot.stash : snapshot.player.raidInventory;
  const stashCount = ITEM_KINDS.reduce((total, item) => total + snapshot.stash[item], 0);
  const usedSize = ITEM_KINDS.reduce((total, item) => total + snapshot.player.raidInventory[item] * ITEM_DEFINITIONS[item].size, 0);

  if (snapshot.mode === 'base') {
    roots.statusRoot.replaceChildren(
      metric('場所', '拠点'),
      metric('所持金', `${snapshot.money}G`),
      metric('倉庫', `${stashCount}個`),
      metric('向き', directionLabel(snapshot.player.facing.x, snapshot.player.facing.y)),
      metric('操作', '調べる'),
    );
  } else {
    roots.statusRoot.replaceChildren(
      metric('HP', `${Math.max(0, stats?.hp ?? 0)} / ${stats?.maxHp ?? 0}`),
      metric('階層', String(snapshot.player.depth)),
      metric('向き', directionLabel(snapshot.player.facing.x, snapshot.player.facing.y)),
      metric('攻撃', String(stats?.attack ?? 0)),
      metric('バッグ', `${usedSize}/${snapshot.player.raidCapacity}`),
    );
  }

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
    return '北';
  }
  if (dx > 0 && dy < 0) {
    return '北東';
  }
  if (dx > 0 && dy === 0) {
    return '東';
  }
  if (dx > 0 && dy > 0) {
    return '南東';
  }
  if (dx === 0 && dy > 0) {
    return '南';
  }
  if (dx < 0 && dy > 0) {
    return '南西';
  }
  if (dx < 0 && dy === 0) {
    return '西';
  }
  return '北西';
};
