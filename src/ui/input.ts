import type { Command, GameSnapshot } from '../engine/types';

type BindInputOptions = {
  root: Document;
  canvas: HTMLCanvasElement;
  getSnapshot: () => GameSnapshot;
  onCommand: (command: Command) => void;
};

const KEY_COMMANDS = new Map<string, Command>([
  ['ArrowUp', { type: 'move', dx: 0, dy: -1 }],
  ['ArrowDown', { type: 'move', dx: 0, dy: 1 }],
  ['ArrowLeft', { type: 'move', dx: -1, dy: 0 }],
  ['ArrowRight', { type: 'move', dx: 1, dy: 0 }],
  ['Home', { type: 'move', dx: -1, dy: -1 }],
  ['PageUp', { type: 'move', dx: 1, dy: -1 }],
  ['End', { type: 'move', dx: -1, dy: 1 }],
  ['PageDown', { type: 'move', dx: 1, dy: 1 }],
  ['Numpad8', { type: 'move', dx: 0, dy: -1 }],
  ['Numpad2', { type: 'move', dx: 0, dy: 1 }],
  ['Numpad4', { type: 'move', dx: -1, dy: 0 }],
  ['Numpad6', { type: 'move', dx: 1, dy: 0 }],
  ['Numpad7', { type: 'move', dx: -1, dy: -1 }],
  ['Numpad9', { type: 'move', dx: 1, dy: -1 }],
  ['Numpad1', { type: 'move', dx: -1, dy: 1 }],
  ['Numpad3', { type: 'move', dx: 1, dy: 1 }],
  ['Numpad5', { type: 'wait' }],
  ['.', { type: 'wait' }],
  ['>', { type: 'descend' }],
  ['g', { type: 'pickup' }],
  ['p', { type: 'usePotion' }],
  ['r', { type: 'restart' }],
  ['?', { type: 'help' }],
  ['h', { type: 'move', dx: -1, dy: 0 }],
  ['j', { type: 'move', dx: 0, dy: 1 }],
  ['k', { type: 'move', dx: 0, dy: -1 }],
  ['l', { type: 'move', dx: 1, dy: 0 }],
  ['y', { type: 'move', dx: -1, dy: -1 }],
  ['u', { type: 'move', dx: 1, dy: -1 }],
  ['b', { type: 'move', dx: -1, dy: 1 }],
  ['n', { type: 'move', dx: 1, dy: 1 }],
]);

export const bindInput = ({ root, canvas, getSnapshot, onCommand }: BindInputOptions) => {
  root.addEventListener('keydown', (event) => {
    const command = KEY_COMMANDS.get(event.key) ?? KEY_COMMANDS.get(event.code);

    if (!command) {
      return;
    }

    event.preventDefault();
    onCommand(command);
  });

  root.querySelectorAll<HTMLElement>('[data-command]').forEach((button) => {
    button.addEventListener('click', () => {
      const command = button.dataset.command;
      if (command === 'wait' || command === 'pickup' || command === 'usePotion' || command === 'descend' || command === 'restart' || command === 'help') {
        onCommand({ type: command });
      }
    });
  });

  root.querySelectorAll<HTMLElement>('[data-move]').forEach((button) => {
    button.addEventListener('click', () => {
      const [dx, dy] = button.dataset.move?.split(',').map(Number) ?? [0, 0];
      onCommand({ type: 'move', dx, dy });
    });
  });

  canvas.addEventListener('click', (event) => {
    const snapshot = getSnapshot();
    const player = snapshot.entities.find((entity) => entity.id === snapshot.playerId);
    if (!player) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const cell = Math.floor(Math.min(rect.width / snapshot.width, rect.height / snapshot.height));
    const boardWidth = cell * snapshot.width;
    const boardHeight = cell * snapshot.height;
    const offsetX = (rect.width - boardWidth) / 2;
    const offsetY = (rect.height - boardHeight) / 2;
    const x = Math.floor((event.clientX - rect.left - offsetX) / cell);
    const y = Math.floor((event.clientY - rect.top - offsetY) / cell);

    if (x < 0 || y < 0 || x >= snapshot.width || y >= snapshot.height) {
      return;
    }

    const dx = Math.sign(x - player.x);
    const dy = Math.sign(y - player.y);
    if (dx !== 0 || dy !== 0) {
      onCommand({ type: 'move', dx, dy });
    }
  });
};
