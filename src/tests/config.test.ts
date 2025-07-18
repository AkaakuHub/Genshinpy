import { describe, it, expect } from 'vitest';
import { SCRAPER_CONFIG, OUTPUT_PATHS } from '../scrapers/config.js';

describe('Configuration Tests', () => {
  it('should have valid base URL', () => {
    expect(SCRAPER_CONFIG.baseUrl).toBe('https://gi.yatta.moe/jp/archive/avatar');
    expect(SCRAPER_CONFIG.baseUrl).toMatch(/^https:\/\//);
  });

  it('should have reasonable delay values', () => {
    expect(SCRAPER_CONFIG.delays.pageLoad).toBeGreaterThan(0);
    expect(SCRAPER_CONFIG.delays.betweenRequests).toBeGreaterThan(0);
    expect(SCRAPER_CONFIG.delays.afterSelect).toBeGreaterThan(0);
    expect(SCRAPER_CONFIG.delays.jsWait).toBeGreaterThan(0);

    // Should be reasonable values (not too fast to avoid being blocked)
    expect(SCRAPER_CONFIG.delays.pageLoad).toBeGreaterThanOrEqual(3000);
    expect(SCRAPER_CONFIG.delays.betweenRequests).toBeGreaterThanOrEqual(1000);
  });

  it('should have valid browser configuration', () => {
    expect(SCRAPER_CONFIG.browser.headless).toBe(true);
    expect(Array.isArray(SCRAPER_CONFIG.browser.args)).toBe(true);
    expect(SCRAPER_CONFIG.browser.args.length).toBeGreaterThan(0);

    // Should include security flags
    expect(SCRAPER_CONFIG.browser.args).toContain('--no-sandbox');
    expect(SCRAPER_CONFIG.browser.args).toContain('--disable-setuid-sandbox');
  });

  it('should have valid selectors', () => {
    expect(SCRAPER_CONFIG.selectors.characterLinks).toBe('a[href*="/jp/archive/avatar/"]');
    expect(SCRAPER_CONFIG.selectors.characterLinks).toMatch(/^[a-zA-Z]/);

    // Test CSS selector syntax validation (without DOM)
    const selector = SCRAPER_CONFIG.selectors.characterLinks;
    expect(selector).toMatch(/^[a-zA-Z\[\]="':*\/\-\.#]+$/);
    expect(selector).toContain('a[href*=');
  });

  it('should have valid output paths', () => {
    expect(OUTPUT_PATHS.data).toBe('./data');
    expect(OUTPUT_PATHS.api).toBe('./api');
    expect(OUTPUT_PATHS.charactersJson).toBe('./data/characters.json');
    expect(OUTPUT_PATHS.apiIndex).toBe('./api/index.json');
    expect(OUTPUT_PATHS.apiCharacters).toBe('./api/characters');

    // Should be relative paths
    expect(OUTPUT_PATHS.data).toMatch(/^\.\/[^\/]/);
    expect(OUTPUT_PATHS.api).toMatch(/^\.\/[^\/]/);
  });

  it('should have valid retry configuration', () => {
    expect(SCRAPER_CONFIG.retries.maxRetries).toBeGreaterThan(0);
    expect(SCRAPER_CONFIG.retries.retryDelay).toBeGreaterThan(0);
    expect(SCRAPER_CONFIG.retries.maxRetries).toBeLessThanOrEqual(5);
  });
});
