import { Logger } from './utils/logger.js';
import { FileSystem } from './utils/file-system.js';
import { OUTPUT_PATHS } from './scrapers/config.js';
import type { CharacterList, Character, ApiResponse } from './types/character.js';

export async function getCharacterList(): Promise<CharacterList | null> {
  try {
    const exists = await FileSystem.fileExists(OUTPUT_PATHS.charactersJson);
    if (!exists) {
      Logger.warn('Character data file not found. Run scraper first.');
      return null;
    }

    const characterList = await FileSystem.readJson<CharacterList>(OUTPUT_PATHS.charactersJson);
    return characterList;
  } catch (error) {
    Logger.error('Failed to load character data', error as Error);
    return null;
  }
}

export async function getCharacterById(id: string): Promise<Character | null> {
  try {
    const characterPath = `${OUTPUT_PATHS.apiCharacters}/${id}.json`;
    const exists = await FileSystem.fileExists(characterPath);
    if (!exists) {
      Logger.warn(`Character with ID ${id} not found`);
      return null;
    }

    const character = await FileSystem.readJson<Character>(characterPath);
    return character;
  } catch (error) {
    Logger.error(`Failed to load character ${id}`, error as Error);
    return null;
  }
}

export function createApiResponse<T>(data: T, error?: string): ApiResponse<T> {
  return {
    data,
    success: error === undefined,
    timestamp: new Date().toISOString(),
    ...(error && { error }),
  };
}

export async function main(): Promise<void> {
  Logger.info('Genshin API Server started');

  const characterList = await getCharacterList();
  if (characterList) {
    Logger.info(`Loaded ${characterList.characters.length} characters`);
    Logger.info(`Last updated: ${characterList.lastUpdated}`);
  } else {
    Logger.warn('No character data available');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    Logger.error('Unhandled error in main process', error as Error);
    process.exit(1);
  });
}
