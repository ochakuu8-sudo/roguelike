import type { GameSnapshot, ItemKind, RecipeId } from '../engine/types';
import { ITEM_DEFINITIONS, ITEM_KINDS } from '../game/items';
import { CRAFTING_RECIPES, formatStack, hasIngredients } from '../game/recipes';

type HudRoots = {
  statusRoot: HTMLElement;
  inventoryRoot: HTMLElement;
  itemListRoot: HTMLElement;
  logRoot: HTMLOListElement;
  onUseItem: (item: ItemKind) => void;
};

type BaseRoots = {
  moneyRoot: HTMLElement;
  stashRoot: HTMLElement;
  craftRoot: HTMLElement;
  baseLogRoot: HTMLOListElement;
  onSellItem: (item: ItemKind) => void;
  onCraftItem: (recipe: RecipeId) => void;
};

export const updateHud = (snapshot: GameSnapshot, roots: HudRoots) => {
  const player = snapshot.entities.find((entity) => entity.id === snapshot.playerId);
  const stats = player?.stats;
  const usedSize = ITEM_KINDS.reduce((total, item) => total + snapshot.player.raidInventory[item] * ITEM_DEFINITIONS[item].size, 0);

  roots.statusRoot.replaceChildren(
    metric('HP', `${Math.max(0, stats?.hp ?? 0)} / ${stats?.maxHp ?? 0}`),
    metric('階層', String(snapshot.player.depth)),
    metric('向き', directionLabel(snapshot.player.facing.x, snapshot.player.facing.y)),
    metric('攻撃', String(stats?.attack ?? 0)),
    metric('バッグ', `${usedSize}/${snapshot.player.raidCapacity}`),
  );

  const inventoryEntries = ITEM_KINDS.filter((item) => snapshot.player.raidInventory[item] > 0);

  roots.inventoryRoot.replaceChildren(
    ...nonEmptyNodes(
      inventoryEntries.map((item) => inventoryItem(item, snapshot.player.raidInventory[item])),
      '道具なし',
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
      inventoryEntries.map((item) => inventoryAction(item, snapshot.player.raidInventory[item], () => roots.onUseItem(item))),
      '道具なし',
    ),
  );
};

export const updateBaseHud = (snapshot: GameSnapshot, roots: BaseRoots) => {
  const stashEntries = ITEM_KINDS.filter((item) => snapshot.stash[item] > 0);

  roots.moneyRoot.textContent = `${snapshot.money}G`;
  roots.stashRoot.replaceChildren(
    ...nonEmptyNodes(
      stashEntries.map((item) => stashAction(item, snapshot.stash[item], () => roots.onSellItem(item))),
      '倉庫は空です',
    ),
  );
  roots.craftRoot.replaceChildren(
    ...CRAFTING_RECIPES.map((recipe) =>
      recipeAction(recipe, hasIngredients(snapshot.stash, recipe), () => roots.onCraftItem(recipe.id)),
    ),
  );

  roots.baseLogRoot.replaceChildren(
    ...snapshot.messages.slice(-6).map((message) => {
      const item = document.createElement('li');
      item.textContent = message;
      return item;
    }),
  );
  roots.baseLogRoot.scrollTop = roots.baseLogRoot.scrollHeight;
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

const stashAction = (itemKind: ItemKind, count: number, onSell: () => void) => {
  const definition = ITEM_DEFINITIONS[itemKind];
  const item = document.createElement('div');
  item.className = 'item-row';

  const body = document.createElement('div');
  const label = document.createElement('strong');
  label.textContent = definition.name;

  const detail = document.createElement('small');
  detail.textContent = `${definition.description} ${count}個 / 売値 ${definition.value}G`;

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '売る';
  button.disabled = count <= 0;
  button.addEventListener('click', onSell);

  body.append(label, detail);
  item.append(body, button);
  return item;
};

const recipeAction = (recipe: (typeof CRAFTING_RECIPES)[number], canCraft: boolean, onCraft: () => void) => {
  const result = ITEM_DEFINITIONS[recipe.result.item];
  const item = document.createElement('div');
  item.className = 'item-row';

  const body = document.createElement('div');
  const label = document.createElement('strong');
  label.textContent = formatStack(recipe.result);

  const detail = document.createElement('small');
  detail.textContent = `${recipe.ingredients.map(formatStack).join(' / ')} → ${result.name}`;

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '作る';
  button.disabled = !canCraft;
  button.addEventListener('click', onCraft);

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
