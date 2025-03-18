import * as vscode from 'vscode';

export class StatusBar {
  private item: vscode.StatusBarItem;
  private isActive: boolean = false;
  private bootstrapVersion: string = '0';
  private useLocalFile: boolean = false;
  private cssFilePath: string = '';
  private callbacks: ((isActive: boolean, useLocalFile: boolean, cssFilePath: string, version: string) => void)[] = [];

  constructor() {
    this.loadSettings();
    this.item = this.createStatusBarItem();
  }

  private normalizePath(path: string): string {
    // Konvertiere alle Backslashes zu Forward-Slashes
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
      }>('bootstrapIntelliSense');

      this.isActive = bootstrapConfig?.enable ?? true;
      this.bootstrapVersion = bootstrapConfig?.bsVersion ?? '5.3.3';
      this.useLocalFile = bootstrapConfig?.useLocalFile ?? false;
      this.cssFilePath = bootstrapConfig?.cssFilePath ?? '';
    } catch (error) {
      this.isActive = true;
      this.bootstrapVersion = '5.3.3';
      this.useLocalFile = false;
      this.cssFilePath = '';
    }
  }

  private async saveSettings() {
    try {
      const config = vscode.workspace.getConfiguration();
      const settings = {
        enable: this.isActive,
        bsVersion: this.bootstrapVersion,
        useLocalFile: this.useLocalFile,
        cssFilePath: this.cssFilePath,
      };
      await config.update('bootstrapIntelliSense', settings, vscode.ConfigurationTarget.Global);
    } catch (error) {
      vscode.window.showErrorMessage('Error saving Bootstrap IntelliSense settings');
    }
  }

  private createStatusBarItem(): vscode.StatusBarItem {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    item.text = this.getStatusBarText();
    item.tooltip = this.getStatusBarTooltip();
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

  private getStatusBarTooltip(): string {
    const status = this.isActive ? 'active' : 'inactive';
    const version = this.bootstrapVersion !== '0' ? ` Version ${this.bootstrapVersion}` : '';
    const localFile = this.useLocalFile ? `\nUsing local file: ${this.cssFilePath}` : '';
    return `Bootstrap IntelliSense is ${status}${version}${localFile}\nClick to open main menu`;
  }

  public subscribe(callback: (isActive: boolean, useLocalFile: boolean, cssFilePath: string, version: string) => void) {
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

  public async toggleActive() {
    const oldStatus = this.isActive;
    this.isActive = !this.isActive;

    try {
      await this.saveSettings();
      this.callbacks.forEach((callback) =>
        callback(this.isActive, this.useLocalFile, this.cssFilePath, this.bootstrapVersion),
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
          console.error('Fehler beim Löschen des Bootstrap-Caches:', cacheError);
        }
      }

      await this.saveSettings();
      this.updateStatusBarText();
      this.callbacks.forEach((callback) =>
        callback(this.isActive, this.useLocalFile, this.cssFilePath, this.bootstrapVersion),
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
          console.error('Fehler beim Löschen des Bootstrap-Caches:', cacheError);
        }
      }

      await this.saveSettings();
      this.updateStatusBarText();
      this.callbacks.forEach((callback) =>
        callback(this.isActive, this.useLocalFile, this.cssFilePath, this.bootstrapVersion),
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
        callback(this.isActive, this.useLocalFile, this.cssFilePath, this.bootstrapVersion),
      );
    } catch (error) {
      this.useLocalFile = oldUseLocalFile;
      this.cssFilePath = oldCssFilePath;
      vscode.window.showErrorMessage('Error disabling local Bootstrap file');
    }
  }

  private updateStatusBarText() {
    this.item.text = this.getStatusBarText();
    this.item.tooltip = this.getStatusBarTooltip();
  }

  public dispose() {
    this.item.dispose();
  }
}
