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
    await this.page.goto(SCRAPER_CONFIG.baseUrl, { waitUntil: 'networkidle2' });

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
      await this.page.goto(characterUrl, { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, SCRAPER_CONFIG.delays.pageLoad));

      // Extract character data using string evaluation to avoid TypeScript conflicts
      const characterData = (await this.page.evaluate(`(() => {
        function getText(sel) {
          const el = document.querySelector(sel);
          return el ? el.textContent?.trim() || '' : '';
        }

        const title = getText('h1') || getText('.title') || getText('[class*="title"]') || '';
        const subtitle = getText('h2') || getText('.subtitle') || getText('[class*="subtitle"]') || '';
        
        const starElements = document.querySelectorAll('[class*="star"]');
        const rarityNum = starElements.length || 4;
        
        return {
          name: title,
          nameJa: subtitle,
          element: getText('[class*="element"]') || 'Unknown',
          weaponType: getText('[class*="weapon"]') || 'Unknown',
          rarity: rarityNum,
          region: getText('[class*="region"]') || 'Unknown',
          constellation: getText('[class*="constellation"]') || 'Unknown',
          description: getText('[class*="description"]') || getText('p') || '',
          baseHp: 0,
          baseAtk: 0,
          baseDef: 0,
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
