import { CharacterScraper } from './src/scrapers/character-scraper.js';
import { Logger } from './src/utils/logger.js';
import { FileSystem } from './src/utils/file-system.js';
import { OUTPUT_PATHS } from './src/scrapers/config.js';
import type { CharacterList } from './src/types/character.js';

async function manualScrapingTask(): Promise<void> {
  const scraper = new CharacterScraper();

  // Get environment variables
  const characterLimit = parseInt(process.env.CHARACTER_LIMIT || '0');
  const forceUpdate = process.env.FORCE_UPDATE === 'true';

  try {
    Logger.info('🚀 Starting manual character data scraping...');
    Logger.info(`📊 Character limit: ${characterLimit === 0 ? 'unlimited' : characterLimit}`);
    Logger.info(`🔄 Force update: ${forceUpdate ? 'enabled' : 'disabled'}`);

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

    // Apply character limit if specified
    const charactersToScrape =
      characterLimit > 0 ? characterNames.slice(0, characterLimit) : characterNames;

    Logger.info(`🎯 Will scrape ${charactersToScrape.length} characters`);

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

    // Scrape characters
    Logger.info('👥 Starting character data scraping...');
    const characters = [];
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const [index, characterName] of charactersToScrape.entries()) {
      try {
        Logger.info(`🔍 [${index + 1}/${charactersToScrape.length}] Scraping: ${characterName}`);

        // Check if character already exists (unless force update)
        if (!forceUpdate && existingData) {
          const existing = existingData.characters.find(char => char.id === characterName);
          if (existing) {
            characters.push(existing);
            skippedCount++;
            Logger.info(`⏭️  Skipped (already exists): ${characterName}`);
            continue;
          }
        }

        const character = await scraper.scrapeCharacter(characterName);

        if (character) {
          characters.push(character);
          successCount++;
          Logger.info(`✅ Successfully scraped: ${character.name} (${character.nameJa})`);
        } else {
          errorCount++;
          Logger.warn(`❌ Failed to scrape: ${characterName}`);
        }

        // Respectful delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        errorCount++;
        Logger.error(`❌ Error scraping ${characterName}:`, error as Error);
      }
    }

    // Add any remaining characters from existing data (if not doing full scrape)
    if (existingData && characterLimit > 0) {
      const existingCharacterIds = new Set(characters.map(char => char.id));
      const remainingCharacters = existingData.characters.filter(
        char => !existingCharacterIds.has(char.id)
      );

      if (remainingCharacters.length > 0) {
        characters.push(...remainingCharacters);
        Logger.info(`📂 Added ${remainingCharacters.length} existing characters`);
      }
    }

    // Create character list
    const characterList: CharacterList = {
      characters: characters.sort((a, b) => a.name.localeCompare(b.name)),
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
    };

    // Save all data
    Logger.info('💾 Saving character data...');
    await scraper.saveCharacterData(characterList);

    // Summary
    Logger.info('📈 Manual scraping completed successfully!');
    Logger.info(`✅ Total characters: ${characterList.characters.length}`);
    Logger.info(`✅ Successfully scraped: ${successCount}`);
    Logger.info(`⏭️  Skipped (existing): ${skippedCount}`);
    Logger.info(`⚠️  Errors: ${errorCount}`);

    if (charactersToScrape.length > 0) {
      Logger.info(
        `📊 Success rate: ${((successCount / charactersToScrape.length) * 100).toFixed(1)}%`
      );
    }

    // Compare with existing data
    if (existingData) {
      const newCharacters = characters.filter(
        char => !existingData.characters.some(existing => existing.id === char.id)
      );

      if (newCharacters.length > 0) {
        Logger.info(`🆕 New characters found: ${newCharacters.length}`);
        newCharacters
          .slice(0, 5)
          .forEach(char =>
            Logger.info(`  - ${char.name} (${char.nameJa}) - ${char.element} ${char.weaponType}`)
          );
        if (newCharacters.length > 5) {
          Logger.info(`  ... and ${newCharacters.length - 5} more`);
        }
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
        `Successfully processed ${characters.length} characters`,
        `New scrapes: ${successCount}`,
        `Skipped: ${skippedCount}`,
        `Errors: ${errorCount}`,
        `Last updated: ${characterList.lastUpdated}`,
      ];

      console.log(`::notice::Manual scraping completed - ${summary.join(', ')}`);
    }
  } catch (error) {
    Logger.error('❌ Manual scraping failed:', error as Error);

    if (process.env.GITHUB_ACTIONS) {
      console.log(`::error::Manual scraping failed - ${(error as Error).message}`);
    }

    throw error;
  } finally {
    await scraper.cleanup();
    Logger.info('🧹 Cleanup completed');
  }
}

// Error handling and retry logic
async function runWithRetry(maxRetries: number = 2): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await manualScrapingTask();
      return; // Success
    } catch (error) {
      lastError = error as Error;
      Logger.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, lastError);

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Exponential backoff, max 30 seconds
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
      Logger.info('✅ Manual scraping task completed successfully');
      process.exit(0);
    })
    .catch((error: Error) => {
      Logger.error('❌ Manual scraping task failed:', error);
      process.exit(1);
    });
}

export { manualScrapingTask, runWithRetry };
