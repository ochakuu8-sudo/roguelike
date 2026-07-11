import type { Point } from './types';

export const indexAt = (x: number, y: number, width: number) => y * width + x;

export const chebyshev = (a: Point, b: Point) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
