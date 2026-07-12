import './styles.css';
import { Game } from './game/game';
import { CanvasRenderer } from './ui/canvas-renderer';
import type { Command, Entity, GameSnapshot, MapId } from './engine/types';
import { updateCompendium } from './ui/compendium';
import { bindInput } from './ui/input';
import { updateBasePlanning, updateHud } from './ui/hud';
import { requestPersistentStorage, saveGame } from './game/save';

const AUTOSAVE_DEBOUNCE_MS = 250;

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
const heldActionButton = document.querySelector<HTMLButtonElement>('[data-command="useHeldItem"]');
const returnToBaseButton = document.querySelector<HTMLButtonElement>('#return-to-base-button');
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
  !heldActionButton ||
  !returnToBaseButton ||
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

requestPersistentStorage();

const game = new Game();
const renderer = new CanvasRenderer(canvas);

let autosaveTimeout: number | undefined;

const flushAutosave = () => {
  if (autosaveTimeout !== undefined) {
    window.clearTimeout(autosaveTimeout);
    autosaveTimeout = undefined;
  }
  saveGame(game.serialize());
};

const scheduleAutosave = () => {
  if (autosaveTimeout !== undefined) {
    window.clearTimeout(autosaveTimeout);
  }
  autosaveTimeout = window.setTimeout(flushAutosave, AUTOSAVE_DEBOUNCE_MS);
};

window.addEventListener('beforeunload', flushAutosave);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    flushAutosave();
  }
});

const playerEntity = (snapshot: GameSnapshot) => snapshot.entities.find((entity) => entity.id === snapshot.playerId);

const stationInFront = (snapshot: GameSnapshot, player: Entity) =>
  snapshot.entities.find(
    (entity) =>
      entity.kind === 'station' &&
      entity.x === player.x + snapshot.player.facing.x &&
      entity.y === player.y + snapshot.player.facing.y,
  );

const shouldOpenBasePlanningFromGate = (command: Command) => {
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

const openBasePlanning = () => {
  document.body.classList.add('show-base-planning');
  refresh();
};

const startRaid = (mapId: MapId) => {
  document.body.classList.remove('show-base-planning');
  game.dispatch({ type: 'startRaid', mapId });
  refresh();
};

const refresh = () => {
  const snapshot = game.snapshot();
  document.body.classList.toggle('is-base', snapshot.mode === 'base');
  document.body.classList.toggle('is-dead', snapshot.gameOver);
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
    heldActionButton,
    returnToBaseButton,
    onMoveItem: (item, from, to, x, y) => {
      game.dispatch({ type: 'moveItem', item, from, to, x, y });
      refresh();
    },
    onPlaceItem: (item, location, x, y) => {
      game.dispatch({ type: 'placeItem', item, location, x, y });
      refresh();
    },
  });
  updateBasePlanning(snapshot, {
    biomeRoot: baseBiomeRoot,
    stashRoot: baseStashRoot,
    recipeRoot: baseRecipeRoot,
    moneyRoot: baseMoneyRoot,
    onStartRaid: startRaid,
    onAppraiseCollection: () => {
      game.dispatch({ type: 'appraiseCollection' });
      refresh();
    },
    onCraftRecipe: (recipe) => {
      game.dispatch({ type: 'craftItem', recipe });
      refresh();
    },
    onMoveItem: (item, from, to, x, y) => {
      game.dispatch({ type: 'moveItem', item, from, to, x, y });
      refresh();
    },
    onPlaceItem: (item, location, x, y) => {
      game.dispatch({ type: 'placeItem', item, location, x, y });
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
  scheduleAutosave();
};

const hasProgressWorthKeeping = (snapshot: GameSnapshot) =>
  snapshot.mode !== 'base' ||
  snapshot.money > 0 ||
  Object.values(snapshot.stash).some((count) => count > 0);

basePlanningButton.textContent = '出撃';
basePlanningButton.addEventListener('click', openBasePlanning);

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

    if (command.type === 'restart' && hasProgressWorthKeeping(game.snapshot())) {
      if (!window.confirm('セーブデータを削除して最初からやり直しますか？')) {
        return;
      }
    }

    if (shouldOpenBasePlanningFromGate(command)) {
      openBasePlanning();
      return;
    }

    game.dispatch(command);
    refresh();
  },
});

window.addEventListener('resize', refresh);
refresh();
