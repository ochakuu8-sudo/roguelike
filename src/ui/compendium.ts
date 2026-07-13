import { ENEMY_ENTRIES, ITEM_ENTRIES, RECIPE_ENTRIES } from '../game/compendium';
import type { EnemyKind, ItemKind, StationKind } from '../engine/types';
import { SPRITE_SHAPES, renderSpriteIcon, type SpriteKey, spriteKeyForEnemy, spriteKeyForItem, spriteKeyForStation } from './canvas-renderer';

type CompendiumRoots = {
  tabsRoot: HTMLElement;
  listRoot: HTMLElement;
  searchRoot: HTMLInputElement;
  debugMode: boolean;
  onDebugSpawnEnemy: (enemy: EnemyKind) => void;
  onDebugGiveItem: (item: ItemKind) => void;
};

type CompendiumTab = 'enemies' | 'items' | 'recipes' | 'sprites';

const TAB_LABELS: Record<CompendiumTab, string> = {
  enemies: '敵',
  items: 'アイテム',
  recipes: 'レシピ',
  sprites: 'スプライト',
};

type SpriteAtlasEntry = {
  id: string;
  name: string;
  group: string;
  sprite: SpriteKey;
};

const STATION_SPRITE_ENTRIES: Array<{ id: StationKind; name: string }> = [
  { id: 'raidGate', name: '出撃ゲート' },
  { id: 'stash', name: '倉庫' },
  { id: 'craft', name: 'クラフト台' },
  { id: 'market', name: '換金所' },
  { id: 'compendium', name: '図鑑端末' },
];

let activeTab: CompendiumTab = 'enemies';

const matchesQuery = (query: string, ...fields: string[]) =>
  query.length === 0 || fields.some((field) => field.toLowerCase().includes(query));

const emptyStateNode = () => {
  const empty = document.createElement('p');
  empty.className = 'compendium-empty';
  empty.textContent = '該当する項目がありません。';
  return empty;
};

export const updateCompendium = ({ tabsRoot, listRoot, searchRoot, debugMode, onDebugSpawnEnemy, onDebugGiveItem }: CompendiumRoots) => {
  tabsRoot.replaceChildren(
    ...Object.entries(TAB_LABELS).map(([tab, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = tab === activeTab ? 'is-active' : '';
      button.textContent = label;
      button.addEventListener('click', () => {
        activeTab = tab as CompendiumTab;
        updateCompendium({ tabsRoot, listRoot, searchRoot, debugMode, onDebugSpawnEnemy, onDebugGiveItem });
      });
      return button;
    }),
  );

  const query = searchRoot.value.trim().toLowerCase();

  if (activeTab === 'enemies') {
    const cards = ENEMY_ENTRIES.filter((entry) => matchesQuery(query, entry.name, entry.description)).map((entry) =>
      enemyCard(entry, debugMode, onDebugSpawnEnemy),
    );
    listRoot.replaceChildren(...(cards.length > 0 ? cards : [emptyStateNode()]));
    return;
  }

  if (activeTab === 'items') {
    const cards = ITEM_ENTRIES.filter((entry) => matchesQuery(query, entry.name, entry.description)).map((entry) =>
      itemCard(entry, debugMode, onDebugGiveItem),
    );
    listRoot.replaceChildren(...(cards.length > 0 ? cards : [emptyStateNode()]));
    return;
  }

  if (activeTab === 'recipes') {
    const cards = RECIPE_ENTRIES.filter((entry) => matchesQuery(query, entry.name, entry.description)).map(recipeCard);
    listRoot.replaceChildren(...(cards.length > 0 ? cards : [emptyStateNode()]));
    return;
  }

  const spriteCards = spriteAtlasEntries()
    .filter((entry) => matchesQuery(query, entry.name, entry.group))
    .map(spriteAtlasCard);
  listRoot.replaceChildren(...(spriteCards.length > 0 ? spriteCards : [emptyStateNode()]));
};

const enemyCard = (entry: (typeof ENEMY_ENTRIES)[number], debugMode: boolean, onDebugSpawnEnemy: (enemy: EnemyKind) => void) => {
  const card = baseCard(entry.name, entry.description, spriteKeyForEnemy(entry.id as EnemyKind));
  card.append(
    detailGrid([
      ['HP', String(entry.stats.hp)],
      ['攻撃', String(entry.stats.attack)],
      ['防御', String(entry.stats.defense)],
      ['素早さ', String(entry.stats.speed)],
      ['攻撃属性', entry.attackElement],
      ['弱点', entry.weakness ?? 'なし'],
      ['耐性', entry.resistance ?? 'なし'],
      ['出現先', entry.biome],
      ['ドロップ', entry.drop],
    ]),
  );

  if (debugMode) {
    card.append(debugButton('この敵をスポーン', () => onDebugSpawnEnemy(entry.id as EnemyKind)));
  }

  return card;
};

const itemCard = (entry: (typeof ITEM_ENTRIES)[number], debugMode: boolean, onDebugGiveItem: (item: ItemKind) => void) => {
  const card = baseCard(entry.name, entry.description, spriteKeyForItem(entry.id as ItemKind));
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
  card.append(detailGrid(details));

  if (debugMode) {
    card.append(debugButton('このアイテムを入手', () => onDebugGiveItem(entry.id as ItemKind)));
  }

  return card;
};

const debugButton = (label: string, onClick: () => void) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'compendium-debug-button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
};

const recipeCard = (entry: (typeof RECIPE_ENTRIES)[number]) => {
  const card = baseCard(entry.name, entry.description, spriteKeyForItem(entry.resultItem));
  card.append(
    detailGrid([
      ['設備', entry.facility],
      ['素材', entry.ingredients.join(' / ')],
      ['完成品', entry.result],
      ['狙う行き先', entry.target],
    ]),
  );
  return card;
};

const spriteAtlasCard = (entry: SpriteAtlasEntry) => {
  const card = baseCard(entry.name, entry.group, entry.sprite);
  card.classList.add('compendium-sprite-card');
  card.append(
    detailGrid([
      ['分類', entry.group],
      ['ID', entry.id],
      ['スプライト', entry.sprite],
    ]),
  );
  return card;
};

const baseCard = (title: string, description: string, sprite?: SpriteKey) => {
  const card = document.createElement('article');
  card.className = sprite ? 'compendium-card compendium-card-with-sprite' : 'compendium-card';

  if (sprite) {
    card.append(spritePreview(sprite, title));
  }

  const content = document.createElement('div');
  content.className = 'compendium-card-content';

  const heading = document.createElement('h3');
  heading.textContent = title;

  const body = document.createElement('p');
  body.textContent = description;

  content.append(heading, body);
  card.append(content);
  return card;
};

const spritePreview = (sprite: SpriteKey, label: string) => {
  const canvas = document.createElement('canvas');
  const pixelSize = 5;
  const padding = 4;
  const spriteSize = pixelSize * 8;
  const size = spriteSize + padding * 2;
  const dpr = window.devicePixelRatio || 1;
  canvas.className = 'sprite-preview';
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  canvas.setAttribute('aria-label', `${label}のスプライト`);

  const context = canvas.getContext('2d');
  if (!context) {
    return canvas;
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.imageSmoothingEnabled = false;
  context.fillStyle = 'rgba(5, 10, 14, 0.84)';
  context.fillRect(0, 0, size, size);
  context.fillStyle = 'rgba(122, 146, 158, 0.24)';
  context.fillRect(0, 0, size, 1);
  context.fillRect(0, size - 1, size, 1);
  context.fillRect(0, 0, 1, size);
  context.fillRect(size - 1, 0, 1, size);
  renderSpriteIcon(context, sprite, padding, padding, spriteSize);

  return canvas;
};

const spriteAtlasEntries = (): SpriteAtlasEntry[] => {
  const entries: SpriteAtlasEntry[] = [
    { id: 'player', name: '探索者', group: '基本', sprite: 'player' },
    { id: 'stairs', name: '脱出口', group: '地形', sprite: 'stairs' },
    ...STATION_SPRITE_ENTRIES.map((entry) => ({
      id: entry.id,
      name: entry.name,
      group: '施設',
      sprite: spriteKeyForStation(entry.id),
    })),
    ...ENEMY_ENTRIES.map((entry) => ({
      id: entry.id,
      name: entry.name,
      group: '敵',
      sprite: spriteKeyForEnemy(entry.id as EnemyKind),
    })),
    ...ITEM_ENTRIES.map((entry) => ({
      id: entry.id,
      name: entry.name,
      group: entry.category,
      sprite: spriteKeyForItem(entry.id as ItemKind),
    })),
  ];
  const usedSprites = new Set(entries.map((entry) => entry.sprite));
  const fallbackEntries = (Object.keys(SPRITE_SHAPES) as SpriteKey[])
    .filter((sprite) => !usedSprites.has(sprite))
    .map((sprite) => ({
      id: sprite,
      name: `汎用 ${sprite}`,
      group: '汎用',
      sprite,
    }));
  return [...entries, ...fallbackEntries];
};

const detailGrid = (details: Array<[string, string]>) => {
  const grid = document.createElement('dl');
  grid.className = 'compendium-details';

  details.forEach(([label, value]) => {
    const term = document.createElement('dt');
    term.textContent = label;

    const detail = document.createElement('dd');
    detail.textContent = value;

    grid.append(term, detail);
  });

  return grid;
};
