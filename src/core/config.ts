import * as vscode from 'vscode';

export interface BootstrapConfig {
  version: string;
  isActive: boolean;
  showSuggestions: boolean;
  autoComplete: boolean;
  hoverEnabled: boolean;
  colorPreviewEnabled: boolean;
  useLocalFile?: boolean;
  cssFilePath?: string;
  languageSupport?: string[];
}

export class Config {
  private static instance: Config;
  // Default version to use when the user has not selected one. Set at activation
  // to the newest available Bootstrap version.
  private defaultVersion: string = '5.3.8';

  private constructor() {}

  // Always read a fresh configuration snapshot so runtime toggles (e.g. enabling
  // or disabling hover) are observed immediately instead of a stale cached value.
  private get config(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration('bootstrapIntelliSense');
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  public setDefaultVersion(version: string): void {
    this.defaultVersion = version;
  }

  public getBootstrapConfig(): BootstrapConfig {
    const config = {
      version: this.config.get<string>('bsVersion') || this.defaultVersion,
      isActive: this.config.get<boolean>('enable') ?? true,
      showSuggestions: this.config.get<boolean>('showSuggestions') ?? true,
      autoComplete: this.config.get<boolean>('autoComplete') ?? true,
      hoverEnabled: this.config.get<boolean>('enableHover') ?? true,
      colorPreviewEnabled: this.config.get<boolean>('enableColorPreview') ?? true,
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
      hoverEnabled: 'enableHover',
      colorPreviewEnabled: 'enableColorPreview',
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
