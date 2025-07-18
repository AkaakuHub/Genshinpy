import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '../utils/logger.js';
import { FileSystem } from '../utils/file-system.js';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('Logger Tests', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    vi.stubGlobal('console', consoleSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should format log messages correctly', () => {
    Logger.info('Test message');
    expect(consoleSpy.log).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Test message/)
    );
  });

  it('should log warnings', () => {
    Logger.warn('Warning message');
    expect(consoleSpy.warn).toHaveBeenCalledWith(
      expect.stringMatching(
        /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[WARN\] Warning message/
      )
    );
  });

  it('should log errors with stack trace', () => {
    const testError = new Error('Test error');
    Logger.error('Error occurred', testError);

    expect(consoleSpy.error).toHaveBeenCalledWith(
      expect.stringMatching(
        /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[ERROR\] Error occurred/
      )
    );
    expect(consoleSpy.error).toHaveBeenCalledWith(testError);
  });
});

describe('FileSystem Tests', () => {
  let tempDir: string;
  let testFile: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'genshin-test-'));
    testFile = join(tempDir, 'test.json');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should write and read JSON files', async () => {
    const testData = { name: 'Test', value: 42 };

    await FileSystem.writeJson(testFile, testData);
    const readData = await FileSystem.readJson(testFile);

    expect(readData).toEqual(testData);
  });

  it('should check file existence', async () => {
    expect(await FileSystem.fileExists(testFile)).toBe(false);

    await FileSystem.writeJson(testFile, { test: true });
    expect(await FileSystem.fileExists(testFile)).toBe(true);
  });

  it('should create directories recursively', async () => {
    const nestedFile = join(tempDir, 'nested', 'deep', 'file.json');
    const testData = { nested: true };

    await FileSystem.writeJson(nestedFile, testData);
    const readData = await FileSystem.readJson(nestedFile);

    expect(readData).toEqual(testData);
  });

  it('should handle file write errors gracefully', async () => {
    const invalidPath = '/invalid/path/file.json';

    await expect(FileSystem.writeJson(invalidPath, { test: true })).rejects.toThrow();
  });
});
