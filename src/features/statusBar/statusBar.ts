import * as vscode from 'vscode';

export class StatusBar {
  private item: vscode.StatusBarItem;
  private isActive: boolean = false;
  private bootstrapVersion: string = '0';
  private callbacks: ((isActive: boolean) => void)[] = [];

  constructor() {
    this.loadSettings();
    this.item = this.createStatusBarItem();
  }

  private loadSettings() {
    try {
      const config = vscode.workspace.getConfiguration();
      const bootstrapConfig = config.get<{ enable: boolean; bsVersion: string }>('bootstrapIntelliSense');

      this.isActive = bootstrapConfig?.enable ?? true;
      this.bootstrapVersion = bootstrapConfig?.bsVersion ?? '5.3.3';
    } catch (error) {
      this.isActive = true;
      this.bootstrapVersion = '5.3.3';
    }
  }

  private async saveSettings() {
    try {
      const config = vscode.workspace.getConfiguration();
      const settings = {
        enable: this.isActive,
        bsVersion: this.bootstrapVersion,
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
    const statusText = this.isActive ? 'Active' : 'Inactive';
    const versionText = this.bootstrapVersion !== '0' ? ` v${this.bootstrapVersion}` : '';
    return `${statusIcon} Bootstrap${versionText} (${statusText})`;
  }

  private getStatusBarTooltip(): string {
    const status = this.isActive ? 'active' : 'inactive';
    const version = this.bootstrapVersion !== '0' ? ` Version ${this.bootstrapVersion}` : '';
    return `Bootstrap IntelliSense is ${status}${version}\nClick to open main menu`;
  }

  public subscribe(callback: (isActive: boolean) => void) {
    this.callbacks.push(callback);
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public getBootstrapVersion(): string {
    return this.bootstrapVersion;
  }

  public async toggleActive() {
    const oldStatus = this.isActive;
    this.isActive = !this.isActive;

    try {
      await this.saveSettings();
      this.callbacks.forEach((callback) => callback(this.isActive));
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

    try {
      await this.saveSettings();
      this.updateStatusBarText();
      this.callbacks.forEach((callback) => callback(this.isActive));

      if (wasInactive) {
        vscode.window.showInformationMessage('Bootstrap IntelliSense has been activated');
      }
    } catch (error) {
      this.bootstrapVersion = oldVersion;
      vscode.window.showErrorMessage('Error updating Bootstrap version');
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
