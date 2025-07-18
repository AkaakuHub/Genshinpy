import puppeteer, { type Browser, type Page } from 'puppeteer';
import { Logger } from '../utils/logger.js';
import { SCRAPER_CONFIG } from './config.js';
import type { Character } from '../types/character.js';

export class AdaptiveScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private detectedSelectors: Record<string, string> = {};

  async initialize(): Promise<void> {
    Logger.info('Initializing adaptive scraper...');
    this.browser = await puppeteer.launch(SCRAPER_CONFIG.browser);
    this.page = await this.browser.newPage();

    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );

    // Enable JavaScript
    await this.page.setJavaScriptEnabled(true);

    Logger.info('Adaptive scraper initialized');
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async autoDetectSelectors(): Promise<Record<string, string>> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    Logger.info('Auto-detecting selectors...');

    // Go to character list page
    await this.page.goto(SCRAPER_CONFIG.baseUrl, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, SCRAPER_CONFIG.delays.pageLoad));

    const detectedSelectors = await this.page.evaluate(() => {
      const selectors: Record<string, string> = {};

      // Detect character links
      const characterLinks = document.querySelectorAll('a[href*="/jp/archive/avatar/"]');
      if (characterLinks.length > 0) {
        selectors.characterLinks = 'a[href*="/jp/archive/avatar/"]';
      }

      // Detect filter selectors
      const selects = document.querySelectorAll('select');
      Array.from(selects).forEach((select, index) => {
        const options = Array.from(select.options).map((opt: HTMLOptionElement) => opt.value);

        if (options.includes('on') && options.includes('off')) {
          selectors.releasedFilter = `select:nth-of-type(${index + 1})`;
        } else if (options.includes('male') && options.includes('female')) {
          selectors.genderFilter = `select:nth-of-type(${index + 1})`;
        }
      });

      return selectors;
    });

    // Test individual character page
    const sampleCharacter = await this.getSampleCharacter();
    if (sampleCharacter) {
      const characterSelectors = await this.detectCharacterPageSelectors(sampleCharacter);
      Object.assign(detectedSelectors, characterSelectors);
    }

    this.detectedSelectors = detectedSelectors;
    Logger.info(`Auto-detected ${Object.keys(detectedSelectors).length} selectors`);

    return detectedSelectors;
  }

  private async getSampleCharacter(): Promise<string | null> {
    if (!this.page) return null;

    const characterName = await this.page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/jp/archive/avatar/"]');
      for (const link of Array.from(links)) {
        const href = link.getAttribute('href');
        if (href) {
          const match = href.match(/\/jp\/archive\/avatar\/\d+\/(.+)/);
          if (match) {
            return match[1];
          }
        }
      }
      return null;
    });

    return characterName || null;
  }

  private async detectCharacterPageSelectors(
    characterName: string
  ): Promise<Record<string, string>> {
    if (!this.page) {
      return {};
    }

    const characterUrl = `${SCRAPER_CONFIG.baseUrl}/${characterName}`;
    Logger.info(`Detecting selectors on character page: ${characterName}`);

    try {
      await this.page.goto(characterUrl, { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, SCRAPER_CONFIG.delays.pageLoad));

      const selectors = await this.page.evaluate(() => {
        const result: Record<string, string> = {};

        // Test various selector patterns for character name
        const nameSelectors = [
          'h1',
          'h2',
          'h3',
          '[class*="name"]',
          '[class*="title"]',
          '[class*="character"]',
          '[class*="avatar"]',
        ];

        for (const selector of nameSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent?.trim()) {
            result.characterName = selector;
            break;
          }
        }

        // Test for element information
        const elementSelectors = [
          '[class*="element"]',
          '[class*="type"]',
          '[data-element]',
          '[title*="element"]',
        ];

        for (const selector of elementSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            result.characterElement = selector;
            break;
          }
        }

        // Test for weapon information
        const weaponSelectors = [
          '[class*="weapon"]',
          '[data-weapon]',
          '[class*="sword"]',
          '[class*="bow"]',
          '[class*="catalyst"]',
        ];

        for (const selector of weaponSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            result.characterWeapon = selector;
            break;
          }
        }

        return result;
      });

      return selectors;
    } catch (error) {
      Logger.error(`Failed to detect selectors for character: ${characterName}`, error as Error);
      return {};
    }
  }

  async testSelector(selector: string, expectedMinElements = 1): Promise<boolean> {
    if (!this.page) {
      return false;
    }

    try {
      const elements = await this.page.$$(selector);
      return elements.length >= expectedMinElements;
    } catch (error) {
      Logger.error(`Failed to test selector: ${selector}`, error as Error);
      return false;
    }
  }

  async adaptiveExtract(characterName: string): Promise<Partial<Character> | null> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const characterUrl = `${SCRAPER_CONFIG.baseUrl}/${characterName}`;
    Logger.info(`Adaptive extraction for: ${characterName}`);

    try {
      await this.page.goto(characterUrl, { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, SCRAPER_CONFIG.delays.pageLoad));

      // Use detected selectors or fallback to multiple attempts
      const characterData = await this.page.evaluate((detectedSel: Record<string, string>) => {
        const extractText = (selectors: string[]): string => {
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent?.trim()) {
              return element.textContent.trim();
            }
          }
          return '';
        };

        const nameSelectors = detectedSel.characterName
          ? [detectedSel.characterName]
          : ['h1', 'h2', '[class*="name"]', '[class*="title"]'];

        const elementSelectors = detectedSel.characterElement
          ? [detectedSel.characterElement]
          : ['[class*="element"]', '[class*="type"]', '[data-element]'];

        const weaponSelectors = detectedSel.characterWeapon
          ? [detectedSel.characterWeapon]
          : ['[class*="weapon"]', '[data-weapon]'];

        return {
          name: extractText(nameSelectors),
          element: extractText(elementSelectors),
          weapon: extractText(weaponSelectors),
          pageTitle: document.title,
          url: window.location.href,
        };
      }, this.detectedSelectors);

      if (characterData.name) {
        Logger.info(`Successfully extracted data for: ${characterData.name}`);
        return {
          id: characterName,
          name: characterData.name,
          nameJa: characterData.name, // Use same for now
          element: characterData.element as any,
          weaponType: characterData.weapon as any,
          rarity: 5, // Default
          region: 'Unknown' as any,
          constellation: '',
        };
      }

      return null;
    } catch (error) {
      Logger.error(`Failed adaptive extraction for: ${characterName}`, error as Error);
      return null;
    }
  }

  getDetectedSelectors(): Record<string, string> {
    return { ...this.detectedSelectors };
  }
}
