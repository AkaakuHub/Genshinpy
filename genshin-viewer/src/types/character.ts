export interface Character {
  id: string;
  name: string;
  nameJa: string;
  element: string;
  weaponType: string;
  rarity: 4 | 5;
  region: string;
  constellation: string;
  description: string;
  icon: string;
  profile: {
    baseHp: number;
    baseAtk: number;
    baseDef: number;
    bonusStat: {
      name: string;
      value: string;
    };
  };
  talents: {
    normalAttack: Talent;
    elementalSkill: Talent;
    elementalBurst: Talent;
    sprintAbility?: {
      name: string;
      description: string;
      icon: string;
    };
    passiveTalents: PassiveTalent[];
    completeTableData: TalentTableData[];
  };
  constellations: {
    constellations: Constellation[];
  };
  // 新しく追加された完全な情報
  costumes?: Costume[];
  nameCard?: NameCard;
  specialFood?: SpecialFood;
  levelProgression?: LevelProgression[];
  ascensionMaterials?: AscensionMaterials;
  // 追加メタデータ
  voiceActors?: {
    EN?: string;
    CHS?: string;
    JP?: string;
    KR?: string;
  };
  birthday?: number[];
  nativeTitle?: string;
  furnitureId?: number;
}

export interface Talent {
  name: string;
  description: string;
  icon: string;
  levelData: TalentLevel[];
}

export interface TalentLevel {
  level: number;
  parameters: number[];
  description: string[];
  costItems: { [itemId: string]: number } | null;
  coinCost: number | null;
  formattedValues: string[];
}

export interface PassiveTalent {
  name: string;
  description: string;
  icon: string;
}

export interface Constellation {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  name: string;
  description: string;
  icon: string;
}

export interface LevelProgression {
  statType: string;
  values: number[];
  initValue: number;
  growthType: string;
}

export interface AscensionMaterials {
  phases: AscensionPhase[];
}

export interface AscensionPhase {
  level: number;
  maxLevel: number;
  requiredPlayerLevel: number;
  coinCost: number;
  materials: MaterialRequirement[];
  statBonus: StatBonus[];
}

export interface MaterialRequirement {
  itemId: string;
  name: string;
  count: number;
  rank: number;
  icon: string;
  description: string;
  type?: string;
}

export interface StatBonus {
  statType: string;
  value: number;
}

export interface TalentTableData {
  talentIndex: number;
  talentId: string;
  name: string;
  description: string;
  type: number;
  cooldown?: number;
  cost?: number;
  levelData: TalentLevel[];
}

export interface Costume {
  name: string;
  description: string;
  isDefault: boolean;
  rank: number;
  storyId?: number;
  icon: string;
}

export interface NameCard {
  id: number;
  name: string;
  description: string;
  icon: string;
}

export interface SpecialFood {
  id: number;
  name: string;
  rank: number;
  icon: string;
  effectIcon: string;
}
