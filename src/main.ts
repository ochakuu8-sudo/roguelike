import './styles.css';
import { Game } from './game/game';
import { CanvasRenderer } from './ui/canvas-renderer';
import { bindInput } from './ui/input';
import { updateHud } from './ui/hud';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const statusRoot = document.querySelector<HTMLElement>('#status');
const inventoryRoot = document.querySelector<HTMLElement>('#inventory');
const logRoot = document.querySelector<HTMLOListElement>('#message-log');
const helpDialog = document.querySelector<HTMLDialogElement>('#help-dialog');

if (!canvas || !statusRoot || !inventoryRoot || !logRoot || !helpDialog) {
  throw new Error('Missing app root elements.');
}

const game = new Game();
const renderer = new CanvasRenderer(canvas);

const refresh = () => {
  renderer.render(game.snapshot());
  updateHud(game.snapshot(), { statusRoot, inventoryRoot, logRoot });
};

bindInput({
  root: document,
  canvas,
  getSnapshot: () => game.snapshot(),
  onCommand: (command) => {
    if (command.type === 'help') {
      helpDialog.showModal();
      return;
    }

    game.dispatch(command);
    refresh();
  },
});

window.addEventListener('resize', refresh);
refresh();
