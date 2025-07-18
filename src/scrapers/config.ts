export const SCRAPER_CONFIG = {
  baseUrl: 'https://gi.yatta.moe/jp/archive/avatar',
  selectors: {
    // Updated selectors based on new site structure
    characterLinks: 'a[href*="/jp/archive/avatar/"]',
    releasedFilter: 'select.outline-none.mt-4', // The last select with "有効/無効" options
    mainContent: '[class*="grid"], [class*="flex"]',
    characterCard: '.inline-block',
    // Character page selectors (to be updated after testing)
    characterName: 'h1, [class*="title"], [class*="name"]',
    characterNameJa: '[class*="japanese"], [class*="ja"]',
    characterElement: '[class*="element"]',
    characterWeapon: '[class*="weapon"]',
    characterRarity: '[class*="rarity"], [class*="star"]',
    profileData: '[class*="profile"], [class*="stat"]',
    talentData: '[class*="talent"], [class*="skill"]',
    constellationData: '[class*="constellation"]',
    ascensionData: '[class*="ascension"]',
  },
  browser: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--memory-pressure-off',
      '--max_old_space_size=4096',
    ] as string[],
  },
  delays: {
    pageLoad: 5000, // Increased for SPA loading
    betweenRequests: 2000, // Increased to be respectful
    afterSelect: 3000, // Increased for dynamic content
    jsWait: 2000, // Additional wait for JavaScript
  },
  retries: {
    maxRetries: 3,
    retryDelay: 5000,
  },
} as const;

export const OUTPUT_PATHS = {
  data: './data',
  api: './api',
  charactersJson: './data/characters.json',
  apiIndex: './api/index.json',
  apiCharacters: './api/characters',
} as const;
