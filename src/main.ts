import './styles.css';
import { Game } from './game/game';
import { CanvasRenderer } from './ui/canvas-renderer';
import { updateCompendium } from './ui/compendium';
import { bindInput } from './ui/input';
import { updateHud } from './ui/hud';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const statusRoot = document.querySelector<HTMLElement>('#status');
const handSlotRoot = document.querySelector<HTMLElement>('#hand-slot');
const inventoryRoot = document.querySelector<HTMLElement>('#inventory');
const itemListRoot = document.querySelector<HTMLElement>('#item-list');
const logRoot = document.querySelector<HTMLOListElement>('#message-log');
const actionHintRoot = document.querySelector<HTMLElement>('#action-hint');
const previousHandButton = document.querySelector<HTMLButtonElement>('[data-command="previousHandItem"]');
const nextHandButton = document.querySelector<HTMLButtonElement>('[data-command="nextHandItem"]');
const pickupButton = document.querySelector<HTMLButtonElement>('[data-command="pickup"]');
const interactButton = document.querySelector<HTMLButtonElement>('[data-command="interact"]');
const compendiumButton = document.querySelector<HTMLButtonElement>('#compendium-button');
const compendiumDialog = document.querySelector<HTMLDialogElement>('#compendium-dialog');
const compendiumTabsRoot = document.querySelector<HTMLElement>('#compendium-tabs');
const compendiumListRoot = document.querySelector<HTMLElement>('#compendium-list');
const helpDialog = document.querySelector<HTMLDialogElement>('#help-dialog');
const itemDialog = document.querySelector<HTMLDialogElement>('#item-dialog');

if (
  !canvas ||
  !statusRoot ||
  !handSlotRoot ||
  !inventoryRoot ||
  !itemListRoot ||
  !logRoot ||
  !actionHintRoot ||
  !previousHandButton ||
  !nextHandButton ||
  !pickupButton ||
  !interactButton ||
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
    handSlotRoot,
    inventoryRoot,
    itemListRoot,
    logRoot,
    actionHintRoot,
    previousHandButton,
    nextHandButton,
    pickupButton,
    interactButton,
    onUseItem: (item) => {
      game.dispatch({ type: 'useItem', item });
      itemDialog.close();
      refresh();
    },
  });
};

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
