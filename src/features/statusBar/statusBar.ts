import * as vscode from 'vscode';

export class StatusBar {
  private item: vscode.StatusBarItem;
  private isActive: boolean = false;
  private bootstrapVersion: string = '0';
  private useLocalFile: boolean = false;
  private cssFilePath: string = '';
  private languageSupport: string[] = [];
  private hoverEnabled: boolean = true;
  private callbacks: ((
    isActive: boolean,
    useLocalFile: boolean,
    cssFilePath: string,
    version: string,
    languageSupport: string[],
  ) => void)[] = [];

  constructor(private defaultVersion: string = '5.3.8') {
    this.loadSettings();
    this.item = this.createStatusBarItem();
  }

  private normalizePath(path: string): string {
    // Convert all backslashes to forward slashes
    return path.replace(/\\/g, '/');
  }

  private loadSettings() {
    try {
      const config = vscode.workspace.getConfiguration();
      const bootstrapConfig = config.get<{
        enable: boolean;
        bsVersion: string;
        useLocalFile: boolean;
        cssFilePath: string;
        languageSupport: string[];
        enableHover: boolean;
      }>('bootstrapIntelliSense');

      this.isActive = bootstrapConfig?.enable ?? true;
      this.bootstrapVersion = bootstrapConfig?.bsVersion ?? this.defaultVersion;
      this.useLocalFile = bootstrapConfig?.useLocalFile ?? false;
      this.cssFilePath = bootstrapConfig?.cssFilePath ?? '';
      this.languageSupport = bootstrapConfig?.languageSupport ?? [];
      this.hoverEnabled = bootstrapConfig?.enableHover ?? true;
    } catch (error) {
      this.isActive = true;
      this.bootstrapVersion = this.defaultVersion;
      this.useLocalFile = false;
      this.cssFilePath = '';
      this.languageSupport = [];
      this.hoverEnabled = true;
    }
  }

  private getConfigurationTarget(config: vscode.WorkspaceConfiguration): vscode.ConfigurationTarget {
    // Respect the scope where the setting is already defined instead of always
    // overwriting the global value (which would clobber workspace settings).
    const inspected = config.inspect('bootstrapIntelliSense');

    if (inspected?.workspaceFolderValue !== undefined) {
      return vscode.ConfigurationTarget.WorkspaceFolder;
    }

    if (inspected?.workspaceValue !== undefined) {
      return vscode.ConfigurationTarget.Workspace;
    }

    return vscode.ConfigurationTarget.Global;
  }

  private async saveSettings() {
    try {
      const config = vscode.workspace.getConfiguration();
      const settings = {
        enable: this.isActive,
        bsVersion: this.bootstrapVersion,
        useLocalFile: this.useLocalFile,
        cssFilePath: this.cssFilePath,
        languageSupport: this.languageSupport,
        enableHover: this.hoverEnabled,
      };
      await config.update('bootstrapIntelliSense', settings, this.getConfigurationTarget(config));
    } catch (error) {
      vscode.window.showErrorMessage('Error saving Bootstrap IntelliSense settings');
    }
  }

  private createStatusBarItem(): vscode.StatusBarItem {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    item.text = this.getStatusBarText();
    item.tooltip = 'Click to open main menu';
    item.command = 'bootstrap-intelliSense.showMainMenu';
    item.show();
    return item;
  }

  private getStatusBarText(): string {
    const statusIcon = this.isActive ? '$(bootstrap-icon-enable)' : '$(bootstrap-icon-disable)';
    const versionText = this.bootstrapVersion !== '0' ? ` v${this.bootstrapVersion}` : '';
    const localFileText = this.useLocalFile ? ' (Local)' : '';
    return `${statusIcon} Bootstrap${versionText}${localFileText}`;
  }

  public subscribe(
    callback: (
      isActive: boolean,
      useLocalFile: boolean,
      cssFilePath: string,
      version: string,
      languageSupport: string[],
    ) => void,
  ) {
    this.callbacks.push(callback);
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public getBootstrapVersion(): string {
    return this.bootstrapVersion;
  }

  public getUseLocalFile(): boolean {
    return this.useLocalFile;
  }

  public getCssFilePath(): string {
    return this.cssFilePath;
  }

  public getLanguageSupport(): string[] {
    return this.languageSupport;
  }

  public getHoverEnabled(): boolean {
    return this.hoverEnabled;
  }

  public async toggleHover() {
    const oldStatus = this.hoverEnabled;
    this.hoverEnabled = !this.hoverEnabled;

    try {
      await this.saveSettings();
      this.callbacks.forEach((callback) =>
        callback(this.isActive, this.useLocalFile, this.cssFilePath, this.bootstrapVersion, this.languageSupport),
      );

      const statusChange = this.hoverEnabled ? 'enabled' : 'disabled';
      vscode.window.showInformationMessage(`Bootstrap IntelliSense hover has been ${statusChange}`);
    } catch (error) {
      this.hoverEnabled = oldStatus;
      vscode.window.showErrorMessage('Error toggling Bootstrap IntelliSense hover');
    }
  }

  public async setLanguageSupport(languages: string[]) {
    const oldLanguages = [...this.languageSupport];

    try {
      this.languageSupport = languages;
      await this.saveSettings();

      this.callbacks.forEach((callback) =>
        callback(this.isActive, this.useLocalFile, this.cssFilePath, this.bootstrapVersion, this.languageSupport),
      );

      vscode.window.showInformationMessage('Language support settings updated successfully');
    } catch (error) {
      this.languageSupport = oldLanguages;
      vscode.window.showErrorMessage('Error updating language support settings');
    }
  }

  public async toggleActive() {
    const oldStatus = this.isActive;
    this.isActive = !this.isActive;

    try {
      await this.saveSettings();
      this.callbacks.forEach((callback) =>
        callback(this.isActive, this.useLocalFile, this.cssFilePath, this.bootstrapVersion, this.languageSupport),
      );
      this.updateStatusBarText();

      const statusChange = this.isActive ? 'activated' : 'deactivated';
      vscode.window.showInformationMessage(`Bootstrap IntelliSense has been ${statusChange}`);
    } catch (error) {
      this.isActive = oldStatus;
      vscode.window.showErrorMessage('Error toggling Bootstrap IntelliSense status');
    }
  }

  public async setBootstrapVersion(version: string) {
    const oldVersion = this.bootstrapVersion;
    const wasInactive = !this.isActive;
    this.bootstrapVersion = version;
    this.isActive = true;
    this.useLocalFile = false;
    this.cssFilePath = '';

    try {
      if (oldVersion !== version) {
        const { deleteAllBootstrapCaches } = require('../../core/bootstrap');
        try {
          deleteAllBootstrapCaches();
        } catch (cacheError) {
          console.error('Error deleting Bootstrap cache:', cacheError);
        }
      }

      await this.saveSettings();
      this.updateStatusBarText();
      this.callbacks.forEach((callback) =>
        callback(this.isActive, this.useLocalFile, this.cssFilePath, this.bootstrapVersion, this.languageSupport),
      );

      if (wasInactive) {
        vscode.window.showInformationMessage('Bootstrap IntelliSense has been activated');
      }
    } catch (error) {
      this.bootstrapVersion = oldVersion;
      vscode.window.showErrorMessage('Error updating Bootstrap version');
    }
  }

  public async setLocalFile(filePath: string, version: string) {
    const oldPath = this.cssFilePath;
    const oldVersion = this.bootstrapVersion;
    const oldUseLocalFile = this.useLocalFile;
    const wasInactive = !this.isActive;

    this.cssFilePath = this.normalizePath(filePath);
    this.bootstrapVersion = version;
    this.useLocalFile = true;
    this.isActive = true;

    try {
      if (oldPath !== this.cssFilePath || oldVersion !== this.bootstrapVersion || !oldUseLocalFile) {
        const { deleteAllBootstrapCaches } = require('../../core/bootstrap');
        try {
          deleteAllBootstrapCaches();
        } catch (cacheError) {
          console.error('Error deleting Bootstrap cache:', cacheError);
        }
      }

      await this.saveSettings();
      this.updateStatusBarText();
      this.callbacks.forEach((callback) =>
        callback(this.isActive, this.useLocalFile, this.cssFilePath, this.bootstrapVersion, this.languageSupport),
      );

      if (wasInactive) {
        vscode.window.showInformationMessage('Bootstrap IntelliSense has been activated');
      }
    } catch (error) {
      this.cssFilePath = oldPath;
      this.bootstrapVersion = oldVersion;
      this.useLocalFile = oldUseLocalFile;
      vscode.window.showErrorMessage('Error updating local Bootstrap file settings');
    }
  }

  public async disableLocalFile() {
    if (!this.useLocalFile) {
      return;
    }

    const oldUseLocalFile = this.useLocalFile;
    const oldCssFilePath = this.cssFilePath;

    this.useLocalFile = false;
    this.cssFilePath = '';

    try {
      await this.saveSettings();
      this.updateStatusBarText();
      this.callbacks.forEach((callback) =>
        callback(this.isActive, this.useLocalFile, this.cssFilePath, this.bootstrapVersion, this.languageSupport),
      );
    } catch (error) {
      this.useLocalFile = oldUseLocalFile;
      this.cssFilePath = oldCssFilePath;
      vscode.window.showErrorMessage('Error disabling local Bootstrap file');
    }
  }

  private updateStatusBarText() {
    this.item.text = this.getStatusBarText();
  }

  public dispose() {
    this.item.dispose();
  }
}
