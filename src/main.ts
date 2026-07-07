import './styles.css';
import { Game } from './game/game';
import { CanvasRenderer } from './ui/canvas-renderer';
import type { Command, Entity, GameSnapshot } from './engine/types';
import { updateCompendium } from './ui/compendium';
import { bindInput } from './ui/input';
import { updateBasePlanning, updateHud } from './ui/hud';

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
const attackButton = document.querySelector<HTMLButtonElement>('[data-command="attack"]');
const heldActionButton = document.querySelector<HTMLButtonElement>('[data-command="useHeldItem"]');
const basePlanningButton = document.querySelector<HTMLButtonElement>('#base-planning-button');
const basePlanningCloseButton = document.querySelector<HTMLButtonElement>('#base-planning-close');
const compendiumButton = document.querySelector<HTMLButtonElement>('#compendium-button');
const compendiumDialog = document.querySelector<HTMLDialogElement>('#compendium-dialog');
const compendiumTabsRoot = document.querySelector<HTMLElement>('#compendium-tabs');
const compendiumListRoot = document.querySelector<HTMLElement>('#compendium-list');
const helpDialog = document.querySelector<HTMLDialogElement>('#help-dialog');
const itemDialog = document.querySelector<HTMLDialogElement>('#item-dialog');
const baseBiomeRoot = document.querySelector<HTMLElement>('#base-biomes');
const baseStashRoot = document.querySelector<HTMLElement>('#base-stash');
const baseRecipeRoot = document.querySelector<HTMLElement>('#base-recipes');
const baseMoneyRoot = document.querySelector<HTMLElement>('#base-money');
const baseLogRoot = document.querySelector<HTMLOListElement>('#base-message-log');

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
  !attackButton ||
  !heldActionButton ||
  !basePlanningButton ||
  !basePlanningCloseButton ||
  !compendiumButton ||
  !compendiumDialog ||
  !compendiumTabsRoot ||
  !compendiumListRoot ||
  !helpDialog ||
  !itemDialog ||
  !baseBiomeRoot ||
  !baseStashRoot ||
  !baseRecipeRoot ||
  !baseMoneyRoot ||
  !baseLogRoot
) {
  throw new Error('Missing app root elements.');
}

const game = new Game();
const renderer = new CanvasRenderer(canvas);

const playerEntity = (snapshot: GameSnapshot) => snapshot.entities.find((entity) => entity.id === snapshot.playerId);

const stationInFront = (snapshot: GameSnapshot, player: Entity) =>
  snapshot.entities.find(
    (entity) =>
      entity.kind === 'station' &&
      entity.x === player.x + snapshot.player.facing.x &&
      entity.y === player.y + snapshot.player.facing.y,
  );

const shouldStartRaidFromGate = (command: Command) => {
  if (command.type !== 'interact') {
    return false;
  }

  const snapshot = game.snapshot();
  const player = playerEntity(snapshot);
  if (snapshot.mode !== 'base' || !player) {
    return false;
  }

  return stationInFront(snapshot, player)?.station === 'raidGate';
};

const startRaid = () => {
  document.body.classList.remove('show-base-planning');
  game.dispatch({ type: 'startRaid' });
  refresh();
};

const refresh = () => {
  const snapshot = game.snapshot();
  document.body.classList.toggle('is-base', snapshot.mode === 'base');
  if (snapshot.mode !== 'base') {
    document.body.classList.remove('show-base-planning');
  }
  basePlanningButton.hidden = snapshot.mode !== 'base';
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
    attackButton,
    heldActionButton,
    onMoveItem: (item, from, to) => {
      game.dispatch({ type: 'moveItem', item, from, to });
      refresh();
    },
  });
  updateBasePlanning(snapshot, {
    biomeRoot: baseBiomeRoot,
    stashRoot: baseStashRoot,
    recipeRoot: baseRecipeRoot,
    moneyRoot: baseMoneyRoot,
    onStartRaid: startRaid,
    onCraftRecipe: (recipe) => {
      game.dispatch({ type: 'craftItem', recipe });
      refresh();
    },
  });
  baseLogRoot.replaceChildren(
    ...snapshot.messages.map((message) => {
      const item = document.createElement('li');
      item.textContent = message;
      return item;
    }),
  );
  baseLogRoot.scrollTop = baseLogRoot.scrollHeight;
};

window.addEventListener('roguelike-sprite-atlas-ready', () => {
  refresh();
  if (compendiumDialog.open) {
    updateCompendium({ tabsRoot: compendiumTabsRoot, listRoot: compendiumListRoot });
  }
});

basePlanningButton.textContent = '出撃';
basePlanningButton.addEventListener('click', startRaid);

basePlanningCloseButton.addEventListener('click', () => {
  document.body.classList.remove('show-base-planning');
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

    if (shouldStartRaidFromGate(command)) {
      startRaid();
      return;
    }

    game.dispatch(command);
    refresh();
  },
});

window.addEventListener('resize', refresh);
refresh();
