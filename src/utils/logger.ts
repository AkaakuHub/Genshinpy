export class Logger {
  static info(message: string): void {
    console.log(`[${new Date().toISOString()}] [INFO] ${message}`);
  }

  static error(message: string, error?: Error): void {
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`);
    if (error) {
      console.error(error);
    }
  }

  static warn(message: string): void {
    console.warn(`[${new Date().toISOString()}] [WARN] ${message}`);
  }
}
