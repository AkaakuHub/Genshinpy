export interface Character {
  readonly id: string;
  readonly name: string;
  readonly nameJa: string;
  readonly element: ElementType;
  readonly weaponType: WeaponType;
  readonly rarity: 4 | 5;
  readonly region: Region;
  readonly birthday?: string;
  readonly constellation: string;
  readonly icon?: string;
  readonly cv?: {
    readonly japanese?: string;
    readonly english?: string;
    readonly chinese?: string;
    readonly korean?: string;
  };
  readonly affiliation?: string;
  readonly description?: string;
  readonly profile?: CharacterProfile;
  readonly talents?: CharacterTalents;
  readonly constellations?: CharacterConstellations;
  readonly ascension?: CharacterAscension;
  readonly materials?: CharacterMaterials;
  readonly costumes?: readonly any[];
  readonly nameCard?: any;
  readonly specialFood?: any;
  readonly levelProgression?: any;
  readonly ascensionMaterials?: any;
  readonly voiceActors?: any;
  readonly nativeTitle?: string;
  readonly furnitureId?: number;
}

export interface CharacterProfile {
  readonly baseHp: number;
  readonly baseAtk: number;
  readonly baseDef: number;
  readonly bonusStat: {
    readonly name: string;
    readonly value: string;
  };
  readonly stories?: readonly string[];
}

export interface CharacterTalents {
  readonly normalAttack: Talent;
  readonly elementalSkill: Talent;
  readonly elementalBurst: Talent;
  readonly passiveTalents: readonly PassiveTalent[];
  readonly completeTableData?: readonly CompleteTableData[];
}

interface Talent {
  readonly name: string;
  readonly description: string;
  readonly icon?: string;
  readonly levels?: readonly TalentLevel[];
  readonly levelData?: readonly TalentTableRow[];
}

interface TalentLevel {
  readonly level: number;
  readonly description: string;
  readonly parameters?: readonly string[];
}

interface PassiveTalent {
  readonly name: string;
  readonly description: string;
  readonly icon?: string;
  readonly unlockLevel?: number;
}

export interface CharacterConstellations {
  readonly constellations: readonly Constellation[];
}

interface Constellation {
  readonly level: 1 | 2 | 3 | 4 | 5 | 6;
  readonly name: string;
  readonly description: string;
  readonly icon?: string;
}

export interface CharacterAscension {
  readonly phases: readonly AscensionPhase[];
}

interface AscensionPhase {
  readonly phase: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  readonly level: string;
  readonly cost: number;
  readonly materials: readonly MaterialRequirement[];
}

export interface CharacterMaterials {
  readonly talentMaterials: readonly MaterialRequirement[];
  readonly ascensionMaterials: readonly MaterialRequirement[];
}

interface MaterialRequirement {
  readonly id: string;
  readonly name: string;
  readonly count: number;
  readonly icon?: string;
}

export type ElementType = 'Anemo' | 'Geo' | 'Electro' | 'Dendro' | 'Hydro' | 'Pyro' | 'Cryo';

export type WeaponType = 'Sword' | 'Claymore' | 'Polearm' | 'Bow' | 'Catalyst';

export type Region =
  | 'Mondstadt'
  | 'Liyue'
  | 'Inazuma'
  | 'Sumeru'
  | 'Fontaine'
  | 'Natlan'
  | 'Snezhnaya'
  | 'Unknown';

export interface CharacterList {
  readonly characters: readonly Character[];
  readonly lastUpdated: string;
  readonly version: string;
}

export interface ApiResponse<T> {
  readonly data: T;
  readonly success: boolean;
  readonly timestamp: string;
  readonly error?: string;
}

// New comprehensive table data interfaces for Python-level completeness
export interface TalentTableRow {
  readonly tableIndex: number;
  readonly skillType: string;
  readonly rowIndex: number;
  readonly level: number;
  readonly parameters: readonly number[];
  readonly description: readonly string[];
  readonly costItems: Record<string, number> | null;
  readonly coinCost: number | null;
  readonly formattedValues: readonly string[];
}

export interface CompleteTableData {
  readonly type: string;
  readonly index?: number;
  readonly skillType?: string;
  readonly data?: readonly any[];
  readonly rawCells?: readonly string[];
  readonly headers?: readonly string[];
  readonly [key: string]: any;
}
