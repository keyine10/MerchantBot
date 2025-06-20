import fs from 'fs';
import path from 'path';

/**
 * Logger utility for writing logs to files and console
 */
class Logger {
  private logDir: string;

  constructor(logDir: string = 'logs') {
    this.logDir = logDir;
    this.ensureLogDirExists();
  }

  private ensureLogDirExists() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatMessage(level: string, message: string, caller?: string): string {
    const timestamp = new Date().toISOString();
    const callerInfo = caller ? ` [${caller}]` : '';
    return `[${timestamp}] [${level.toUpperCase()}]${callerInfo} ${message}`;
  }

  private getCaller(): string {
    try {
      const stack = new Error().stack;
      if (!stack) return 'unknown';
      
      const lines = stack.split('\n');
      // Skip the first 4 lines: Error, getCaller, the log method, and find the actual caller
      for (let i = 4; i < lines.length; i++) {
        const line = lines[i];
        if (line && !line.includes('node_modules') && !line.includes('logger.ts')) {
          // Extract file and function info from stack trace
          const match = line.match(/at (?:(.+?)\s+\()?.*[\/\\]([^\/\\]+):(\d+):\d+/);
          if (match) {
            const [, functionName, fileName, lineNumber] = match;
            const func = functionName && functionName !== 'Object.<anonymous>' ? functionName : 'anonymous';
            return `${fileName}:${lineNumber}:${func}`;
          }
        }
      }
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  private writeToFile(filename: string, message: string) {
    try {
      const logFile = path.join(this.logDir, filename);
      const caller = this.getCaller();
      const formattedMessage = this.formatMessage('INFO', message, caller) + '\n';
      
      fs.appendFileSync(logFile, formattedMessage, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Log a message to both console and file
   */
  log(message: string, filename: string = 'app.log') {
    try {
      const caller = this.getCaller();
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[${caller}] ${message}`);
      }
      this.writeToFile(filename, message);
    } catch (error) {
      console.error('Logger error:', error);
    }
  }

  /**
   * Log an error message to both console and file
   */
  error(message: string, errorOrFilename?: string | Error, filename: string = 'error.log') {
    try {
      const caller = this.getCaller();
      let finalMessage = message;
      let finalFilename = filename;
      
      // Handle different parameter combinations
      if (errorOrFilename) {
        if (errorOrFilename instanceof Error) {
          finalMessage += ` ${errorOrFilename.message}`;
          // Keep default filename
        } else if (typeof errorOrFilename === 'string') {
          finalFilename = errorOrFilename;
        }
      }
      
      console.error(`[${caller}] ${finalMessage}`);
      const formattedMessage = this.formatMessage('ERROR', finalMessage, caller) + '\n';
      const logFile = path.join(this.logDir, finalFilename);
      
      fs.appendFileSync(logFile, formattedMessage, 'utf8');
    } catch (error) {
      console.error('Failed to write to error log file:', error);
    }
  }

  /**
   * Log a warning message to both console and file
   */
  warn(message: string, filename: string = 'app.log') {
    try {
      const caller = this.getCaller();
      console.warn(`[${caller}] ${message}`);
      const formattedMessage = this.formatMessage('WARN', message, caller) + '\n';
      const logFile = path.join(this.logDir, filename);
      
      fs.appendFileSync(logFile, formattedMessage, 'utf8');
    } catch (error) {
      console.error('Failed to write to warning log file:', error);
    }
  }
}

// Export a singleton instance
export const logger = new Logger();
export default logger;
