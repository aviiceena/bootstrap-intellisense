import * as vscode from 'vscode';
import { getLatestBootstrapVersion } from './bootstrap-versions';

export interface BootstrapConfig {
  version: string;
  isActive: boolean;
  showSuggestions: boolean;
  autoComplete: boolean;
  useLocalFile?: boolean;
  cssFilePath?: string;
  languageSupport?: string[];
}

export class Config {
  private static instance: Config;
  private config: vscode.WorkspaceConfiguration;

  private constructor() {
    this.config = vscode.workspace.getConfiguration('bootstrapIntelliSense');
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  public getBootstrapConfig(): BootstrapConfig {
    const config = {
      version: this.config.get<string>('bsVersion') || getLatestBootstrapVersion(),
      isActive: this.config.get<boolean>('enable') ?? true,
      showSuggestions: this.config.get<boolean>('showSuggestions') ?? true,
      autoComplete: this.config.get<boolean>('autoComplete') ?? true,
      useLocalFile: this.config.get<boolean>('useLocalFile', false),
      cssFilePath: this.config.get<string>('cssFilePath', ''),
      languageSupport: this.config.get<string[]>('languageSupport', []),
    };

    return config;
  }

  public async updateConfig(key: keyof BootstrapConfig, value: any): Promise<void> {
    const configKey = this.getConfigKey(key);
    await this.config.update(configKey, value, true);
  }

  private getConfigKey(key: keyof BootstrapConfig): string {
    const keyMap: Record<keyof BootstrapConfig, string> = {
      version: 'bsVersion',
      isActive: 'enable',
      showSuggestions: 'showSuggestions',
      autoComplete: 'autoComplete',
      useLocalFile: 'useLocalFile',
      cssFilePath: 'cssFilePath',
      languageSupport: 'languageSupport',
    };
    return keyMap[key];
  }

  public get<T>(key: string): T | undefined {
    return this.config.get<T>(key);
  }

  public has(key: string): boolean {
    return this.config.has(key);
  }

  public inspect<T>(key: string):
    | {
        key: string;
        defaultValue?: T;
        globalValue?: T;
        workspaceValue?: T;
        workspaceFolderValue?: T;
      }
    | undefined {
    return this.config.inspect<T>(key);
  }
}
