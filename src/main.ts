import './styles.css';
import { Game } from './game/game';
import { CanvasRenderer } from './ui/canvas-renderer';
import type { EnemyKind, GameSnapshot, ItemKind, MapId, StationKind } from './engine/types';
import { ENEMY_DEFINITIONS } from './game/enemies';
import { updateCompendium } from './ui/compendium';
import { bindInput } from './ui/input';
import { updateCraftDialog, updateHud, updateRaidDialog, updateShopDialog, updateStashDialog, updateTopbarMoney, setInventoryInspectHandler } from './ui/hud';
import { showItemInfo } from './ui/item-info';

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
const topbarMoneyBlock = document.querySelector<HTMLElement>('#topbar-money-block');
const topbarMoneyRoot = document.querySelector<HTMLElement>('#topbar-money');
const raidDialogButton = document.querySelector<HTMLButtonElement>('#raid-dialog-button');
const raidDialog = document.querySelector<HTMLDialogElement>('#raid-dialog');
const raidBiomeRoot = document.querySelector<HTMLElement>('#raid-biomes');
const stashDialog = document.querySelector<HTMLDialogElement>('#stash-dialog');
const stashDialogBody = document.querySelector<HTMLElement>('#stash-dialog-body');
const craftDialog = document.querySelector<HTMLDialogElement>('#craft-dialog');
const craftRecipeRoot = document.querySelector<HTMLElement>('#craft-recipes');
const shopDialog = document.querySelector<HTMLDialogElement>('#shop-dialog');
const shopItemsRoot = document.querySelector<HTMLElement>('#shop-items');
const compendiumButton = document.querySelector<HTMLButtonElement>('#compendium-button');
const compendiumDialog = document.querySelector<HTMLDialogElement>('#compendium-dialog');
const compendiumTabsRoot = document.querySelector<HTMLElement>('#compendium-tabs');
const compendiumListRoot = document.querySelector<HTMLElement>('#compendium-list');
const compendiumSearchRoot = document.querySelector<HTMLInputElement>('#compendium-search');
const debugModeButton = document.querySelector<HTMLButtonElement>('#debug-mode-button');
const debugSpawnBanner = document.querySelector<HTMLElement>('#debug-spawn-banner');
const debugSpawnBannerText = document.querySelector<HTMLElement>('#debug-spawn-banner-text');
const debugSpawnCancelButton = document.querySelector<HTMLButtonElement>('#debug-spawn-cancel-button');
const helpDialog = document.querySelector<HTMLDialogElement>('#help-dialog');
const restartConfirmDialog = document.querySelector<HTMLDialogElement>('#restart-confirm-dialog');
const restartCancelButton = document.querySelector<HTMLButtonElement>('#restart-cancel-button');
const restartConfirmButton = document.querySelector<HTMLButtonElement>('#restart-confirm-button');
const itemDialog = document.querySelector<HTMLDialogElement>('#item-dialog');
const itemInfoDialog = document.querySelector<HTMLDialogElement>('#item-info-dialog');
const itemInfoGlyphRoot = document.querySelector<HTMLElement>('#item-info-glyph');
const itemInfoTitleRoot = document.querySelector<HTMLElement>('#item-info-title');
const itemInfoBodyRoot = document.querySelector<HTMLElement>('#item-info-body');
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
  !topbarMoneyBlock ||
  !topbarMoneyRoot ||
  !raidDialogButton ||
  !raidDialog ||
  !raidBiomeRoot ||
  !stashDialog ||
  !stashDialogBody ||
  !craftDialog ||
  !craftRecipeRoot ||
  !shopDialog ||
  !shopItemsRoot ||
  !compendiumButton ||
  !compendiumDialog ||
  !compendiumTabsRoot ||
  !compendiumListRoot ||
  !compendiumSearchRoot ||
  !debugModeButton ||
  !debugSpawnBanner ||
  !debugSpawnBannerText ||
  !debugSpawnCancelButton ||
  !helpDialog ||
  !restartConfirmDialog ||
  !restartCancelButton ||
  !restartConfirmButton ||
  !itemDialog ||
  !itemInfoDialog ||
  !itemInfoGlyphRoot ||
  !itemInfoTitleRoot ||
  !itemInfoBodyRoot
) {
  throw new Error('Missing app root elements.');
}

const game = new Game();
const renderer = new CanvasRenderer(canvas);

let pendingSpawnEnemy: EnemyKind | null = null;

const updateDebugSpawnBanner = () => {
  if (pendingSpawnEnemy) {
    debugSpawnBannerText.textContent = `${ENEMY_DEFINITIONS[pendingSpawnEnemy].name}を配置する場所をクリックしてください。`;
    debugSpawnBanner.hidden = false;
  } else {
    debugSpawnBanner.hidden = true;
  }
};

const cancelDebugSpawn = () => {
  pendingSpawnEnemy = null;
  updateDebugSpawnBanner();
};

const armDebugSpawn = (enemy: EnemyKind) => {
  pendingSpawnEnemy = enemy;
  compendiumDialog.close();
  updateDebugSpawnBanner();
};

const giveDebugItem = (item: ItemKind) => {
  game.dispatch({ type: 'debugGiveItem', item });
  refresh();
};

const renderCompendium = (snapshot: GameSnapshot) => {
  updateCompendium({
    tabsRoot: compendiumTabsRoot,
    listRoot: compendiumListRoot,
    searchRoot: compendiumSearchRoot,
    debugMode: snapshot.debugMode,
    onDebugSpawnEnemy: armDebugSpawn,
    onDebugGiveItem: giveDebugItem,
  });
};

compendiumSearchRoot.addEventListener('input', () => {
  renderCompendium(game.snapshot());
});

compendiumSearchRoot.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
  }
});

const startRaid = (mapId: MapId, mapRollId?: string) => {
  raidDialog.close();
  game.dispatch({ type: 'startRaid', mapId, mapRollId });
  refresh();
};

const refresh = () => {
  const snapshot = game.snapshot();
  document.body.classList.toggle('is-base', snapshot.mode === 'base');
  document.body.classList.toggle('is-dead', snapshot.gameOver);
  topbarMoneyBlock.hidden = snapshot.mode !== 'base';
  raidDialogButton.hidden = snapshot.mode !== 'base';
  if (snapshot.mode !== 'base') {
    raidDialog.close();
    stashDialog.close();
    craftDialog.close();
    shopDialog.close();
  }
  updateTopbarMoney(snapshot, topbarMoneyRoot);
  debugModeButton.classList.toggle('is-active', snapshot.debugMode);
  if (!snapshot.debugMode && pendingSpawnEnemy) {
    cancelDebugSpawn();
  }
  if (compendiumDialog.open) {
    renderCompendium(snapshot);
  }
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
  updateRaidDialog(snapshot, {
    biomeRoot: raidBiomeRoot,
    onStartRaid: startRaid,
  });
  updateStashDialog(snapshot, {
    bodyRoot: stashDialogBody,
    onMoveItem: (item, from, to, x, y) => {
      game.dispatch({ type: 'moveItem', item, from, to, x, y });
      refresh();
    },
    onPlaceItem: (item, location, x, y) => {
      game.dispatch({ type: 'placeItem', item, location, x, y });
      refresh();
    },
  });
  updateCraftDialog(snapshot, {
    recipeRoot: craftRecipeRoot,
    onCraftRecipe: (recipe) => {
      game.dispatch({ type: 'craftItem', recipe });
      refresh();
    },
    onUnlockRecipe: (recipe) => {
      game.dispatch({ type: 'unlockRecipe', recipe });
      refresh();
    },
  });
  updateShopDialog(snapshot, {
    shopRoot: shopItemsRoot,
    onBuyItem: (item) => {
      game.dispatch({ type: 'buyItem', item });
      refresh();
    },
  });
};

const STATION_DIALOGS: Partial<Record<StationKind, HTMLDialogElement>> = {
  raidGate: raidDialog,
  stash: stashDialog,
  craft: craftDialog,
  shop: shopDialog,
};

const openStationDialog = (station: StationKind): boolean => {
  if (station === 'compendium') {
    renderCompendium(game.snapshot());
    compendiumDialog.showModal();
    return true;
  }

  const dialog = STATION_DIALOGS[station];
  if (!dialog) {
    return false;
  }

  dialog.showModal();
  return true;
};

raidDialogButton.addEventListener('click', () => {
  openStationDialog('raidGate');
});

compendiumButton.addEventListener('click', () => {
  renderCompendium(game.snapshot());
  compendiumDialog.showModal();
});

debugModeButton.addEventListener('click', () => {
  game.dispatch({ type: 'toggleDebugMode' });
  refresh();
});

debugSpawnCancelButton.addEventListener('click', cancelDebugSpawn);

restartCancelButton.addEventListener('click', () => {
  restartConfirmDialog.close();
});

restartConfirmButton.addEventListener('click', () => {
  restartConfirmDialog.close();
  game.dispatch({ type: 'restart' });
  refresh();
});

setInventoryInspectHandler((item, _location, mapRollId) => {
  const mapRoll = mapRollId ? game.snapshot().mapRolls[item]?.find((roll) => roll.id === mapRollId) : undefined;
  showItemInfo(
    item,
    {
      dialog: itemInfoDialog,
      glyphRoot: itemInfoGlyphRoot,
      titleRoot: itemInfoTitleRoot,
      bodyRoot: itemInfoBodyRoot,
    },
    mapRoll,
  );
});

bindInput({
  root: document,
  canvas,
  getSnapshot: () => game.snapshot(),
  getPendingDebugSpawn: () => pendingSpawnEnemy,
  onDebugSpawnAt: (enemy, x, y) => {
    pendingSpawnEnemy = null;
    updateDebugSpawnBanner();
    game.dispatch({ type: 'debugSpawnEnemy', enemy, x, y });
    refresh();
  },
  onCommand: (command) => {
    if (command.type === 'help') {
      helpDialog.showModal();
      return;
    }

    if (command.type === 'restart') {
      restartConfirmDialog.showModal();
      return;
    }

    if (command.type === 'item') {
      refresh();
      itemDialog.showModal();
      return;
    }

    if (command.type === 'interact') {
      const snapshot = game.snapshot();
      if (snapshot.mode === 'base' && snapshot.nearbyStation && openStationDialog(snapshot.nearbyStation)) {
        return;
      }
    }

    game.dispatch(command);
    refresh();
  },
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && pendingSpawnEnemy) {
    cancelDebugSpawn();
  }
});

window.addEventListener('resize', refresh);
refresh();
