enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

class Logger {
  private className: string;

  constructor(className: string) {
    this.className = className;
  }

  private formatMessage(
    level: LogLevel,
    methodName: string,
    message: string,
    data?: any
  ): string {
    const timestamp = new Date().toISOString();
    const baseMsg = `[${timestamp}] [${level}] [${this.className}.${methodName}] ${message}`;

    if (data !== undefined) {
      return `${baseMsg} ${JSON.stringify(data, null, 2)}`;
    }

    return baseMsg;
  }

  debug(methodName: string, message: string, data?: any): void {
    console.debug(this.formatMessage(LogLevel.DEBUG, methodName, message, data));
  }

  info(methodName: string, message: string, data?: any): void {
    console.log(this.formatMessage(LogLevel.INFO, methodName, message, data));
  }

  warn(methodName: string, message: string, data?: any): void {
    console.warn(this.formatMessage(LogLevel.WARN, methodName, message, data));
  }

  error(methodName: string, message: string, error?: any): void {
    const formattedMsg = this.formatMessage(LogLevel.ERROR, methodName, message);

    if (error) {
      console.error(formattedMsg);
      if (error instanceof Error) {
        console.error(`  Stack: ${error.stack}`);
      } else {
        console.error(`  Details:`, error);
      }
    } else {
      console.error(formattedMsg);
    }
  }
}

export default Logger;
