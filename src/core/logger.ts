import * as vscode from 'vscode';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export class Logger {
  private static instance: Logger;
  private outputChannel: vscode.OutputChannel;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Bootstrap IntelliSense');
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public log(level: LogLevel, message: string, data?: Error | any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: ${message}`;

    this.outputChannel.appendLine(logMessage);

    if (data) {
      if (data instanceof Error) {
        this.outputChannel.appendLine(`Error details: ${data.message}`);
        this.outputChannel.appendLine(`Stack trace: ${data.stack}`);
      } else {
        this.outputChannel.appendLine(`Details: ${JSON.stringify(data, null, 2)}`);
      }
    }

    if (level === LogLevel.ERROR) {
      vscode.window.showErrorMessage(message);
    }
  }

  public show(): void {
    this.outputChannel.show();
  }

  public dispose(): void {
    this.outputChannel.dispose();
  }
}
