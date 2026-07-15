import type { ActorStats, BiomeId, ElementId, EnemyKind, ItemKind } from '../engine/types';
import { BIOME_DEFINITIONS } from './biomes';

type EnemyDefinition = {
  name: string;
  description: string;
  glyph: string;
  color: string;
  stats: ActorStats;
  drops: ItemKind[];
  biomes: BiomeId[];
  minDanger: number;
  weight: number;
  attackElement: ElementId;
  weakness?: ElementId;
  resistance?: ElementId;
};

export const ENEMY_DEFINITIONS: Record<EnemyKind, EnemyDefinition> = {
  caveImp: {
    name: '洞窟インプ',
    description: '序盤の基本敵。金属素材や古銭を持っていることがある。貫通属性に弱い。',
    glyph: 'i',
    color: '#d97878',
    stats: { hp: 9, maxHp: 9, attack: 5, defense: 0, speed: 12 },
    drops: ['ironOre', 'oldCoin'],
    biomes: ['mine'],
    minDanger: 1,
    weight: 36,
    attackElement: 'impact',
    weakness: 'pierce',
  },
  oreBeetle: {
    name: '鉱石虫',
    description: '防具素材の供給源になる硬い虫。硬殻が打撃を防ぐが、貫通属性には弱い。',
    glyph: 'b',
    color: '#a3e635',
    stats: { hp: 14, maxHp: 14, attack: 5, defense: 2, speed: 7 },
    drops: ['hardShell', 'copperOre'],
    biomes: ['mine'],
    minDanger: 1,
    weight: 28,
    attackElement: 'impact',
    weakness: 'pierce',
    resistance: 'impact',
  },
  tunnelGnoll: {
    name: '坑道ノール',
    description: '廃坑の強めの敵。古い歯車を持つことがある。頑丈な金属装備は貫通を防ぐが、重い一撃には耐えきれない。',
    glyph: 'G',
    color: '#f0a95b',
    stats: { hp: 20, maxHp: 20, attack: 8, defense: 2, speed: 8 },
    drops: ['oldGear', 'hardShell'],
    biomes: ['mine'],
    minDanger: 1,
    weight: 16,
    attackElement: 'impact',
    weakness: 'impact',
    resistance: 'pierce',
  },
  sporeBat: {
    name: '胞子コウモリ',
    description: '素早く先制されやすい菌糸の森の敵。体が薄く打撃に弱い。',
    glyph: 'b',
    color: '#c084fc',
    stats: { hp: 7, maxHp: 7, attack: 4, defense: 0, speed: 15 },
    drops: ['poisonSpore', 'blueMushroom'],
    biomes: ['forest'],
    minDanger: 1,
    weight: 32,
    attackElement: 'poison',
    weakness: 'impact',
  },
  slime: {
    name: '粘液スライム',
    description: '遅いが硬い敵。粘液や清水を落とす。毒はほぼ効かないが、電撃には弱い。',
    glyph: 's',
    color: '#67e8f9',
    stats: { hp: 15, maxHp: 15, attack: 4, defense: 1, speed: 5 },
    drops: ['slimeGel', 'cleanWater'],
    biomes: ['forest'],
    minDanger: 1,
    weight: 28,
    attackElement: 'poison',
    weakness: 'shock',
    resistance: 'poison',
  },
  herbEater: {
    name: '森の薬喰い',
    description: '回復素材を持つが、不用意に近づくと反撃される。毒に弱い。',
    glyph: 'h',
    color: '#86efac',
    stats: { hp: 13, maxHp: 13, attack: 6, defense: 1, speed: 9 },
    drops: ['herb', 'mutantMeat'],
    biomes: ['forest'],
    minDanger: 1,
    weight: 20,
    attackElement: 'poison',
    weakness: 'poison',
  },
  boneSentinel: {
    name: '骨の番兵',
    description: '砦の基本敵。矢や武器強化に使う骨片を持つ。骨は打撃で砕けやすく、貫通は通りにくい。',
    glyph: 'B',
    color: '#e5e7eb',
    stats: { hp: 16, maxHp: 16, attack: 7, defense: 1, speed: 10 },
    drops: ['boneShard', 'brokenBlade'],
    biomes: ['fortress'],
    minDanger: 2,
    weight: 30,
    attackElement: 'pierce',
    weakness: 'impact',
    resistance: 'pierce',
  },
  fortRaider: {
    name: '砦の略奪者',
    description: '鍵部屋への導線になる鍵束を落とすことがある。防具が薄く貫通に弱い。',
    glyph: 'r',
    color: '#d6a76c',
    stats: { hp: 18, maxHp: 18, attack: 8, defense: 1, speed: 11 },
    drops: ['sturdyLeather', 'keyBundle'],
    biomes: ['fortress'],
    minDanger: 2,
    weight: 24,
    attackElement: 'pierce',
    weakness: 'pierce',
  },
  crestKnight: {
    name: '紋章騎士',
    description: '砦の強敵。紋章片を狙えるが正面戦闘は危険。重装甲は貫通を防ぐが、打撃には弱い。',
    glyph: 'K',
    color: '#facc15',
    stats: { hp: 24, maxHp: 24, attack: 10, defense: 3, speed: 9 },
    drops: ['crestFragment', 'brokenBlade'],
    biomes: ['fortress'],
    minDanger: 2,
    weight: 10,
    attackElement: 'pierce',
    weakness: 'impact',
    resistance: 'pierce',
  },
  failedSubject: {
    name: '研究区の失敗作',
    description: '不気味な基本敵。危険薬や売却素材につながる。毒には強いが電撃に弱い不安定な体組織。',
    glyph: 'f',
    color: '#fb7185',
    stats: { hp: 19, maxHp: 19, attack: 8, defense: 1, speed: 10 },
    drops: ['mutantMeat', 'chemicalBottle'],
    biomes: ['lab'],
    minDanger: 3,
    weight: 28,
    attackElement: 'shock',
    weakness: 'shock',
    resistance: 'poison',
  },
  observerDrone: {
    name: '浮遊観測機',
    description: '遠距離から接近してくる索敵系の敵。電子機器なので電撃に弱いが、機械の体に毒は効かない。',
    glyph: 'o',
    color: '#a5b4fc',
    stats: { hp: 14, maxHp: 14, attack: 7, defense: 1, speed: 14 },
    drops: ['glassShard', 'dataRecord'],
    biomes: ['lab'],
    minDanger: 3,
    weight: 22,
    attackElement: 'shock',
    weakness: 'shock',
    resistance: 'poison',
  },
  arcaneGuardian: {
    name: '魔導炉の番人',
    description: '高価値素材の守護敵。倒すか避けるかの判断が重要。重厚な鎧が殴打を防ぐが、隙間を貫く一撃には弱い。',
    glyph: 'A',
    color: '#f0abfc',
    stats: { hp: 28, maxHp: 28, attack: 11, defense: 3, speed: 8 },
    drops: ['arcaneCore', 'dataRecord'],
    biomes: ['lab'],
    minDanger: 3,
    weight: 10,
    attackElement: 'shock',
    weakness: 'pierce',
    resistance: 'impact',
  },
};

export const ENEMY_KINDS = Object.keys(ENEMY_DEFINITIONS) as EnemyKind[];

export const chooseEnemyKind = (biome: BiomeId, roll: number): EnemyKind => {
  const definition = BIOME_DEFINITIONS[biome];
  const candidates = definition.enemies.filter((enemy) => ENEMY_DEFINITIONS[enemy].minDanger <= definition.danger);
  const totalWeight = candidates.reduce((total, enemy) => total + ENEMY_DEFINITIONS[enemy].weight, 0);
  let threshold = roll * totalWeight;

  for (const enemy of candidates) {
    threshold -= ENEMY_DEFINITIONS[enemy].weight;
    if (threshold <= 0) {
      return enemy;
    }
  }

  return candidates.at(-1) ?? 'caveImp';
};

export const chooseEnemyDrop = (enemy: EnemyKind, roll: number): ItemKind => {
  const drops = ENEMY_DEFINITIONS[enemy].drops;
  const index = Math.min(drops.length - 1, Math.floor(roll * drops.length));
  return drops[index] ?? drops[0];
};

export const scaledEnemyStats = (enemy: EnemyKind, dangerBonus: number): ActorStats => {
  const stats = ENEMY_DEFINITIONS[enemy].stats;
  const hp = stats.maxHp + dangerBonus * 2;

  return {
    hp,
    maxHp: hp,
    attack: stats.attack + Math.floor(dangerBonus * 0.75),
    defense: stats.defense,
    speed: stats.speed,
  };
};
