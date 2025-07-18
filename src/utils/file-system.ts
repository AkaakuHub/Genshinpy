import { promises as fs } from 'fs';
import { dirname } from 'path';
import { Logger } from './logger.js';

export class FileSystem {
  static async ensureDir(filePath: string): Promise<void> {
    const dir = dirname(filePath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      Logger.error(`Failed to create directory: ${dir}`, error as Error);
      throw error;
    }
  }

  static async writeJson<T>(filePath: string, data: T): Promise<void> {
    try {
      await this.ensureDir(filePath);
      const jsonString = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, jsonString, 'utf-8');
      Logger.info(`Successfully wrote JSON to: ${filePath}`);
    } catch (error) {
      Logger.error(`Failed to write JSON to: ${filePath}`, error as Error);
      throw error;
    }
  }

  static async readJson<T>(filePath: string): Promise<T> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as T;
    } catch (error) {
      Logger.error(`Failed to read JSON from: ${filePath}`, error as Error);
      throw error;
    }
  }

  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async writeText(filePath: string, content: string): Promise<void> {
    try {
      await this.ensureDir(filePath);
      await fs.writeFile(filePath, content, 'utf-8');
      Logger.info(`Successfully wrote text to: ${filePath}`);
    } catch (error) {
      Logger.error(`Failed to write text to: ${filePath}`, error as Error);
      throw error;
    }
  }
}
