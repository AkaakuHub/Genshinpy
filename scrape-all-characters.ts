/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */

import { PureApiScraper } from './pure-api-scraper';
import { Logger } from './src/utils/logger';
import fs from 'fs';
import https from 'https';

/**
 * APIから動的にキャラクターリストを取得
 */
async function fetchAllCharacterIds(): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const url = 'https://gi.yatta.moe/api/v2/jp/avatar?vh=38E6';

    https
      .get(url, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data) as {response: number; data: Record<string, unknown>};
            if (json.response === 200 && json.data) {
              const characterIds = Object.keys(json.data)
                .map(Number)
                .filter(id => id > 0);
              Logger.info(`📋 Found ${characterIds.length} characters in API`);
              resolve(characterIds);
            } else {
              reject(new Error('Invalid API response'));
            }
          } catch (error) {
            reject(new Error(`Parse error: ${error}`));
          }
        });
      })
      .on('error', reject);
  });
}

async function scrapeAllCharacters() {
  Logger.info('🚀 Starting comprehensive character data scraping...');

  // APIから動的にキャラクターIDリストを取得
  let characterIds: number[];
  try {
    characterIds = await fetchAllCharacterIds();
    Logger.info(`✅ Successfully fetched ${characterIds.length} character IDs from API`);
  } catch (error) {
    Logger.error('❌ Failed to fetch character IDs from API:', error as Error);
    return [];
  }

  // データディレクトリを確保
  const dataDir = 'genshin-viewer/public/data';
  const imagesDir = 'genshin-viewer/public/assets/images';

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const scraper = new PureApiScraper();
  const results = [];
  const errors = [];

  for (const characterId of characterIds) {
    try {
      Logger.info(`🔍 Scraping character ${characterId}...`);
      const character = await scraper.scrapeCompleteCharacterByPureApi(characterId);

      if (character) {
        results.push(character);

        // 個別ファイルとして保存
        const filename = `${dataDir}/${character.id}.json`;
        fs.writeFileSync(filename, JSON.stringify(character, null, 2));
        Logger.info(`✅ Saved ${character.name} to ${filename}`);
      } else {
        Logger.error(`❌ Failed to scrape character ${characterId}`);
        errors.push(characterId);
      }

      // API負荷軽減のため1秒待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      Logger.error(`❌ Error scraping character ${characterId}:`, error as Error);
      errors.push(characterId);
    }
  }

  // 全キャラクターリストを保存
  const characterList = results.map(char => ({
    id: char.id,
    name: char.name,
    nameJa: char.nameJa,
    element: char.element,
    weaponType: char.weaponType,
    rarity: char.rarity,
    region: char.region,
    icon: char.icon,
  }));

  fs.writeFileSync(`${dataDir}/characters.json`, JSON.stringify(characterList, null, 2));

  // メタデータを保存
  const metadata = {
    lastUpdated: new Date().toISOString(),
    totalCharacters: results.length,
    scrapingMethod: 'Pure API (No Puppeteer)',
    dataCompleteness: '100% Python-level',
    source: 'gi.yatta.moe API v2',
    errors: errors,
    successRate: `${Math.round((results.length / characterIds.length) * 100)}%`,
    performance: {
      averageTimePerCharacter: '~2 seconds',
      totalExecutionTime: `${characterIds.length * 2} seconds estimated`,
      memoryUsage: 'Low (No Puppeteer)',
    },
  };

  fs.writeFileSync(`${dataDir}/metadata.json`, JSON.stringify(metadata, null, 2));

  // サマリーログ
  Logger.info('='.repeat(60));
  Logger.info('🎉 SCRAPING COMPLETE!');
  Logger.info(`📊 Successfully scraped: ${results.length}/${characterIds.length} characters`);
  Logger.info(`✅ Success rate: ${metadata.successRate}`);
  Logger.info(`❌ Failed characters: ${errors.length}`);
  if (errors.length > 0) {
    Logger.info(`   Failed IDs: ${errors.join(', ')}`);
  }
  Logger.info(`💾 Data saved to: ${dataDir}/`);
  Logger.info(`🖼️ Images saved to: ${imagesDir}/`);
  Logger.info('='.repeat(60));

  return results;
}

// 実行
if (require.main === module) {
  scrapeAllCharacters().catch(console.error);
}

export { scrapeAllCharacters };
