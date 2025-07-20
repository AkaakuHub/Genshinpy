export interface Character {
    id: string;
    name: string;
    nameJa: string;
    element: 'Anemo' | 'Geo' | 'Electro' | 'Dendro' | 'Hydro' | 'Pyro' | 'Cryo';
    weaponType: 'Sword' | 'Claymore' | 'Polearm' | 'Bow' | 'Catalyst';
    rarity: 4 | 5;
    region: 'Mondstadt' | 'Liyue' | 'Inazuma' | 'Sumeru' | 'Fontaine' | 'Natlan' | 'Snezhnaya' | 'Outlander' | 'Other';
    icon: string;
    constellation?: string;
    description?: string;
    stories?: {
        name: string;
        content: string;
    }[];
    namecard?: string;
    food?: {
        id: string;
        name: string;
        icon: string;
        description: string;
        effect: string;
    };
    talents?: {
        normal: {
            id: string;
            name: string;
            icon: string;
            description: string;
            skillType: 'normal';
            params: {
                [level: string]: number[];
            };
        };
        skill: {
            id: string;
            name: string;
            icon: string;
            description: string;
            skillType: 'skill';
            cooldown?: string;
            params: {
                [level: string]: number[];
            };
        };
        burst: {
            id: string;
            name: string;
            icon: string;
            description: string;
            skillType: 'burst';
            energyCost?: number;
            cooldown?: string;
            params: {
                [level: string]: number[];
            };
        };
        passive1?: {
            id: string;
            name: string;
            icon: string;
            description: string;
            skillType: 'passive';
        };
        passive2?: {
            id: string;
            name: string;
            icon: string;
            description: string;
            skillType: 'passive';
        };
        passive3?: {
            id: string;
            name: string;
            icon: string;
            description: string;
            skillType: 'passive';
        };
        passive4?: {
            id: string;
            name: string;
            icon: string;
            description: string;
            skillType: 'passive';
        };
    };
    constellations?: {
        [key: string]: {
            id: string;
            name: string;
            icon: string;
            description: string;
            level: number;
        };
    };
    ascensions?: {
        [level: string]: {
            level: number;
            cost: number;
            items: {
                [itemId: string]: {
                    id: string;
                    name: string;
                    icon: string;
                    count: number;
                };
            };
        };
    };
    profile?: {
        baseHp: number;
        baseAtk: number;
        baseDef: number;
        bonusStat: {
            name: string;
            value: string;
        };
    };
    progression?: {
        exp: {
            [level: string]: number;
        };
        costs: {
            [level: string]: number;
        };
    };
    stats?: {
        [level: string]: {
            hp: number;
            atk: number;
            def: number;
            specialized: number;
        };
    };
    costumes?: {
        [costumeId: string]: {
            id: string;
            name: string;
            icon: string;
            description?: string;
        };
    };
}
//# sourceMappingURL=character.d.ts.map