import fs from 'fs';
import https from 'https';
import path from 'path';
import { Logger } from './src/utils/logger';
import type { Character } from './src/types/character';

interface APIResponse<T> {
  response: number;
  data: T;
}

interface FullAvatarData {
  id: number;
  rank: number;
  name: string;
  element: string;
  weaponType: string;
  region: string;
  specialProp: string;
  bodyType: string;
  icon: string;
  birthday: number[];
  release: number;
  route: string;
  fetter: {
    title: string;
    detail: string;
    constellation: string;
    native: string;
    cv: {
      EN: string;
      CHS: string;
      JP: string;
      KR: string;
    };
  };
  upgrade: {
    prop: Array<{
      propType: string;
      initValue: number;
      type: string;
    }>;
    promote: Array<{
      promoteLevel: number;
      promoteAudio?: string;
      costItems?: Record<string, number>;
      unlockMaxLevel: number;
      addProps?: Record<string, number>;
      requiredPlayerLevel?: number;
      coinCost?: number;
    }>;
  };
  other: {
    costume: Array<{
      name: string;
      description: string;
      isDefault?: boolean;
      storyId?: number;
      icon?: string;
      rank?: number;
    }>;
    furnitureId: number;
    nameCard: {
      id: number;
      name: string;
      description: string;
      icon: string;
    };
    specialFood: {
      id: number;
      name: string;
      rank: number;
      effectIcon: string;
      icon: string;
    };
  };
  ascension: Record<string, string>;
  items: Record<string, string>;
  talent: Record<
    string,
    {
      id: number;
      name: string;
      icon: string;
      desc: string;
      type: number;
      promote?: Record<
        string,
        {
          params: number[];
          description: string[];
          coinCost?: number;
          costItems?: Record<string, number>;
        }
      >;
    }
  >;
  constellation: Record<
    string,
    {
      id: number;
      name: string;
      icon: string;
      desc: string;
      pos: number;
    }
  >;
}

interface MaterialInfo {
  id: number;
  name: string;
  rank: number;
  icon: string;
  description: string;
  type: string;
}

interface NameCardItem {
  id: number;
  name: string;
  description?: string;
  icon: string;
}

interface TalentData {
  id?: number;
  name: string;
  desc: string;
  icon: string;
  type: number;
  promote?: Record<
    string,
    {
      params: number[];
      description: string[];
      coinCost?: number;
      costItems?: Record<string, number>;
    }
  >;
}

/**
 * 真の完全APIスクレイパー - Puppeteer不要！
 * HTTPリクエストのみでPythonレベルの完全性を実現
 */
class PureApiScraper {
  private readonly baseApiUrl = 'https://gi.yatta.moe/api/v2/jp';
  private readonly versionHash = '38E6';
  private readonly assetsDir: string;
  private materialCache = new Map<string, MaterialInfo>();
  private imageDownloadCache = new Map<string, string>();

  constructor(assetsDir = 'genshin-viewer/public/assets/images') {
    this.assetsDir = path.resolve(assetsDir);
    // Ensure assets directory exists
    if (!fs.existsSync(this.assetsDir)) {
      fs.mkdirSync(this.assetsDir, { recursive: true });
    }
  }

  /**
   * HTTPリクエストのみで完全なキャラクター情報を取得
   */
  async scrapeCompleteCharacterByPureApi(
    characterId: number,
    characterSlug: string
  ): Promise<Character | null> {
    try {
      Logger.info(`🚀 PURE API scraping character ID: ${characterId} (NO PUPPETEER!)`);

      // 1. キャラクター基本データを取得
      const avatarData = await this.fetchFromApi<FullAvatarData>(`/avatar/${characterId}`);
      if (!avatarData) {
        Logger.error(`❌ No data found for character ${characterId}`);
        return null;
      }

      Logger.info(`✅ PURE API data loaded for: ${avatarData.name}`);

      // 2. 全ての画像を並行ダウンロード
      const [
        characterIcon,
        talents,
        constellations,
        costumes,
        nameCard,
        specialFood,
        ascensionMaterials,
      ] = await Promise.all([
        // キャラクターアイコン
        this.downloadImageSafely(
          `https://gi.yatta.moe/assets/UI/${avatarData.icon}.png`,
          characterSlug,
          'icon'
        ),
        // 才能情報
        this.processTalentsFromPureApi(avatarData, characterSlug),
        // 星座情報
        this.processConstellationsFromPureApi(avatarData, characterSlug),
        // コスチューム情報
        this.processCostumesFromPureApi(avatarData, characterSlug),
        // 名刺情報
        this.processNameCardFromPureApi(avatarData, characterSlug),
        // 特製料理情報
        this.processSpecialFoodFromPureApi(avatarData, characterSlug),
        // 真の昇天素材情報
        this.processRealAscensionMaterialsPure(avatarData, characterSlug),
      ]);

      // 3. 完全なキャラクターオブジェクトを構築
      const character: Character = {
        id: characterSlug,
        name: avatarData.name,
        nameJa: avatarData.fetter.title,
        element: this.mapElement(avatarData.element),
        weaponType: this.mapWeaponType(avatarData.weaponType),
        rarity: avatarData.rank as 4 | 5,
        region: this.mapRegion(avatarData.region),
        constellation: avatarData.fetter.constellation,
        description: avatarData.fetter.detail,
        icon: characterIcon,
        profile: {
          baseHp: this.getBaseStat(avatarData.upgrade.prop, 'FIGHT_PROP_BASE_HP'),
          baseAtk: this.getBaseStat(avatarData.upgrade.prop, 'FIGHT_PROP_BASE_ATTACK'),
          baseDef: this.getBaseStat(avatarData.upgrade.prop, 'FIGHT_PROP_BASE_DEFENSE'),
          bonusStat: {
            name: this.mapSpecialProp(avatarData.specialProp),
            value: this.getBonusStatValue(avatarData.upgrade, avatarData.specialProp),
          },
        },
        talents: {
          normal: {
            id: talents.normalAttack.name,
            name: talents.normalAttack.name,
            description: talents.normalAttack.description,
            icon: talents.normalAttack.icon,
            skillType: 'normal' as const,
            params: talents.normalAttack.levelData.reduce(
              (acc, level) => {
                acc[level.level.toString()] = [];
                return acc;
              },
              {} as { [level: string]: number[] }
            ),
          },
          skill: {
            id: talents.elementalSkill.name,
            name: talents.elementalSkill.name,
            description: talents.elementalSkill.description,
            icon: talents.elementalSkill.icon,
            levelData: talents.elementalSkill.levelData.map(level => ({
              tableIndex: level.level,
              skillType: 'elemental_skill',
              rowIndex: level.level,
              ...level,
            })),
          },
          elementalBurst: {
            name: talents.elementalBurst.name,
            description: talents.elementalBurst.description,
            icon: talents.elementalBurst.icon,
            levelData: talents.elementalBurst.levelData.map(level => ({
              tableIndex: level.level,
              skillType: 'elemental_burst',
              rowIndex: level.level,
              ...level,
            })),
          },
          passiveTalents: talents.passiveTalents,
          completeTableData:
            talents.completeTableData?.map(item => ({
              ...item,
              type: String(item.type || ''),
            })) || [],
        },
        constellations: {
          constellations: constellations.constellations.map(c => ({
            ...c,
            icon: c.icon || '',
          })),
        },
        // 新しく追加された完全な情報
        costumes,
        nameCard,
        specialFood,
        levelProgression: this.buildLevelProgression(avatarData.upgrade),
        ascensionMaterials,
        // 追加メタデータ
        voiceActors: avatarData.fetter.cv,
        ...(avatarData.birthday
          ? { birthday: `${avatarData.birthday[0]}/${avatarData.birthday[1]}` }
          : {}),
        nativeTitle: avatarData.fetter.native,
        furnitureId: avatarData.other.furnitureId,
      };

      Logger.info(`🎉 PURE API COMPLETE character built: ${character.name}`);
      Logger.info(
        `   📊 ${character.element} ${character.weaponType} ${character.rarity}⭐ from ${character.region}`
      );
      Logger.info(
        `   ⚔️ Talents: ${talents.normalAttack.name}, ${talents.elementalSkill.name}, ${talents.elementalBurst.name}`
      );
      Logger.info(`   🌟 Constellations: ${constellations.constellations.length} levels`);
      Logger.info(`   🎭 Costumes: ${costumes.length} outfits`);
      Logger.info(`   🎴 Namecard: ${nameCard?.name || 'None'}`);
      Logger.info(`   🍳 Special Food: ${specialFood.name}`);
      Logger.info(
        `   📦 Real Materials: ${ascensionMaterials.phases.reduce((total, phase) => total + phase.materials.length, 0)} materials`
      );

      return character;
    } catch (error) {
      Logger.error(`❌ PURE API scraping failed for character ${characterId}:`, error as Error);
      return null;
    }
  }

  /**
   * HTTPSリクエストでAPIからデータを取得
   */
  private async fetchFromApi<T>(endpoint: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const url = `${this.baseApiUrl}${endpoint}?vh=${this.versionHash}`;

      https
        .get(url, res => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => {
            try {
              const json = JSON.parse(data) as APIResponse<T>;
              if (json.response === 200) {
                resolve(json.data);
              } else {
                resolve(null);
              }
            } catch (error) {
              reject(error instanceof Error ? error : new Error(String(error)));
            }
          });
        })
        .on('error', reject);
    });
  }

  /**
   * 画像を安全にダウンロード（フォールバック付き）
   */
  private async downloadImageSafelyWithFallback(
    url: string,
    characterSlug: string,
    type: string,
    fallbackIcon?: string
  ): Promise<string> {
    // キャッシュをチェック
    if (this.imageDownloadCache.has(url)) {
      return this.imageDownloadCache.get(url)!;
    }

    const filename = this.generateImageFilename(url, characterSlug, type);
    const filePath = path.join(this.assetsDir, filename);

    // ファイルが既に存在する場合はスキップ
    if (fs.existsSync(filePath)) {
      const relativePath = `/assets/images/${filename}`;
      this.imageDownloadCache.set(url, relativePath);
      return relativePath;
    }

    return new Promise((resolve, reject) => {
      https
        .get(url, response => {
          if (response.statusCode === 200) {
            const fileStream = fs.createWriteStream(filePath);
            response.pipe(fileStream);

            fileStream.on('finish', () => {
              fileStream.close();
              const relativePath = `/assets/images/${filename}`;
              this.imageDownloadCache.set(url, relativePath);
              Logger.info(`📷 Downloaded: ${filename}`);
              resolve(relativePath);
            });

            fileStream.on('error', reject);
          } else if (response.statusCode === 404 && fallbackIcon) {
            // 404エラーの場合、エラーログを出力せずにフォールバック画像を使用
            Logger.info(`ℹ️ Namecard icon not available, using character icon fallback`);
            const fallbackUrl = `https://gi.yatta.moe/assets/UI/${fallbackIcon}.png`;
            this.downloadImageSafely(fallbackUrl, characterSlug, type).then(resolve).catch(reject);
          } else {
            Logger.error(`Failed to download ${url}: ${response.statusCode}`);
            resolve(url); // フォールバック
          }
        })
        .on('error', reject);
    });
  }

  /**
   * 画像を安全にダウンロード
   */
  private async downloadImageSafely(
    url: string,
    characterSlug: string,
    type: string
  ): Promise<string> {
    // キャッシュをチェック
    if (this.imageDownloadCache.has(url)) {
      return this.imageDownloadCache.get(url)!;
    }

    const filename = this.generateImageFilename(url, characterSlug, type);
    const filePath = path.join(this.assetsDir, filename);

    // ファイルが既に存在する場合はスキップ
    if (fs.existsSync(filePath)) {
      const relativePath = `/assets/images/${filename}`;
      this.imageDownloadCache.set(url, relativePath);
      return relativePath;
    }

    return new Promise((resolve, reject) => {
      https
        .get(url, response => {
          if (response.statusCode === 200) {
            const fileStream = fs.createWriteStream(filePath);
            response.pipe(fileStream);

            fileStream.on('finish', () => {
              fileStream.close();
              const relativePath = `/assets/images/${filename}`;
              this.imageDownloadCache.set(url, relativePath);
              Logger.info(`📷 Downloaded: ${filename}`);
              resolve(relativePath);
            });

            fileStream.on('error', reject);
          } else {
            Logger.error(`Failed to download ${url}: ${response.statusCode}`);
            resolve(url); // フォールバック
          }
        })
        .on('error', reject);
    });
  }

  private generateImageFilename(url: string, characterSlug: string, type: string): string {
    const timestamp = Date.now();
    const extension = url.split('.').pop() || 'png';
    return `${characterSlug}_${type}_${timestamp}.${extension}`;
  }

  /**
   * 真の昇天素材情報を取得（実際の素材名と画像付き）
   */
  private async processRealAscensionMaterialsPure(data: FullAvatarData, characterSlug: string) {
    Logger.info(`📦 Processing REAL ascension materials for ${characterSlug} (PURE API)`);

    // 全ユニーク素材IDを収集
    const allMaterialIds = new Set<string>();
    data.upgrade.promote.forEach(phase => {
      if (phase.costItems) {
        Object.keys(phase.costItems).forEach(itemId => {
          allMaterialIds.add(itemId);
        });
      }
    });

    // 各素材の情報を並行取得
    const materialPromises = Array.from(allMaterialIds).map(async materialId => {
      const material = await this.fetchMaterialInfo(materialId);
      if (material) {
        // 素材アイコンをダウンロード
        const materialIcon = await this.downloadImageSafely(
          `https://gi.yatta.moe/assets/UI/${material.icon}.png`,
          characterSlug,
          `material_${materialId}`
        );
        return [materialId, { ...material, icon: materialIcon }] as const;
      }
      return null;
    });

    const materialResults = await Promise.allSettled(materialPromises);
    const materialData = new Map<string, MaterialInfo>();

    materialResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        const [materialId, material] = result.value;
        materialData.set(materialId, material);
      }
    });

    // 昇天フェーズを実際の素材名と画像付きで構築
    const phases = data.upgrade.promote.map(phase => ({
      level: phase.promoteLevel,
      maxLevel: phase.unlockMaxLevel,
      requiredPlayerLevel: phase.requiredPlayerLevel || 0,
      coinCost: phase.coinCost || 0,
      materials: phase.costItems
        ? Object.entries(phase.costItems).map(([itemId, count]) => {
            const material = materialData.get(itemId);
            return {
              itemId,
              name: material?.name || `Unknown Material ${itemId}`,
              count,
              rank: material?.rank || 1,
              icon: material?.icon || '',
              description: material?.description || '',
              type: material?.type || 'unknown',
            };
          })
        : [],
      statBonus: phase.addProps
        ? Object.entries(phase.addProps).map(([propType, value]) => ({
            statType: this.mapSpecialProp(propType),
            value: value,
          }))
        : [],
    }));

    return { phases };
  }

  /**
   * 素材情報をAPIから取得
   */
  private async fetchMaterialInfo(materialId: string): Promise<MaterialInfo | null> {
    if (this.materialCache.has(materialId)) {
      return this.materialCache.get(materialId)!;
    }

    try {
      const material = await this.fetchFromApi<MaterialInfo>(`/material/${materialId}`);
      if (material) {
        this.materialCache.set(materialId, material);
        return material;
      }
    } catch (error) {
      Logger.error(`Failed to fetch material info for ${materialId}:`, error as Error);
    }

    return null;
  }

  private async processTalentsFromPureApi(data: FullAvatarData, characterSlug: string) {
    Logger.info(`⚔️ Processing COMPLETE talents for ${characterSlug} (PURE API)`);

    const talent0 = data.talent['0']; // Normal attack
    const talent1 = data.talent['1']; // Elemental skill
    const talent2 = data.talent['2']; // Sprint/alternate ability
    const talent4 = data.talent['4']; // Elemental burst
    const passiveTalents = Object.values(data.talent).filter((t: TalentData) => t.type === 2);

    // 全ての才能アイコンを並行ダウンロード
    const [normalAttackIcon, elementalSkillIcon, elementalBurstIcon, sprintIcon, ...passiveIcons] =
      await Promise.all([
        this.downloadImageSafely(
          `https://gi.yatta.moe/assets/UI/${talent0?.icon}.png`,
          characterSlug,
          'normal_attack'
        ),
        this.downloadImageSafely(
          `https://gi.yatta.moe/assets/UI/${talent1?.icon}.png`,
          characterSlug,
          'elemental_skill'
        ),
        this.downloadImageSafely(
          `https://gi.yatta.moe/assets/UI/${talent4?.icon}.png`,
          characterSlug,
          'elemental_burst'
        ),
        talent2
          ? this.downloadImageSafely(
              `https://gi.yatta.moe/assets/UI/${talent2.icon}.png`,
              characterSlug,
              'sprint'
            )
          : Promise.resolve(''),
        ...passiveTalents.map((talent: TalentData, index: number) =>
          this.downloadImageSafely(
            `https://gi.yatta.moe/assets/UI/${talent.icon}.png`,
            characterSlug,
            `passive_${index + 1}`
          )
        ),
      ]);

    const passiveTalentsWithIcons = passiveTalents.map(
      (talent: { name: string; desc: string }, index: number) => ({
        name: talent.name,
        description: talent.desc,
        icon: passiveIcons[index] || '',
      })
    );

    return {
      normalAttack: {
        name: talent0?.name || 'Unknown',
        description: talent0?.desc || '',
        icon: normalAttackIcon,
        levelData: this.buildTalentLevelDataFromAPI(talent0?.promote || {}),
      },
      elementalSkill: {
        name: talent1?.name || 'Unknown',
        description: talent1?.desc || '',
        icon: elementalSkillIcon,
        levelData: this.buildTalentLevelDataFromAPI(talent1?.promote || {}),
      },
      elementalBurst: {
        name: talent4?.name || 'Unknown',
        description: talent4?.desc || '',
        icon: elementalBurstIcon,
        levelData: this.buildTalentLevelDataFromAPI(talent4?.promote || {}),
      },
      sprintAbility: talent2
        ? {
            name: talent2.name,
            description: talent2.desc,
            icon: sprintIcon,
          }
        : null,
      passiveTalents: passiveTalentsWithIcons,
      completeTableData: this.buildCompleteTableDataFromAPI(data.talent),
    };
  }

  private async processConstellationsFromPureApi(data: FullAvatarData, characterSlug: string) {
    Logger.info(`🌟 Processing COMPLETE constellations for ${characterSlug} (PURE API)`);

    const constellationIcons = await Promise.all(
      Object.values(data.constellation).map((constellation: { icon: string; pos: number }) =>
        this.downloadImageSafely(
          `https://gi.yatta.moe/assets/UI/${constellation.icon}.png`,
          characterSlug,
          `constellation_c${constellation.pos + 1}`
        )
      )
    );

    const constellationsWithIcons = Object.values(data.constellation).map(
      (constellation: { pos: number; name: string; desc: string }, index: number) => ({
        level: (constellation.pos + 1) as 1 | 2 | 3 | 4 | 5 | 6,
        name: constellation.name,
        description: constellation.desc,
        icon: constellationIcons[index],
      })
    );

    return { constellations: constellationsWithIcons };
  }

  private async processCostumesFromPureApi(data: FullAvatarData, characterSlug: string) {
    Logger.info(
      `🎭 Processing ${data.other.costume.length} costumes for ${characterSlug} (PURE API)`
    );

    const costumeIcons = await Promise.all(
      data.other.costume.map((costume, index) =>
        costume.icon
          ? this.downloadImageSafely(
              `https://gi.yatta.moe/assets/UI/${costume.icon}.png`,
              characterSlug,
              `costume_${index + 1}`
            )
          : Promise.resolve('')
      )
    );

    return data.other.costume.map((costume, index) => ({
      name: costume.name,
      description: costume.description,
      isDefault: costume.isDefault || false,
      rank: costume.rank || 1,
      storyId: costume.storyId,
      icon: costumeIcons[index],
    }));
  }

  private async processNameCardFromPureApi(data: FullAvatarData, characterSlug: string) {
    Logger.info(`🎴 Processing namecard for ${characterSlug} (PURE API)`);

    // 名片データは別のAPIエンドポイントから取得
    const nameCardData = await this.fetchFromApi<{ items: Record<string, NameCardItem> }>(
      '/namecard'
    );
    if (!nameCardData || !nameCardData.items) {
      Logger.error('❌ Failed to fetch namecard data from API');
      return null;
    }

    // デバッグ：キャラクター名を表示
    Logger.info(`🔍 Searching namecard for character: "${data.name}"`);

    // 日本語文字対応の検索パターン
    let nameCard = null;

    // 完全名で検索
    nameCard = Object.values(nameCardData.items).find(
      (card: NameCardItem) => card.name && card.name.includes(data.name)
    );

    // 名前の各文字で検索（日本語対応）
    if (!nameCard) {
      const nameChars = data.name.split('');
      for (const char of nameChars) {
        if (char.length > 0 && char !== '·' && char !== ' ') {
          nameCard = Object.values(nameCardData.items).find(
            (card: NameCardItem) => card.name && card.name.includes(char)
          );
          if (nameCard) {
            Logger.info(`✅ Found namecard using character "${char}"`);
            break;
          }
        }
      }
    }

    // 最後の手段：姓または名で検索
    if (!nameCard) {
      const [surname, givenName] = data.name.split(/[·\s]/);
      for (const namePart of [surname, givenName].filter(Boolean)) {
        nameCard = Object.values(nameCardData.items).find(
          (card: NameCardItem) => card.name && namePart && card.name.includes(namePart)
        );
        if (nameCard) {
          Logger.info(`✅ Found namecard using name part "${namePart}"`);
          break;
        }
      }
    }

    if (!nameCard) {
      Logger.warn(`⚠️ No namecard found for character: ${data.name}`);
      Logger.info(`Total namecards available: ${Object.keys(nameCardData.items).length}`);
      Logger.info(
        `Sample namecards: ${Object.values(nameCardData.items)
          .slice(0, 10)
          .map((c: NameCardItem) => c.name)
          .join(', ')}`
      );
      return null;
    } else {
      Logger.info(`🎯 Successfully found namecard: ${nameCard.name} (ID: ${nameCard.id})`);
    }

    Logger.info(`✅ Found namecard: ${nameCard.name}`);

    // 名片アイコンをダウンロード（404エラー対応）
    const nameCardIcon = await this.downloadImageSafelyWithFallback(
      `https://gi.yatta.moe/assets/UI/${nameCard.icon}.png`,
      characterSlug,
      'namecard',
      data.icon // フォールバックとしてキャラクターアイコンを使用
    );

    return {
      id: nameCard.id,
      name: nameCard.name,
      description: nameCard.description || nameCard.name,
      icon: nameCardIcon,
    };
  }

  private async processSpecialFoodFromPureApi(data: FullAvatarData, characterSlug: string) {
    Logger.info(`🍳 Processing special food for ${characterSlug} (PURE API)`);

    const [foodIcon, effectIcon] = await Promise.all([
      this.downloadImageSafely(
        `https://gi.yatta.moe/assets/UI/${data.other.specialFood.icon}.png`,
        characterSlug,
        'special_food'
      ),
      this.downloadImageSafely(
        `https://gi.yatta.moe/assets/UI/${data.other.specialFood.effectIcon}.png`,
        characterSlug,
        'food_effect'
      ),
    ]);

    return {
      id: data.other.specialFood.id,
      name: data.other.specialFood.name,
      rank: data.other.specialFood.rank,
      icon: foodIcon,
      effectIcon: effectIcon,
    };
  }

  // ユーティリティメソッド（以前と同じ）
  private buildTalentLevelDataFromAPI(
    promoteData: Record<
      string,
      {
        params?: number[];
        description?: string[];
        costItems?: Record<string, number>;
        coinCost?: number;
      }
    >
  ): Array<{
    level: number;
    parameters: number[];
    description: string[];
    costItems: Record<string, number> | null;
    coinCost: number | null;
    formattedValues: string[];
  }> {
    const levelData: Array<{
      level: number;
      parameters: number[];
      description: string[];
      costItems: Record<string, number> | null;
      coinCost: number | null;
      formattedValues: string[];
    }> = [];
    for (let level = 1; level <= 15; level++) {
      const levelKey = level.toString();
      const levelInfo = promoteData[levelKey];
      if (levelInfo) {
        levelData.push({
          level: level,
          parameters: levelInfo.params || [],
          description: levelInfo.description || [],
          costItems: levelInfo.costItems || null,
          coinCost: levelInfo.coinCost || null,
          formattedValues: (levelInfo.params || []).map(param => {
            if (param < 1) return `${(param * 100).toFixed(1)}%`;
            return param.toString();
          }),
        });
      }
    }
    return levelData;
  }

  private buildCompleteTableDataFromAPI(talentData: Record<string, TalentData>): Array<{
    talentIndex: number;
    talentId: string;
    name: string;
    description: string;
    type: string;
    levelData: Array<{
      level: number;
      parameters: number[];
      description: string[];
      costItems: Record<string, number> | null;
      coinCost: number | null;
      formattedValues: string[];
    }>;
  }> {
    const tableData: Array<{
      talentIndex: number;
      talentId: string;
      name: string;
      description: string;
      type: string;
      levelData: Array<{
        level: number;
        parameters: number[];
        description: string[];
        costItems: Record<string, number> | null;
        coinCost: number | null;
        formattedValues: string[];
      }>;
    }> = [];
    Object.keys(talentData).forEach(key => {
      const talent = talentData[key];
      if (!talent) return;
      tableData.push({
        talentIndex: parseInt(key),
        talentId: talent.id?.toString() || key,
        name: talent.name,
        description: talent.desc,
        type: String(talent.type),
        levelData: this.buildTalentLevelDataFromAPI(talent.promote || {}),
      });
    });
    return tableData;
  }

  private getBaseStat(
    props: Array<{ propType: string; initValue: number }>,
    statType: string
  ): number {
    const stat = props.find(p => p.propType === statType);
    return stat?.initValue || 0;
  }

  private getBonusStatValue(
    upgrade: {
      promote?: Array<{ addProps?: Record<string, number> }>;
    },
    specialProp: string
  ): string {
    let finalValue = 0;
    if (upgrade.promote && upgrade.promote.length > 0) {
      const finalPhase = upgrade.promote[upgrade.promote.length - 1];
      if (finalPhase?.addProps && finalPhase.addProps[specialProp]) {
        finalValue = finalPhase.addProps[specialProp];
      }
    }
    if (finalValue === 0) {
      const defaults: Record<string, number> = {
        FIGHT_PROP_CRITICAL_HURT: 0.384,
        FIGHT_PROP_CRITICAL: 0.192,
        FIGHT_PROP_ATTACK_PERCENT: 0.24,
        FIGHT_PROP_ELEMENT_MASTERY: 96,
        FIGHT_PROP_CHARGE_EFFICIENCY: 0.32,
        FIGHT_PROP_HP_PERCENT: 0.288,
        FIGHT_PROP_DEFENSE_PERCENT: 0.36,
      };
      finalValue = defaults[specialProp] || 0;
    }
    if (specialProp.includes('PERCENT') || specialProp.includes('CRITICAL')) {
      return `${(finalValue * 100).toFixed(1)}%`;
    } else {
      return Math.round(finalValue).toString();
    }
  }

  private mapElement(
    element: string
  ): 'Pyro' | 'Hydro' | 'Anemo' | 'Electro' | 'Dendro' | 'Cryo' | 'Geo' {
    const elementMap: Record<
      string,
      'Pyro' | 'Hydro' | 'Anemo' | 'Electro' | 'Dendro' | 'Cryo' | 'Geo'
    > = {
      Ice: 'Cryo',
      Fire: 'Pyro',
      Water: 'Hydro',
      Electric: 'Electro',
      Wind: 'Anemo',
      Rock: 'Geo',
      Grass: 'Dendro',
    };
    return elementMap[element] || 'Anemo';
  }

  private mapWeaponType(weaponType: string): 'Sword' | 'Bow' | 'Polearm' | 'Claymore' | 'Catalyst' {
    const weaponMap: Record<string, 'Sword' | 'Bow' | 'Polearm' | 'Claymore' | 'Catalyst'> = {
      WEAPON_SWORD_ONE_HAND: 'Sword',
      WEAPON_CLAYMORE: 'Claymore',
      WEAPON_POLE: 'Polearm',
      WEAPON_BOW: 'Bow',
      WEAPON_CATALYST: 'Catalyst',
    };
    return weaponMap[weaponType] || 'Sword';
  }

  private mapRegion(
    region: string
  ): 'Mondstadt' | 'Liyue' | 'Inazuma' | 'Sumeru' | 'Fontaine' | 'Natlan' | 'Snezhnaya' {
    const regionMap: Record<
      string,
      'Mondstadt' | 'Liyue' | 'Inazuma' | 'Sumeru' | 'Fontaine' | 'Natlan' | 'Snezhnaya'
    > = {
      INAZUMA: 'Inazuma',
      MONDSTADT: 'Mondstadt',
      LIYUE: 'Liyue',
      SUMERU: 'Sumeru',
      FONTAINE: 'Fontaine',
      NATLAN: 'Natlan',
      SNEZHNAYA: 'Snezhnaya',
    };
    return regionMap[region] || 'Mondstadt';
  }

  private mapSpecialProp(specialProp: string): string {
    const propMap: Record<string, string> = {
      FIGHT_PROP_CRITICAL_HURT: '会心ダメージ',
      FIGHT_PROP_CRITICAL: '会心率',
      FIGHT_PROP_ATTACK_PERCENT: '攻撃力',
      FIGHT_PROP_ELEMENT_MASTERY: '元素熟知',
      FIGHT_PROP_CHARGE_EFFICIENCY: 'チャージ効率',
      FIGHT_PROP_HP_PERCENT: 'HP',
      FIGHT_PROP_DEFENSE_PERCENT: '防御力',
    };
    return propMap[specialProp] || specialProp;
  }

  private buildLevelProgression(upgrade: {
    prop: Array<{ propType: string; initValue: number; type: string }>;
  }): Array<{
    statType: string;
    values: number[];
    initValue: number;
    growthType: string;
  }> {
    const progression: Array<{
      statType: string;
      values: number[];
      initValue: number;
      growthType: string;
    }> = [];
    for (const prop of upgrade.prop) {
      const growthCurveValues = this.generateGrowthCurveValues(prop.type, prop.initValue);
      progression.push({
        statType: prop.propType,
        values: growthCurveValues,
        initValue: prop.initValue,
        growthType: prop.type,
      });
    }
    return progression;
  }

  private generateGrowthCurveValues(growthType: string, initValue: number): number[] {
    const values = [initValue];
    const growthMultipliers: Record<string, number[]> = {
      GROW_CURVE_HP_S5: this.generateCurveMultipliers(90, 6.0),
      GROW_CURVE_ATTACK_S5: this.generateCurveMultipliers(90, 3.5),
      GROW_CURVE_HP_S4: this.generateCurveMultipliers(90, 5.5),
    };
    const multipliers = growthMultipliers[growthType] || this.generateCurveMultipliers(90, 3.0);
    for (let level = 2; level <= 90; level++) {
      const multiplier = multipliers[level - 1] || 1.0;
      values.push(initValue * multiplier);
    }
    return values;
  }

  private generateCurveMultipliers(maxLevel: number, maxMultiplier: number): number[] {
    const multipliers = [1.0];
    for (let level = 2; level <= maxLevel; level++) {
      const normalizedLevel = (level - 1) / (maxLevel - 1);
      const exponent = Math.log(maxMultiplier) * normalizedLevel;
      const multiplier = Math.exp(exponent);
      multipliers.push(multiplier);
    }
    return multipliers;
  }
}

export { PureApiScraper };
