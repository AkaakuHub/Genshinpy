import { PureApiScraper } from './pure-api-scraper';
import { Logger } from './src/utils/logger';
import fs from 'fs';
import https from 'https';

/**
 * APIから動的にキャラクターリストを取得（IDとrouteの両方）
 */
async function fetchAllCharacterData(): Promise<Array<{ id: number; route: string }>> {
  return new Promise((resolve, reject) => {
    const url = 'https://gi.yatta.moe/api/v2/jp/avatar?vh=38E6';

    https
      .get(url, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data) as {
              response: number;
              data: {
                items: Record<string, { id: number; route: string; name: string }>;
              };
            };
            if (json.response === 200 && json.data?.items) {
              const characterData = Object.values(json.data.items)
                .filter(char => char.id > 0 && char.route)
                .map(char => ({ id: char.id, route: char.route }));
              Logger.info(`📋 Found ${characterData.length} characters in API`);
              resolve(characterData);
            } else {
              reject(new Error('Invalid API response'));
            }
          } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        });
      })
      .on('error', reject);
  });
}

async function scrapeAllCharacters() {
  Logger.info('🚀 Starting comprehensive character data scraping...');

  // APIから動的にキャラクターデータリストを取得
  let characterDataList: Array<{ id: number; route: string }>;
  try {
    characterDataList = await fetchAllCharacterData();
    Logger.info(`✅ Successfully fetched ${characterDataList.length} character data from API`);
  } catch (error) {
    Logger.error('❌ Failed to fetch character data from API:', error as Error);
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

  for (const characterData of characterDataList) {
    try {
      Logger.info(`🔍 Scraping character ${characterData.id}...`);
      const character = await scraper.scrapeCompleteCharacterByPureApi(
        characterData.id,
        characterData.route
      );

      if (character) {
        results.push(character);

        // 個別ファイルとして保存
        const filename = `${dataDir}/${character.id}.json`;
        fs.writeFileSync(filename, JSON.stringify(character, null, 2));
        Logger.info(`✅ Saved ${character.name} to ${filename}`);
      } else {
        Logger.error(`❌ Failed to scrape character ${characterData.id}`);
        errors.push(characterData.id);
      }

      // API負荷軽減のため1秒待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      Logger.error(`❌ Error scraping character ${characterData.id}:`, error as Error);
      errors.push(characterData.id);
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
    successRate: `${Math.round((results.length / characterDataList.length) * 100)}%`,
    performance: {
      averageTimePerCharacter: '~2 seconds',
      totalExecutionTime: `${characterDataList.length * 2} seconds estimated`,
      memoryUsage: 'Low (No Puppeteer)',
    },
  };

  fs.writeFileSync(`${dataDir}/metadata.json`, JSON.stringify(metadata, null, 2));

  // サマリーログ
  Logger.info('='.repeat(60));
  Logger.info('🎉 SCRAPING COMPLETE!');
  Logger.info(`📊 Successfully scraped: ${results.length}/${characterDataList.length} characters`);
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
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeAllCharacters().catch(console.error);
}

export { scrapeAllCharacters };
