import type { ItemKind } from '../engine/types';
import { ITEM_ENTRIES } from '../game/compendium';
import { SPRITE_SHAPES, spriteKeyForItem } from './canvas-renderer';

type ItemInfoRoots = {
  dialog: HTMLDialogElement;
  glyphRoot: HTMLElement;
  titleRoot: HTMLElement;
  bodyRoot: HTMLElement;
};

export const showItemInfo = (item: ItemKind, roots: ItemInfoRoots) => {
  const entry = ITEM_ENTRIES.find((candidate) => candidate.id === item);
  if (!entry) {
    return;
  }

  roots.glyphRoot.textContent = SPRITE_SHAPES[spriteKeyForItem(item)];
  roots.titleRoot.textContent = entry.name;

  const description = document.createElement('p');
  description.textContent = entry.description;

  const details: Array<[string, string]> = [['分類', entry.category]];
  if (entry.attackInfo) {
    details.push(['攻撃', entry.attackInfo]);
  }
  if (entry.resistanceInfo) {
    details.push(['耐性', entry.resistanceInfo]);
  }
  details.push(
    ['サイズ', String(entry.size)],
    ['売値', `${entry.value}G`],
    ['主な入手先', entry.sources],
    ['入手方法', entry.obtain],
    ['レア度', entry.rarity],
  );

  const grid = document.createElement('dl');
  grid.className = 'compendium-details';
  details.forEach(([label, value]) => {
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    detail.textContent = value;
    grid.append(term, detail);
  });

  roots.bodyRoot.replaceChildren(description, grid);
  roots.dialog.showModal();
};
