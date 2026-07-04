import './styles.css';
import { Game } from './game/game';
import { CanvasRenderer } from './ui/canvas-renderer';
import { updateCompendium } from './ui/compendium';
import { bindInput } from './ui/input';
import { updateBaseHud, updateHud } from './ui/hud';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const statusRoot = document.querySelector<HTMLElement>('#status');
const inventoryRoot = document.querySelector<HTMLElement>('#inventory');
const itemListRoot = document.querySelector<HTMLElement>('#item-list');
const logRoot = document.querySelector<HTMLOListElement>('#message-log');
const moneyRoot = document.querySelector<HTMLElement>('#money');
const stashRoot = document.querySelector<HTMLElement>('#stash-list');
const craftRoot = document.querySelector<HTMLElement>('#craft-list');
const baseLogRoot = document.querySelector<HTMLOListElement>('#base-log');
const startRaidButton = document.querySelector<HTMLButtonElement>('#start-raid-button');
const compendiumButton = document.querySelector<HTMLButtonElement>('#compendium-button');
const compendiumDialog = document.querySelector<HTMLDialogElement>('#compendium-dialog');
const compendiumTabsRoot = document.querySelector<HTMLElement>('#compendium-tabs');
const compendiumListRoot = document.querySelector<HTMLElement>('#compendium-list');
const helpDialog = document.querySelector<HTMLDialogElement>('#help-dialog');
const itemDialog = document.querySelector<HTMLDialogElement>('#item-dialog');

if (
  !canvas ||
  !statusRoot ||
  !inventoryRoot ||
  !itemListRoot ||
  !logRoot ||
  !moneyRoot ||
  !stashRoot ||
  !craftRoot ||
  !baseLogRoot ||
  !startRaidButton ||
  !compendiumButton ||
  !compendiumDialog ||
  !compendiumTabsRoot ||
  !compendiumListRoot ||
  !helpDialog ||
  !itemDialog
) {
  throw new Error('Missing app root elements.');
}

const game = new Game();
const renderer = new CanvasRenderer(canvas);

const refresh = () => {
  const snapshot = game.snapshot();
  document.body.classList.toggle('is-base', snapshot.mode === 'base');
  renderer.render(snapshot);
  updateHud(snapshot, {
    statusRoot,
    inventoryRoot,
    itemListRoot,
    logRoot,
    onUseItem: (item) => {
      game.dispatch({ type: 'useItem', item });
      itemDialog.close();
      refresh();
    },
  });
  updateBaseHud(snapshot, {
    moneyRoot,
    stashRoot,
    craftRoot,
    baseLogRoot,
    onSellItem: (item) => {
      game.dispatch({ type: 'sellItem', item });
      refresh();
    },
    onCraftItem: (recipe) => {
      game.dispatch({ type: 'craftItem', recipe });
      refresh();
    },
  });
};

startRaidButton.addEventListener('click', () => {
  game.dispatch({ type: 'startRaid' });
  refresh();
});

compendiumButton.addEventListener('click', () => {
  updateCompendium({ tabsRoot: compendiumTabsRoot, listRoot: compendiumListRoot });
  compendiumDialog.showModal();
});

bindInput({
  root: document,
  canvas,
  getSnapshot: () => game.snapshot(),
  onCommand: (command) => {
    if (command.type === 'help') {
      helpDialog.showModal();
      return;
    }

    if (command.type === 'item') {
      refresh();
      itemDialog.showModal();
      return;
    }

    game.dispatch(command);
    refresh();
  },
});

window.addEventListener('resize', refresh);
refresh();
