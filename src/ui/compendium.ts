import { ENEMY_ENTRIES, ITEM_ENTRIES, RECIPE_ENTRIES } from '../game/compendium';

type CompendiumRoots = {
  tabsRoot: HTMLElement;
  listRoot: HTMLElement;
};

type CompendiumTab = 'enemies' | 'items' | 'recipes';

const TAB_LABELS: Record<CompendiumTab, string> = {
  enemies: '敵',
  items: 'アイテム',
  recipes: 'レシピ',
};

let activeTab: CompendiumTab = 'enemies';

export const updateCompendium = ({ tabsRoot, listRoot }: CompendiumRoots) => {
  tabsRoot.replaceChildren(
    ...Object.entries(TAB_LABELS).map(([tab, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = tab === activeTab ? 'is-active' : '';
      button.textContent = label;
      button.addEventListener('click', () => {
        activeTab = tab as CompendiumTab;
        updateCompendium({ tabsRoot, listRoot });
      });
      return button;
    }),
  );

  if (activeTab === 'enemies') {
    listRoot.replaceChildren(...ENEMY_ENTRIES.map(enemyCard));
    return;
  }

  if (activeTab === 'items') {
    listRoot.replaceChildren(...ITEM_ENTRIES.map(itemCard));
    return;
  }

  listRoot.replaceChildren(...RECIPE_ENTRIES.map(recipeCard));
};

const enemyCard = (entry: (typeof ENEMY_ENTRIES)[number]) => {
  const card = baseCard(entry.name, entry.description);
  card.append(
    detailGrid([
      ['HP', String(entry.stats.hp)],
      ['攻撃', String(entry.stats.attack)],
      ['防御', String(entry.stats.defense)],
      ['素早さ', String(entry.stats.speed)],
      ['ドロップ', entry.drop],
    ]),
  );
  return card;
};

const itemCard = (entry: (typeof ITEM_ENTRIES)[number]) => {
  const card = baseCard(entry.name, entry.description);
  card.append(
    detailGrid([
      ['分類', entry.category],
      ['サイズ', String(entry.size)],
      ['売値', `${entry.value}G`],
    ]),
  );
  return card;
};

const recipeCard = (entry: (typeof RECIPE_ENTRIES)[number]) => {
  const card = baseCard(entry.name, entry.description);
  card.append(
    detailGrid([
      ['設備', entry.facility],
      ['素材', entry.ingredients.join(' / ')],
      ['完成品', entry.result],
    ]),
  );
  return card;
};

const baseCard = (title: string, description: string) => {
  const card = document.createElement('article');
  card.className = 'compendium-card';

  const heading = document.createElement('h3');
  heading.textContent = title;

  const body = document.createElement('p');
  body.textContent = description;

  card.append(heading, body);
  return card;
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
