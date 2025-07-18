import { CharacterScraper } from './src/scrapers/character-scraper.js';
import { Logger } from './src/utils/logger.js';

async function testRealDataScraping() {
  const scraper = new CharacterScraper();

  try {
    console.log('🚀 Starting real data scraping test...');

    // Initialize scraper
    await scraper.initialize();
    Logger.info('✅ Scraper initialized successfully');

    // Test 1: Get character list
    console.log('\n📋 Test 1: Getting character list...');
    const characterList = await scraper.scrapeCharacterList();

    console.log(`✅ Found ${characterList.length} characters`);
    console.log('📝 First 10 characters:');
    characterList.slice(0, 10).forEach((char, index) => {
      console.log(`  ${index + 1}. ${char}`);
    });

    // Test 2: Get specific character data
    console.log('\n👤 Test 2: Getting specific character data...');
    const testCharacters = ['kamisato-ayaka', 'zhongli', 'diluc'].filter(char =>
      characterList.includes(char)
    );

    if (testCharacters.length === 0) {
      console.log('⚠️  None of the test characters found in the list');
      console.log('📝 Available characters (first 20):');
      characterList.slice(0, 20).forEach((char, index) => {
        console.log(`  ${index + 1}. ${char}`);
      });

      // Use first few available characters
      if (characterList.length > 0) {
        const firstChar = characterList[0];
        if (firstChar) {
          testCharacters.push(firstChar);
          console.log(`🎯 Using first available character: ${firstChar}`);
        }

        // Also try the second character if available
        if (characterList.length > 1) {
          const secondChar = characterList[1];
          if (secondChar) {
            testCharacters.push(secondChar);
            console.log(`🎯 Using second available character: ${secondChar}`);
          }
        }
      }
    }

    const characterData = [];
    for (const charName of testCharacters) {
      try {
        console.log(`\n🔍 Scraping character: ${charName}`);
        const character = await scraper.scrapeCharacter(charName);

        if (character) {
          characterData.push(character);
          console.log(`✅ Successfully scraped: ${character.name}`);
          console.log(`   - Name (JP): ${character.nameJa}`);
          console.log(`   - Element: ${character.element}`);
          console.log(`   - Weapon: ${character.weaponType}`);
          console.log(`   - Rarity: ${character.rarity}`);
          console.log(`   - Region: ${character.region}`);

          if (character.profile) {
            console.log(`   - Base HP: ${character.profile.baseHp}`);
            console.log(`   - Base ATK: ${character.profile.baseAtk}`);
            console.log(`   - Base DEF: ${character.profile.baseDef}`);
            console.log(
              `   - Bonus Stat: ${character.profile.bonusStat.name} - ${character.profile.bonusStat.value}`
            );
          }
        } else {
          console.log(`❌ Failed to scrape: ${charName}`);
        }

        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.log(`❌ Error scraping ${charName}:`, error);
      }
    }

    // Test 3: Validate data structure
    console.log('\n🔍 Test 3: Validating data structure...');
    characterData.forEach((char, index) => {
      console.log(`\n📊 Character ${index + 1}: ${char.name}`);

      // Check required fields
      const requiredFields = ['id', 'name', 'nameJa', 'element', 'weaponType', 'rarity', 'region'];
      const missingFields = requiredFields.filter(field => !char[field as keyof typeof char]);

      if (missingFields.length === 0) {
        console.log('✅ All required fields present');
      } else {
        console.log(`❌ Missing fields: ${missingFields.join(', ')}`);
      }

      // Check data types
      if (typeof char.rarity === 'number' && [4, 5].includes(char.rarity)) {
        console.log('✅ Rarity is valid');
      } else {
        console.log(`❌ Invalid rarity: ${char.rarity}`);
      }

      if (char.profile) {
        if (typeof char.profile.baseHp === 'number' && char.profile.baseHp > 0) {
          console.log('✅ Base HP is valid');
        } else {
          console.log(`❌ Invalid base HP: ${char.profile.baseHp}`);
        }
      }
    });

    // Test 4: Summary
    console.log('\n📈 Test Summary:');
    console.log(`Total characters found: ${characterList.length}`);
    console.log(`Characters successfully scraped: ${characterData.length}`);
    console.log(
      `Success rate: ${((characterData.length / testCharacters.length) * 100).toFixed(1)}%`
    );

    if (characterData.length > 0) {
      console.log('✅ Real data scraping test PASSED');
    } else {
      console.log('❌ Real data scraping test FAILED');
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await scraper.cleanup();
    console.log('\n🧹 Cleanup completed');
  }
}

// Run the test
testRealDataScraping().catch(console.error);
