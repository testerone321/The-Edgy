import fs from 'fs';
import path from 'path';

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    ERROR = 'ERROR'
}

interface LoggerConfig {
    enableDebug: boolean;
    logToFile: boolean;
    logFilePath?: string;
}

class Logger {
    private config: LoggerConfig;
    private logStream?: fs.WriteStream;

    constructor() {
        const enableDebug = process.env.NODE_ENV !== 'production' || process.env.DEBUG_MODE === 'true';

        // Check if file logging is enabled
        const logToFile = process.env.LOG_TO_FILE === 'true';
        const logFilePath = process.env.LOG_FILE_PATH || path.join(process.cwd(), 'logs', 'app.log');

        this.config = {
            enableDebug,
            logToFile,
            logFilePath
        };

        console.log(`Logger initialized with config: ${JSON.stringify(this.config)}`);

        // Initialize file logging if enabled
        if (this.config.logToFile && this.config.logFilePath) {
            this.initFileLogging(this.config.logFilePath);
        }
    }

    private initFileLogging(logFilePath: string): void {
        try {
            const logDir = path.dirname(logFilePath);

            // Create logs directory if it doesn't exist
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }

            // Create write stream for logging
            this.logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

            this.info('File logging initialized', { logFilePath });
        } catch (error) {
            console.error('Failed to initialize file logging:', error);
        }
    }

    private getTimestamp(): string {
        return new Date().toISOString();
    }

    private formatMessage(level: LogLevel, message: string, meta?: any): string {
        const timestamp = this.getTimestamp();
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level}] ${message}${metaStr}`;
    }

    private writeLog(level: LogLevel, message: string, meta?: any): void {
        const formattedMessage = this.formatMessage(level, message, meta);

        // Write to file if enabled
        if (this.config.logToFile && this.logStream) {
            this.logStream.write(formattedMessage + '\n');
        }
    }

    public debug(message: string, meta?: any): void {
        if (!this.config.enableDebug) {
            return;
        }

        const formattedMessage = this.formatMessage(LogLevel.DEBUG, message, meta);
        this.writeLog(LogLevel.DEBUG, message, meta);
        console.log(formattedMessage);
    }

    public info(message: string, meta?: any): void {
        const formattedMessage = this.formatMessage(LogLevel.INFO, message, meta);
        this.writeLog(LogLevel.INFO, message, meta);
        console.log(formattedMessage);
    }

    public error(message: string, error?: any): void {
        const meta = error instanceof Error
            ? { message: error.message, stack: error.stack }
            : error;

        const formattedMessage = this.formatMessage(LogLevel.ERROR, message, meta);
        this.writeLog(LogLevel.ERROR, message, meta);
        console.error(formattedMessage);
    }

    public close(): void {
        if (this.logStream) {
            this.logStream.end();
        }
    }
}

// Export singleton instance
export const logger = new Logger();

// Handle graceful shutdown
process.on('exit', () => {
    logger.close();
});

process.on('SIGINT', () => {
    logger.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.close();
    process.exit(0);
});
