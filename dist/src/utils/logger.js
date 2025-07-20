export class Logger {
    static info(message) {
        console.log(`[${new Date().toISOString()}] [INFO] ${message}`);
    }
    static error(message, error) {
        console.error(`[${new Date().toISOString()}] [ERROR] ${message}`);
        if (error) {
            console.error(error);
        }
    }
    static warn(message) {
        console.warn(`[${new Date().toISOString()}] [WARN] ${message}`);
    }
}
//# sourceMappingURL=logger.js.map