import type { GameSnapshot } from '../engine/types';

type HudRoots = {
  statusRoot: HTMLElement;
  inventoryRoot: HTMLElement;
  logRoot: HTMLOListElement;
};

export const updateHud = (snapshot: GameSnapshot, roots: HudRoots) => {
  const player = snapshot.entities.find((entity) => entity.id === snapshot.playerId);
  const stats = player?.stats;
  const potionButton = document.querySelector<HTMLButtonElement>('[data-command="usePotion"]');

  roots.statusRoot.replaceChildren(
    metric('HP', `${Math.max(0, stats?.hp ?? 0)} / ${stats?.maxHp ?? 0}`),
    metric('Floor', String(snapshot.player.depth)),
    metric('Attack', String(stats?.attack ?? 0)),
    metric('XP', String(snapshot.player.xp)),
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

  if (potionButton) {
    potionButton.textContent = `Potion x${snapshot.player.potions}`;
  }
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
