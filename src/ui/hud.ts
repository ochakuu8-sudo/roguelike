import type { GameSnapshot } from '../engine/types';

type HudRoots = {
  statusRoot: HTMLElement;
  inventoryRoot: HTMLElement;
  itemListRoot: HTMLElement;
  logRoot: HTMLOListElement;
  onUseItem: (item: 'potion') => void;
};

export const updateHud = (snapshot: GameSnapshot, roots: HudRoots) => {
  const player = snapshot.entities.find((entity) => entity.id === snapshot.playerId);
  const stats = player?.stats;

  roots.statusRoot.replaceChildren(
    metric('HP', `${Math.max(0, stats?.hp ?? 0)} / ${stats?.maxHp ?? 0}`),
    metric('Floor', String(snapshot.player.depth)),
    metric('Facing', directionLabel(snapshot.player.facing.x, snapshot.player.facing.y)),
    metric('Attack', String(stats?.attack ?? 0)),
  );

  roots.inventoryRoot.replaceChildren(
    inventoryItem('Healing Potion', snapshot.player.potions, 'Restores up to 10 HP.'),
  );

  roots.logRoot.replaceChildren(
    ...snapshot.messages.map((message) => {
      const item = document.createElement('li');
      item.textContent = message;
      return item;
    }),
  );

  roots.itemListRoot.replaceChildren(
    inventoryAction('Healing Potion', snapshot.player.potions, 'Recover up to 10 HP.', () => roots.onUseItem('potion')),
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

const inventoryItem = (name: string, count: number, description: string) => {
  const item = document.createElement('div');
  item.className = 'inventory-item';

  const label = document.createElement('strong');
  label.textContent = name;

  const value = document.createElement('span');
  value.textContent = `x${count}`;

  const detail = document.createElement('small');
  detail.textContent = description;

  item.append(label, value, detail);
  return item;
};

const inventoryAction = (name: string, count: number, description: string, onUse: () => void) => {
  const item = document.createElement('div');
  item.className = 'item-row';

  const body = document.createElement('div');
  const label = document.createElement('strong');
  label.textContent = name;

  const detail = document.createElement('small');
  detail.textContent = `${description} x${count}`;

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Use';
  button.disabled = count <= 0;
  button.addEventListener('click', onUse);

  body.append(label, detail);
  item.append(body, button);
  return item;
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
