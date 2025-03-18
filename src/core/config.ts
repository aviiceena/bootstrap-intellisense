import * as vscode from 'vscode';

export interface BootstrapConfig {
  version: string;
  isActive: boolean;
  showSuggestions: boolean;
  autoComplete: boolean;
  formatOnSave: boolean;
  useLocalFile?: boolean;
  cssFilePath?: string;
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
      version: this.config.get<string>('bsVersion') || '5.3.3',
      isActive: this.config.get<boolean>('enable') ?? true,
      showSuggestions: this.config.get<boolean>('showSuggestions') ?? true,
      autoComplete: this.config.get<boolean>('autoComplete') ?? true,
      formatOnSave: this.config.get<boolean>('formatOnSave', true),
      useLocalFile: this.config.get<boolean>('useLocalFile', false),
      cssFilePath: this.config.get<string>('cssFilePath', ''),
    };

    return config;
  }

  public async updateConfig(key: keyof BootstrapConfig, value: any): Promise<void> {
    try {
      const configKey = this.getConfigKey(key);
      await this.config.update(configKey, value, true);
    } catch (error) {
      throw error;
    }
  }

  private getConfigKey(key: keyof BootstrapConfig): string {
    const keyMap: Record<keyof BootstrapConfig, string> = {
      version: 'bsVersion',
      isActive: 'enable',
      showSuggestions: 'showSuggestions',
      autoComplete: 'autoComplete',
      formatOnSave: 'formatOnSave',
      useLocalFile: 'useLocalFile',
      cssFilePath: 'cssFilePath',
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
