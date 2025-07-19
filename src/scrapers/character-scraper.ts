import puppeteer, { type Browser, type Page } from 'puppeteer';
import { Logger } from '../utils/logger.js';
import { FileSystem } from '../utils/file-system.js';
import { SCRAPER_CONFIG, OUTPUT_PATHS } from './config.js';
import type { Character, CharacterList } from '../types/character.js';

export class CharacterScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize(): Promise<void> {
    Logger.info('Initializing browser...');
    this.browser = await puppeteer.launch(SCRAPER_CONFIG.browser);
    this.page = await this.browser.newPage();

    // Set user agent to avoid detection
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );

    Logger.info('Browser initialized successfully');
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      Logger.info('Browser closed');
    }
  }

  private characterUrlMap: Map<string, string> = new Map();

  async scrapeCharacterList(): Promise<readonly string[]> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    Logger.info('Navigating to character list...');
    await this.page.goto(SCRAPER_CONFIG.baseUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Wait for SPA to load
    await new Promise(resolve => setTimeout(resolve, SCRAPER_CONFIG.delays.pageLoad));

    // Additional wait for JavaScript content
    await new Promise(resolve => setTimeout(resolve, SCRAPER_CONFIG.delays.jsWait));

    // Get character links with improved parsing
    const characterData = await this.page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/jp/archive/avatar/"]');
      return Array.from(links)
        .map(linkElement => {
          const href = linkElement.getAttribute('href');
          const displayName = linkElement.textContent?.trim() || '';

          if (href) {
            // Parse URL pattern: /jp/archive/avatar/10000002/kamisato-ayaka
            const match = href.match(/\/jp\/archive\/avatar\/(\d+)\/(.+)/);
            if (match) {
              return {
                id: match[1],
                characterName: match[2],
                displayName: displayName,
                href: href,
              };
            }
          }
          return null;
        })
        .filter((link): link is NonNullable<typeof link> => link !== null);
    });

    Logger.info(`Found ${characterData.length} characters`);

    // Store the URL mapping for later use
    this.characterUrlMap.clear();
    characterData.forEach(char => {
      if (char.characterName && char.href) {
        this.characterUrlMap.set(char.characterName, `https://gi.yatta.moe${char.href}`);
      }
    });

    // Return character names for compatibility
    return characterData
      .map(char => char.characterName)
      .filter(
        (characterName): characterName is string =>
          characterName !== undefined && characterName !== ''
      );
  }

  async scrapeCharacter(characterId: string): Promise<Character | null> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    try {
      Logger.info(`Scraping character: ${characterId}`);

      // Get the correct URL from our mapping
      const characterUrl = this.characterUrlMap.get(characterId);
      if (!characterUrl) {
        Logger.error(`Character URL not found for: ${characterId}`);
        Logger.error(
          `Available characters: ${Array.from(this.characterUrlMap.keys()).slice(0, 10).join(', ')}`
        );
        return null;
      }

      Logger.info(`Navigating to: ${characterUrl}`);

      // Navigate to character page
      await this.page.goto(characterUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });
      await new Promise(resolve => setTimeout(resolve, SCRAPER_CONFIG.delays.pageLoad));

      // Extract character data using improved selectors based on actual site structure
      const characterData = (await this.page.evaluate(`(() => {
        function getText(sel) {
          const el = document.querySelector(sel);
          return el ? el.textContent?.trim() || '' : '';
        }

        const title = getText('h1') || '';
        const subtitle = getText('h2') || '';
        
        // Find the main content area that contains all character data
        let mainContent = document.querySelector('[class*="col-span-full"][class*="xl:col-start-6"]');
        if (!mainContent) {
          mainContent = document.querySelector('[class*="col-span-full"]');
        }
        
        let element = 'Unknown';
        let weaponType = 'Unknown';
        let rarity = 4;
        let region = 'Unknown';
        let constellation = 'Unknown';
        let baseHp = 0;
        let baseAtk = 0;
        let baseDef = 0;
        
        if (mainContent) {
          const fullText = mainContent.textContent || '';
          
          // Parse element and weapon from images
          const elementImg = document.querySelector('img[alt="Avatar Element"]');
          if (elementImg) {
            const src = elementImg.getAttribute('src') || '';
            if (src.includes('Element_Fire') || src.includes('Pyro')) element = 'Pyro';
            else if (src.includes('Element_Water') || src.includes('Hydro')) element = 'Hydro';
            else if (src.includes('Element_Wind') || src.includes('Anemo')) element = 'Anemo';
            else if (src.includes('Element_Electric') || src.includes('Electro')) element = 'Electro';
            else if (src.includes('Element_Grass') || src.includes('Dendro')) element = 'Dendro';
            else if (src.includes('Element_Ice') || src.includes('Cryo')) element = 'Cryo';
            else if (src.includes('Element_Rock') || src.includes('Geo')) element = 'Geo';
          }
          
          // Parse weapon type from images
          const weaponImg = document.querySelector('img[alt*="Weapon Type"]');
          if (weaponImg) {
            const src = weaponImg.getAttribute('src') || '';
            const alt = weaponImg.getAttribute('alt') || '';
            
            if (src.includes('Sword') || alt.includes('SWORD')) weaponType = 'Sword';
            else if (src.includes('Claymore') || alt.includes('CLAYMORE')) weaponType = 'Claymore';
            else if (src.includes('Polearm') || alt.includes('POLEARM') || src.includes('Pole')) weaponType = 'Polearm';
            else if (src.includes('Bow') || alt.includes('BOW')) weaponType = 'Bow';
            else if (src.includes('Catalyst') || alt.includes('CATALYST')) weaponType = 'Catalyst';
          }
          
          // Parse rarity from character rarity indicators (looking for 5-star pattern)
          // Count star-like SVG elements or look for rarity in character data
          const starSvgs = document.querySelectorAll('svg path[d*="12"]'); // Star path pattern
          if (starSvgs.length >= 5) {
            rarity = 5;
          } else if (starSvgs.length >= 4) {
            rarity = 4;
          }
          
          // Alternative: look for rarity in text or specific patterns
          if (fullText.includes('5') && fullText.includes('星')) rarity = 5;
          else if (fullText.includes('4') && fullText.includes('星')) rarity = 4;
          
          // Parse region/nation
          const regionPatterns = [
            /所属[\\s\\S]*?(モンド|璃月|稲妻|スメール|フォンテーヌ|ナタ|スネージナヤ|宇宙の劫災|ナタン|その他)/,
            /(Mondstadt|Liyue|Inazuma|Sumeru|Fontaine|Natlan|Snezhnaya|Abyss)/i
          ];
          
          for (const pattern of regionPatterns) {
            const match = fullText.match(pattern);
            if (match) {
              const regionText = match[1];
              const regionMap = {
                'モンド': 'Mondstadt', '璃月': 'Liyue', '稲妻': 'Inazuma',
                'スメール': 'Sumeru', 'フォンテーヌ': 'Fontaine', 'ナタ': 'Natlan',
                'ナタン': 'Natlan', 'スネージナヤ': 'Snezhnaya', '宇宙の劫災': 'Abyss',
                'その他': 'Other'
              };
              region = regionMap[regionText] || regionText;
              break;
            }
          }
          
          // Parse constellation
          const constellationMatch = fullText.match(/命ノ星座[\\s\\S]*?([^\\s]+座)/);
          if (constellationMatch) {
            constellation = constellationMatch[1];
          }
          
          // Parse base stats
          const hpMatch = fullText.match(/基礎HP[\\s\\S]*?(\\d+)/);
          if (hpMatch) baseHp = parseInt(hpMatch[1]);
          
          const atkMatch = fullText.match(/基礎攻撃力[\\s\\S]*?(\\d+)/);
          if (atkMatch) baseAtk = parseInt(atkMatch[1]);
          
          const defMatch = fullText.match(/基礎防御力[\\s\\S]*?(\\d+)/);
          if (defMatch) baseDef = parseInt(defMatch[1]);
        }
        
        return {
          name: title,
          nameJa: subtitle,
          element: element,
          weaponType: weaponType,
          rarity: rarity,
          region: region,
          constellation: constellation,
          description: '',
          baseHp: baseHp,
          baseAtk: baseAtk,
          baseDef: baseDef,
          bonusStatName: 'Unknown',
          bonusStatValue: '0%',
        };
      })()`)) as any;

      // Map the scraped data to our Character interface
      const character: Character = {
        id: characterId,
        name: characterData.name,
        nameJa: characterData.nameJa,
        element: characterData.element as Character['element'],
        weaponType: characterData.weaponType as Character['weaponType'],
        rarity: (characterData.rarity as 4 | 5) || 4,
        region: characterData.region as Character['region'],
        constellation: characterData.constellation,
        description: characterData.description,
        profile: {
          baseHp: characterData.baseHp,
          baseAtk: characterData.baseAtk,
          baseDef: characterData.baseDef,
          bonusStat: {
            name: characterData.bonusStatName,
            value: characterData.bonusStatValue,
          },
        },
      };

      Logger.info(`Successfully scraped character: ${characterId}`);
      return character;
    } catch (error) {
      Logger.error(`Failed to scrape character: ${characterId}`, error as Error);
      return null;
    }
  }

  async scrapeAllCharacters(): Promise<CharacterList> {
    const characterIds = await this.scrapeCharacterList();
    const characters: Character[] = [];

    for (const characterId of characterIds) {
      try {
        const character = await this.scrapeCharacter(characterId);
        if (character) {
          characters.push(character);
        }

        // Delay between requests
        await new Promise(resolve => setTimeout(resolve, SCRAPER_CONFIG.delays.betweenRequests));
      } catch (error) {
        Logger.error(`Failed to scrape character ${characterId}`, error as Error);
      }
    }

    const characterList: CharacterList = {
      characters,
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
    };

    Logger.info(`Successfully scraped ${characters.length} characters`);
    return characterList;
  }

  async saveCharacterData(characterList: CharacterList): Promise<void> {
    // Save main character list
    await FileSystem.writeJson(OUTPUT_PATHS.charactersJson, characterList);

    // Save API index
    const apiIndex = {
      characters: characterList.characters.map(char => ({
        id: char.id,
        name: char.name,
        nameJa: char.nameJa,
        element: char.element,
        weaponType: char.weaponType,
        rarity: char.rarity,
      })),
      lastUpdated: characterList.lastUpdated,
    };
    await FileSystem.writeJson(OUTPUT_PATHS.apiIndex, apiIndex);

    // Save individual character files
    for (const character of characterList.characters) {
      const characterPath = `${OUTPUT_PATHS.apiCharacters}/${character.id}.json`;
      await FileSystem.writeJson(characterPath, character);
    }

    Logger.info('Character data saved successfully');
  }
}
