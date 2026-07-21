// ============================================================
// Sổ Điểm GL — Logger Service
// Centralized logging with levels and production filtering
// ============================================================

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  level: LogLevel
  message: string
  context?: any
  timestamp: number
}

export class Logger {
  private static instance: Logger
  private minLevel: LogLevel = LogLevel.INFO
  private logs: LogEntry[] = []
  private maxLogs = 100

  private constructor() {
    // Set log level based on environment
    if (import.meta.env.DEV) {
      this.minLevel = LogLevel.DEBUG
    } else {
      this.minLevel = LogLevel.WARN
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel
  }

  private addLog(level: LogLevel, message: string, context?: any): void {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: Date.now()
    }

    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }
  }

  private formatMessage(level: LogLevel, message: string): string {
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR']
    const timestamp = new Date().toISOString()
    return `[${timestamp}] [${levelNames[level]}] ${message}`
  }

  debug(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message), context || '')
      this.addLog(LogLevel.DEBUG, message, context)
    }
  }

  info(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(LogLevel.INFO, message), context || '')
      this.addLog(LogLevel.INFO, message, context)
    }
  }

  warn(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message), context || '')
      this.addLog(LogLevel.WARN, message, context)
    }
  }

  error(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage(LogLevel.ERROR, message), context || '')
      this.addLog(LogLevel.ERROR, message, context)
    }
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level)
    }
    return [...this.logs]
  }

  clearLogs(): void {
    this.logs = []
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }
}

export const logger = Logger.getInstance()
