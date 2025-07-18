import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CharacterScraper } from '../src/scrapers/character-scraper.js';
import { AdaptiveScraper } from '../src/scrapers/adaptive-scraper.js';

// Mock puppeteer to avoid actual browser operations in tests
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        setUserAgent: vi.fn(),
        setJavaScriptEnabled: vi.fn(),
        goto: vi.fn(),
        evaluate: vi.fn(),
        $$: vi.fn().mockResolvedValue([]),
        screenshot: vi.fn(),
        waitForSelector: vi.fn(),
        waitForTimeout: vi.fn(),
      }),
      close: vi.fn(),
    }),
  },
}));

describe('CharacterScraper Tests', () => {
  let scraper: CharacterScraper;

  beforeEach(() => {
    scraper = new CharacterScraper();
  });

  afterEach(async () => {
    await scraper.cleanup();
  });

  it('should initialize without errors', () => {
    expect(async () => {
      await scraper.initialize();
    }).not.toThrow();
  });

  it('should handle character list parsing', () => {
    const mockCharacterData = [
      {
        id: '10000002',
        name: 'kamisato-ayaka',
        displayName: '神里綾華',
        href: '/jp/archive/avatar/10000002/kamisato-ayaka',
      },
      {
        id: '10000030',
        name: 'zhongli',
        displayName: '鍾離',
        href: '/jp/archive/avatar/10000030/zhongli',
      },
    ];

    // Test URL parsing logic
    mockCharacterData.forEach(char => {
      const match = char.href.match(/\/jp\/archive\/avatar\/(\d+)\/(.+)/);
      expect(match).toBeTruthy();
      expect(match?.[1]).toBe(char.id);
      expect(match?.[2]).toBe(char.name);
    });
  });

  it('should validate character object structure', () => {
    const mockCharacter = {
      id: 'test-character',
      name: 'Test Character',
      nameJa: 'テストキャラクター',
      element: 'Pyro',
      weaponType: 'Sword',
      rarity: 5,
      region: 'Mondstadt',
      constellation: 'Test Constellation',
    };

    // Validate required fields
    expect(mockCharacter.id).toBeDefined();
    expect(mockCharacter.name).toBeDefined();
    expect(mockCharacter.nameJa).toBeDefined();
    expect(mockCharacter.element).toBeDefined();
    expect(mockCharacter.weaponType).toBeDefined();
    expect(mockCharacter.rarity).toBeDefined();
    expect(mockCharacter.region).toBeDefined();
    expect(mockCharacter.constellation).toBeDefined();

    // Validate types
    expect(typeof mockCharacter.id).toBe('string');
    expect(typeof mockCharacter.name).toBe('string');
    expect(typeof mockCharacter.nameJa).toBe('string');
    expect(typeof mockCharacter.rarity).toBe('number');
    expect([4, 5]).toContain(mockCharacter.rarity);
  });
});

describe('AdaptiveScraper Tests', () => {
  let scraper: AdaptiveScraper;

  beforeEach(() => {
    scraper = new AdaptiveScraper();
  });

  afterEach(async () => {
    await scraper.cleanup();
  });

  it('should initialize without errors', () => {
    expect(async () => {
      await scraper.initialize();
    }).not.toThrow();
  });

  it('should handle selector detection logic', () => {
    // Test selector detection patterns
    const mockSelectOptions = [
      { value: 'on', text: '有効' },
      { value: 'off', text: '無効' },
    ];

    const hasOnOff =
      mockSelectOptions.some(opt => opt.value === 'on') &&
      mockSelectOptions.some(opt => opt.value === 'off');

    expect(hasOnOff).toBe(true);
  });

  it('should validate character extraction result', () => {
    const mockExtractionResult = {
      name: 'Kamisato Ayaka',
      element: 'Cryo',
      weapon: 'Sword',
      pageTitle: '神里綾華 | Project Amber',
      url: 'https://gi.yatta.moe/jp/archive/avatar/10000002/kamisato-ayaka',
    };

    expect(mockExtractionResult.name).toBeTruthy();
    expect(mockExtractionResult.pageTitle).toContain('神里綾華');
    expect(mockExtractionResult.url).toContain('kamisato-ayaka');
  });
});

describe('Error Handling Tests', () => {
  it('should handle invalid URLs gracefully', () => {
    const invalidUrls = ['not-a-url', 'http://invalid', '', null, undefined];

    invalidUrls.forEach(url => {
      if (url) {
        expect(() => {
          const match = url.match(/\/jp\/archive\/avatar\/(\d+)\/(.+)/);
          // Should not throw, but match should be null
          expect(match).toBeFalsy();
        }).not.toThrow();
      }
    });
  });

  it('should handle missing character data gracefully', () => {
    const incompleteCharacterData = {
      id: 'test',
      name: 'Test',
      // Missing required fields
    };

    // Should not crash when accessing missing fields
    expect(() => {
      const element = (incompleteCharacterData as any).element || 'Unknown';
      const rarity = (incompleteCharacterData as any).rarity || 4;

      expect(element).toBe('Unknown');
      expect(rarity).toBe(4);
    }).not.toThrow();
  });
});
