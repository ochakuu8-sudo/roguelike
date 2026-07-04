import type { ActorStats, EnemyKind, ItemKind } from '../engine/types';

type EnemyDefinition = {
  name: string;
  description: string;
  glyph: string;
  color: string;
  stats: ActorStats;
  drop: ItemKind;
  minDepth: number;
  weight: number;
};

export const ENEMY_DEFINITIONS: Record<EnemyKind, EnemyDefinition> = {
  caveImp: {
    name: '洞窟インプ',
    description: '素早く接近してくる小型の敵。防御は低いが、序盤では先に攻撃されやすい。',
    glyph: 'i',
    color: '#d97878',
    stats: { hp: 9, maxHp: 9, attack: 5, defense: 0, speed: 12 },
    drop: 'impFang',
    minDepth: 1,
    weight: 34,
  },
  stoneGnoll: {
    name: '石肌ノール',
    description: '硬い皮膚を持つ重い敵。動きは遅いが、攻撃と防御が高い。',
    glyph: 'G',
    color: '#f0a95b',
    stats: { hp: 20, maxHp: 20, attack: 8, defense: 2, speed: 8 },
    drop: 'gnollHide',
    minDepth: 1,
    weight: 16,
  },
  venomBat: {
    name: '毒羽コウモリ',
    description: '体力は低いが非常に素早い飛行敵。先制されやすいので残りHPに注意が必要。',
    glyph: 'b',
    color: '#c084fc',
    stats: { hp: 7, maxHp: 7, attack: 4, defense: 0, speed: 15 },
    drop: 'batWing',
    minDepth: 1,
    weight: 24,
  },
  rustSlime: {
    name: '錆びたスライム',
    description: '遅くて粘り強い敵。攻撃は控えめだが、倒すまでに手数を使いやすい。',
    glyph: 's',
    color: '#67e8f9',
    stats: { hp: 14, maxHp: 14, attack: 4, defense: 1, speed: 5 },
    drop: 'slimeGel',
    minDepth: 1,
    weight: 22,
  },
  boneSentinel: {
    name: '骨の番兵',
    description: '攻撃力が高い中量級の敵。素早さも平均的で、正面からの殴り合いは危険。',
    glyph: 'B',
    color: '#e5e7eb',
    stats: { hp: 16, maxHp: 16, attack: 7, defense: 1, speed: 10 },
    drop: 'boneShard',
    minDepth: 1,
    weight: 14,
  },
};

export const ENEMY_KINDS = Object.keys(ENEMY_DEFINITIONS) as EnemyKind[];

export const chooseEnemyKind = (depth: number, roll: number): EnemyKind => {
  const candidates = ENEMY_KINDS.filter((enemy) => ENEMY_DEFINITIONS[enemy].minDepth <= depth);
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

export const scaledEnemyStats = (enemy: EnemyKind, depth: number): ActorStats => {
  const stats = ENEMY_DEFINITIONS[enemy].stats;
  const depthBonus = Math.max(0, depth - 1);
  const hp = stats.maxHp + depthBonus * 2;

  return {
    hp,
    maxHp: hp,
    attack: stats.attack + Math.floor(depthBonus * 0.75),
    defense: stats.defense,
    speed: stats.speed,
  };
};

