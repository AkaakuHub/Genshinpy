export interface TalentDetail {
  icon: string;
  name: string;
  description: string;
  stats?: TalentStats[];
}

export interface TalentStats {
  level: number;
  values: Record<string, string>;
}

export interface Talents {
  normalAttack: TalentDetail;
  elementalSkill: TalentDetail;
  elementalBurst: TalentDetail;
  passiveTalents: TalentDetail[];
}

export interface ConstellationDetail {
  icon: string;
  name: string;
  description: string;
  level: number;
}

export interface Constellations {
  constellations: ConstellationDetail[];
}

export interface AscensionMaterial {
  icon: string;
  name: string;
  amount: number;
}

export interface AscensionLevel {
  level: number;
  cost: number;
  materials: AscensionMaterial[];
}

export interface Ascensions {
  levels: AscensionLevel[];
}
