import type { Command, EnemyKind, GameSnapshot } from '../engine/types';
import { screenToTile } from './canvas-renderer';

type BindInputOptions = {
  root: Document;
  canvas: HTMLCanvasElement;
  getSnapshot: () => GameSnapshot;
  onCommand: (command: Command) => void;
  getPendingDebugSpawn?: () => EnemyKind | null;
  onDebugSpawnAt?: (enemy: EnemyKind, x: number, y: number) => void;
};

const KEY_COMMANDS = new Map<string, Command>([
  ['ArrowUp', { type: 'face', dx: 0, dy: -1 }],
  ['ArrowDown', { type: 'face', dx: 0, dy: 1 }],
  ['ArrowLeft', { type: 'face', dx: -1, dy: 0 }],
  ['ArrowRight', { type: 'face', dx: 1, dy: 0 }],
  ['Home', { type: 'face', dx: -1, dy: -1 }],
  ['PageUp', { type: 'face', dx: 1, dy: -1 }],
  ['End', { type: 'face', dx: -1, dy: 1 }],
  ['PageDown', { type: 'face', dx: 1, dy: 1 }],
  ['Numpad8', { type: 'face', dx: 0, dy: -1 }],
  ['Numpad2', { type: 'face', dx: 0, dy: 1 }],
  ['Numpad4', { type: 'face', dx: -1, dy: 0 }],
  ['Numpad6', { type: 'face', dx: 1, dy: 0 }],
  ['Numpad7', { type: 'face', dx: -1, dy: -1 }],
  ['Numpad9', { type: 'face', dx: 1, dy: -1 }],
  ['Numpad1', { type: 'face', dx: -1, dy: 1 }],
  ['Numpad3', { type: 'face', dx: 1, dy: 1 }],
  ['Numpad5', { type: 'wait' }],
  ['Enter', { type: 'forward' }],
  [' ', { type: 'forward' }],
  ['z', { type: 'useHeldItem' }],
  ['Z', { type: 'useHeldItem' }],
  ['e', { type: 'interact' }],
  ['E', { type: 'interact' }],
  ['.', { type: 'wait' }],
  ['>', { type: 'descend' }],
  ['g', { type: 'pickup' }],
  ['i', { type: 'item' }],
  ['[', { type: 'previousHandItem' }],
  [']', { type: 'nextHandItem' }],
  ['r', { type: 'restart' }],
  ['?', { type: 'help' }],
  ['`', { type: 'toggleDebugMode' }],
  ['h', { type: 'face', dx: -1, dy: 0 }],
  ['j', { type: 'face', dx: 0, dy: 1 }],
  ['k', { type: 'face', dx: 0, dy: -1 }],
  ['l', { type: 'face', dx: 1, dy: 0 }],
  ['y', { type: 'face', dx: -1, dy: -1 }],
  ['u', { type: 'face', dx: 1, dy: -1 }],
  ['b', { type: 'face', dx: -1, dy: 1 }],
  ['n', { type: 'face', dx: 1, dy: 1 }],
]);

export const bindInput = ({ root, canvas, getSnapshot, onCommand, getPendingDebugSpawn, onDebugSpawnAt }: BindInputOptions) => {
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
      if (
        command === 'wait' ||
        command === 'pickup' ||
        command === 'interact' ||
        command === 'forward' ||
        command === 'item' ||
        command === 'useHeldItem' ||
        command === 'previousHandItem' ||
        command === 'nextHandItem' ||
        command === 'descend' ||
        command === 'restart' ||
        command === 'acknowledgeDeath' ||
        command === 'help'
      ) {
        onCommand({ type: command });
      }
    });
  });

  root.querySelectorAll<HTMLElement>('[data-face]').forEach((button) => {
    button.addEventListener('click', () => {
      const [dx, dy] = button.dataset.face?.split(',').map(Number) ?? [0, 0];
      onCommand({ type: 'face', dx, dy });
    });
  });

  canvas.addEventListener('click', (event) => {
    const snapshot = getSnapshot();
    const tile = screenToTile(canvas, snapshot, event.clientX, event.clientY);
    if (!tile) {
      return;
    }

    const { x, y } = tile;

    const pendingSpawn = getPendingDebugSpawn?.();
    if (pendingSpawn) {
      onDebugSpawnAt?.(pendingSpawn, x, y);
      return;
    }

    const player = snapshot.entities.find((entity) => entity.id === snapshot.playerId);
    if (!player) {
      return;
    }

    const dx = Math.sign(x - player.x);
    const dy = Math.sign(y - player.y);
    if (dx !== 0 || dy !== 0) {
      onCommand({ type: 'face', dx, dy });
    }
  });
};
