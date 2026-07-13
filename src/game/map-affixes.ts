import * as ROT from 'rot-js';
import type { MapAffix, MapAffixId, MapRoll, MapTier } from '../engine/types';

type MapAffixDefinition = {
  id: MapAffixId;
  label: (magnitude: number) => string;
  rollMagnitude: () => number;
};

const randomInRange = (min: number, max: number) => Math.round(min + ROT.RNG.getUniform() * (max - min));

export const MAP_AFFIX_DEFINITIONS: Record<MapAffixId, MapAffixDefinition> = {
  richYield: {
    id: 'richYield',
    label: (magnitude) => `採取ポイント +${magnitude}%`,
    rollMagnitude: () => randomInRange(20, 80),
  },
  denseSwarm: {
    id: 'denseSwarm',
    label: (magnitude) => `出現する敵の強さ +${magnitude}%`,
    rollMagnitude: () => randomInRange(15, 50),
  },
  fortune: {
    id: 'fortune',
    label: (magnitude) => `レア素材の入手率 +${magnitude}%`,
    rollMagnitude: () => randomInRange(20, 60),
  },
  vaultSealed: {
    id: 'vaultSealed',
    label: () => '封印された宝物庫が追加で出現',
    rollMagnitude: () => 1,
  },
  eliteGuardian: {
    id: 'eliteGuardian',
    label: () => '宝物庫の守護者が強化される',
    rollMagnitude: () => 1,
  },
};

export const MAP_AFFIX_IDS = Object.keys(MAP_AFFIX_DEFINITIONS) as MapAffixId[];

export const TIER_LABELS: Record<MapTier, string> = {
  normal: '通常',
  magic: '上質',
  rare: '希少',
};

const TIER_AFFIX_COUNT: Record<MapTier, number> = {
  normal: 1,
  magic: 2,
  rare: 3,
};

export const describeAffix = (affix: MapAffix): string => MAP_AFFIX_DEFINITIONS[affix.id].label(affix.magnitude);

const rollMapTier = (): MapTier => {
  const roll = ROT.RNG.getUniform();
  if (roll < 0.55) {
    return 'normal';
  }
  if (roll < 0.85) {
    return 'magic';
  }
  return 'rare';
};

const rollMapAffixes = (tier: MapTier): MapAffix[] => {
  const pool = [...MAP_AFFIX_IDS];
  const count = Math.min(TIER_AFFIX_COUNT[tier], pool.length);
  const affixes: MapAffix[] = [];

  for (let index = 0; index < count; index += 1) {
    const pick = ROT.RNG.getUniformInt(0, pool.length - 1);
    const id = pool.splice(pick, 1)[0];
    affixes.push({ id, magnitude: MAP_AFFIX_DEFINITIONS[id].rollMagnitude() });
  }

  return affixes;
};

export const rollMapRoll = (id: string): MapRoll => {
  const tier = rollMapTier();
  return { id, tier, affixes: rollMapAffixes(tier) };
};

export type MapAffixSummary = {
  richYieldPercent: number;
  denseSwarmPercent: number;
  fortunePercent: number;
  vaultCount: number;
  eliteGuardianCount: number;
};

export const summarizeMapAffixes = (affixes: MapAffix[]): MapAffixSummary => {
  const summary: MapAffixSummary = {
    richYieldPercent: 0,
    denseSwarmPercent: 0,
    fortunePercent: 0,
    vaultCount: 0,
    eliteGuardianCount: 0,
  };

  affixes.forEach((affix) => {
    if (affix.id === 'richYield') {
      summary.richYieldPercent += affix.magnitude;
    } else if (affix.id === 'denseSwarm') {
      summary.denseSwarmPercent += affix.magnitude;
    } else if (affix.id === 'fortune') {
      summary.fortunePercent += affix.magnitude;
    } else if (affix.id === 'vaultSealed') {
      summary.vaultCount += 1;
    } else if (affix.id === 'eliteGuardian') {
      summary.eliteGuardianCount += 1;
    }
  });

  return summary;
};
