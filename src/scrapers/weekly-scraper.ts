import { CharacterScraper } from './character-scraper.js';
import { Logger } from '../utils/logger.js';
import { FileSystem } from '../utils/file-system.js';
import { OUTPUT_PATHS } from './config.js';
import type { CharacterList } from '../types/character.js';

async function weeklyScrapingTask(): Promise<void> {
  const scraper = new CharacterScraper();

  try {
    Logger.info('🚀 Starting weekly character data scraping...');

    // Initialize scraper
    await scraper.initialize();
    Logger.info('✅ Browser initialized successfully');

    // Get character list first
    Logger.info('📋 Fetching character list...');
    const characterNames = await scraper.scrapeCharacterList();
    Logger.info(`✅ Found ${characterNames.length} characters`);

    if (characterNames.length === 0) {
      throw new Error('No characters found - this might indicate a site structure change');
    }

    // Load existing data to compare
    let existingData: CharacterList | null = null;
    try {
      const exists = await FileSystem.fileExists(OUTPUT_PATHS.charactersJson);
      if (exists) {
        existingData = await FileSystem.readJson<CharacterList>(OUTPUT_PATHS.charactersJson);
        Logger.info(`📊 Existing data has ${existingData.characters.length} characters`);
      }
    } catch {
      Logger.warn('Could not load existing data, will create new dataset');
    }

    // Scrape all characters
    Logger.info('👥 Starting character data scraping...');
    const characters = [];
    let successCount = 0;
    let errorCount = 0;

    for (const characterName of characterNames) {
      try {
        Logger.info(`🔍 Scraping: ${characterName}`);
        const character = await scraper.scrapeCharacter(characterName);

        if (character) {
          characters.push(character);
          successCount++;
          Logger.info(`✅ Successfully scraped: ${character.name}`);
        } else {
          errorCount++;
          Logger.warn(`❌ Failed to scrape: ${characterName}`);
        }

        // Respectful delay between requests
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        errorCount++;
        Logger.error(`❌ Error scraping ${characterName}:`, error as Error);
      }
    }

    // Create character list
    const characterList: CharacterList = {
      characters,
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
    };

    // Save all data
    Logger.info('💾 Saving character data...');
    await scraper.saveCharacterData(characterList);

    // Summary
    Logger.info('📈 Weekly scraping completed successfully!');
    Logger.info(`✅ Total characters: ${characterList.characters.length}`);
    Logger.info(`✅ Success rate: ${((successCount / characterNames.length) * 100).toFixed(1)}%`);
    Logger.info(`⚠️  Errors: ${errorCount}`);

    // Compare with existing data
    if (existingData) {
      const newCharacters = characters.filter(
        char => !existingData.characters.some(existing => existing.id === char.id)
      );

      if (newCharacters.length > 0) {
        Logger.info(`🆕 New characters found: ${newCharacters.length}`);
        newCharacters.forEach(char => Logger.info(`  - ${char.name} (${char.nameJa})`));
      }

      const characterCountDiff = characters.length - existingData.characters.length;
      if (characterCountDiff > 0) {
        Logger.info(`📊 Character count increased by ${characterCountDiff}`);
      } else if (characterCountDiff < 0) {
        Logger.warn(`📊 Character count decreased by ${Math.abs(characterCountDiff)}`);
      }
    }

    // Create GitHub Actions summary
    if (process.env.GITHUB_ACTIONS) {
      const summary = [
        `Successfully scraped ${characters.length} characters`,
        `Success rate: ${((successCount / characterNames.length) * 100).toFixed(1)}%`,
        `Errors: ${errorCount}`,
        `Last updated: ${characterList.lastUpdated}`,
      ];

      console.log(`::notice::Weekly scraping completed - ${summary.join(', ')}`);
    }
  } catch (error) {
    Logger.error('❌ Weekly scraping failed:', error as Error);

    if (process.env.GITHUB_ACTIONS) {
      console.log(`::error::Weekly scraping failed - ${(error as Error).message}`);
    }

    throw error;
  } finally {
    await scraper.cleanup();
    Logger.info('🧹 Cleanup completed');
  }
}

// Error handling and retry logic
async function runWithRetry(maxRetries: number = 3): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await weeklyScrapingTask();
      return; // Success
    } catch (error) {
      lastError = error as Error;
      Logger.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, lastError);

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 60000); // Exponential backoff, max 1 minute
        Logger.info(`⏳ Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

// Run the scraping task
if (import.meta.url === `file://${process.argv[1]}`) {
  runWithRetry()
    .then(() => {
      Logger.info('✅ Weekly scraping task completed successfully');
      process.exit(0);
    })
    .catch((error: Error) => {
      Logger.error('❌ Weekly scraping task failed:', error);
      process.exit(1);
    });
}

export { weeklyScrapingTask, runWithRetry };
