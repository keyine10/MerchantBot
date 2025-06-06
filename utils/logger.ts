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

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  private writeToFile(filename: string, message: string) {
    const logFile = path.join(this.logDir, filename);
    const formattedMessage = this.formatMessage('INFO', message) + '\n';
    
    try {
      fs.appendFileSync(logFile, formattedMessage, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Log a message to both console and file
   */
  log(message: string, filename: string = 'app.log') {
    if (process.env.NODE_ENV !== 'production') {
      console.log(message);
    }
    this.writeToFile(filename, message);
  }

  /**
   * Log an error message to both console and file
   */
  error(message: string, filename: string = 'error.log') {
    console.error(message);
    const formattedMessage = this.formatMessage('ERROR', message) + '\n';
    const logFile = path.join(this.logDir, filename);
    
    try {
      fs.appendFileSync(logFile, formattedMessage, 'utf8');
    } catch (error) {
      console.error('Failed to write to error log file:', error);
    }
  }

  /**
   * Log a warning message to both console and file
   */
  warn(message: string, filename: string = 'app.log') {
    console.warn(message);
    const formattedMessage = this.formatMessage('WARN', message) + '\n';
    const logFile = path.join(this.logDir, filename);
    
    try {
      fs.appendFileSync(logFile, formattedMessage, 'utf8');
    } catch (error) {
      console.error('Failed to write to warning log file:', error);
    }
  }
}

// Export a singleton instance
export const logger = new Logger();
export default logger;
