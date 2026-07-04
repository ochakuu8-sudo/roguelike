import type { Point } from './types';

export const keyAt = (x: number, y: number) => `${x},${y}`;

export const indexAt = (x: number, y: number, width: number) => y * width + x;

export const isSamePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const chebyshev = (a: Point, b: Point) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
