import type { BiomeId, MapId } from '../engine/types';

export type MapDefinition = {
  id: MapId;
  name: string;
  tagline: string;
  biomes: BiomeId[];
};

export const MAP_DEFINITIONS: Record<MapId, MapDefinition> = {
  borderTunnels: {
    id: 'borderTunnels',
    name: '国境の坑道',
    tagline: '廃坑と菌糸の森が接する、比較的安全な入門エリア。',
    biomes: ['mine', 'forest'],
  },
  frontline: {
    id: 'frontline',
    name: '崩れた前線',
    tagline: '廃坑の奥に砦の残党が居座る、金属と武具が混在する中級エリア。',
    biomes: ['mine', 'fortress'],
  },
  blightWoods: {
    id: 'blightWoods',
    name: '黄昏の毒林',
    tagline: '旧研究区画の汚染が森まで広がった、回復素材とレア素材が両方出る危険地帯。',
    biomes: ['forest', 'lab'],
  },
  sealedVault: {
    id: 'sealedVault',
    name: '封鎖された深部要塞',
    tagline: '砦と旧研究区画が繋がった最深部。高価な戦利品と引き換えに最も危険。',
    biomes: ['fortress', 'lab'],
  },
};

export const MAP_IDS = Object.keys(MAP_DEFINITIONS) as MapId[];
