import type { BiomeId, EnemyKind, ItemKind, TileKind } from '../engine/types';

export type BiomeDefinition = {
  id: BiomeId;
  name: string;
  danger: number;
  purpose: string;
  terrain: string;
  landmark: string;
  color: string;
  floorColor: string;
  wallColor: string;
  specialTile: TileKind;
  specialTileLabel: string;
  materials: ItemKind[];
  commonMaterials: ItemKind[];
  enemies: EnemyKind[];
};

export const BIOME_DEFINITIONS: Record<BiomeId, BiomeDefinition> = {
  mine: {
    id: 'mine',
    name: '廃坑',
    danger: 1,
    purpose: '金属、道具強化、爆薬素材',
    terrain: '狭い通路、鉱脈、崩落壁',
    landmark: '鉱脈 / 機械残骸',
    color: '#93c5fd',
    floorColor: '#12181b',
    wallColor: '#26333a',
    specialTile: 'ore',
    specialTileLabel: '鉱脈',
    materials: ['ironOre', 'copperOre', 'sulfur', 'oldGear', 'hardShell'],
    commonMaterials: ['ironOre', 'copperOre', 'sulfur', 'wood', 'oldCoin', 'mapFragment'],
    enemies: ['caveImp', 'oreBeetle', 'tunnelGnoll'],
  },
  forest: {
    id: 'forest',
    name: '菌糸の森',
    danger: 1,
    purpose: '回復、解毒、補助アイテム',
    terrain: '視界が悪い広場、胞子溜まり、水場',
    landmark: '薬草群 / 胞子溜まり',
    color: '#86efac',
    floorColor: '#101b16',
    wallColor: '#203429',
    specialTile: 'forage',
    specialTileLabel: '採取群',
    materials: ['herb', 'blueMushroom', 'poisonSpore', 'cleanWater', 'slimeGel'],
    commonMaterials: ['herb', 'blueMushroom', 'poisonSpore', 'cleanWater', 'wood', 'mapFragment'],
    enemies: ['sporeBat', 'slime', 'herbEater'],
  },
  fortress: {
    id: 'fortress',
    name: '崩れた砦',
    danger: 2,
    purpose: '武器、防具、換金品',
    terrain: '部屋が多い、鍵付き倉庫、巡回敵',
    landmark: '木箱 / 鍵付き倉庫',
    color: '#fbbf24',
    floorColor: '#1d1812',
    wallColor: '#3a2f24',
    specialTile: 'crate',
    specialTileLabel: '木箱',
    materials: ['boneShard', 'sturdyLeather', 'tornCloth', 'brokenBlade', 'crestFragment'],
    commonMaterials: ['boneShard', 'sturdyLeather', 'tornCloth', 'wood', 'oldCoin', 'keyBundle'],
    enemies: ['boneSentinel', 'fortRaider', 'crestKnight'],
  },
  lab: {
    id: 'lab',
    name: '旧研究区画',
    danger: 3,
    purpose: '上位クラフト、特殊素材',
    terrain: '小部屋、封鎖扉、危険装置',
    landmark: '研究棚 / 端末',
    color: '#c4b5fd',
    floorColor: '#121622',
    wallColor: '#25243a',
    specialTile: 'device',
    specialTileLabel: '研究棚',
    materials: ['glassShard', 'chemicalBottle', 'arcaneCore', 'dataRecord', 'mutantMeat'],
    commonMaterials: ['glassShard', 'chemicalBottle', 'dataRecord', 'wood', 'oldCoin', 'mapFragment'],
    enemies: ['failedSubject', 'observerDrone', 'arcaneGuardian'],
  },
};

export const BIOME_IDS = Object.keys(BIOME_DEFINITIONS) as BiomeId[];

