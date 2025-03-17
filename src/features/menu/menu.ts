import * as vscode from 'vscode';
import { StatusBar } from '../statusBar/statusBar';

export class Menu {
  constructor(private statusBar: StatusBar) {}

  public async showMainMenu() {
    const mainOptions: vscode.QuickPickItem[] = [
      {
        label: '$(versions) Select Bootstrap version',
      },
      {
        label: '$(sparkle) From local files for offline use',
        description: 'coming soon',
      },
      {
        label: '',
        kind: vscode.QuickPickItemKind.Separator,
      },
      {
        label: `${
          this.statusBar.getIsActive()
            ? '$(bootstrap-icon-disable) Disable completion'
            : '$(bootstrap-icon-enable) Enable completion'
        }`,
      },
    ];

    const mainSelection = await vscode.window.showQuickPick(mainOptions, {
      title: 'Bootstrap IntelliSense Menu',
      placeHolder: 'Choose an option',
    });

    if (mainSelection) {
      switch (mainSelection.label) {
        case `${
          this.statusBar.getIsActive()
            ? '$(bootstrap-icon-disable) Disable completion'
            : '$(bootstrap-icon-enable) Enable completion'
        }`:
          await this.statusBar.toggleActive();
          break;
        case '$(versions) Select Bootstrap version':
          await this.showBootstrapVersionMenu();
          break;
      }
    }
  }

  private async showBootstrapVersionMenu() {
    const bootstrapMajorOptions: vscode.QuickPickItem[] = [
      { label: '$(arrow-left) Back' },
      {
        label: '',
        kind: vscode.QuickPickItemKind.Separator,
      },
      { label: '$(versions) Bootstrap 5' },
      { label: '$(versions) Bootstrap 4' },
      { label: '$(versions) Bootstrap 3' },
    ];

    const majorSelection = await vscode.window.showQuickPick(bootstrapMajorOptions, {
      title: 'Select Bootstrap version',
      placeHolder: 'Choose a version of Bootstrap',
    });

    if (majorSelection) {
      if (majorSelection.label === '$(arrow-left) Back') {
        this.showMainMenu();
      } else {
        switch (majorSelection.label) {
          case '$(versions) Bootstrap 5':
            await this.showBootstrap5VersionMenu();
            break;
          case '$(versions) Bootstrap 4':
            await this.showBootstrap4VersionMenu();
            break;
          case '$(versions) Bootstrap 3':
            await this.showBootstrap3VersionMenu();
            break;
        }
      }
    }
  }

  private async showBootstrap5VersionMenu() {
    const version5Options: vscode.QuickPickItem[] = [
      { label: '$(arrow-left) Back' },
      {
        label: '',
        kind: vscode.QuickPickItemKind.Separator,
      },
      { label: '$(add) Bootstrap 5.3.3' },
      { label: '$(add) Bootstrap 5.2' },
      { label: '$(add) Bootstrap 5.1' },
      { label: '$(add) Bootstrap 5.0' },
    ];

    const versionSelection = await vscode.window.showQuickPick(version5Options, {
      title: 'Select Bootstrap 5 version',
      placeHolder: 'Choose a version of Bootstrap 5',
    });

    if (versionSelection) {
      if (versionSelection.label === '$(arrow-left) Back') {
        await this.showBootstrapVersionMenu();
      } else {
        const versionNumber = versionSelection.label.split(' ').pop();
        if (versionNumber) {
          await this.statusBar.setBootstrapVersion(versionNumber + '.0');
          vscode.window.showInformationMessage(`Bootstrap version set to v${versionNumber}.0`);
        }
      }
    }
  }

  private async showBootstrap4VersionMenu() {
    const version4Options: vscode.QuickPickItem[] = [
      { label: '$(arrow-left) Back' },
      {
        label: '',
        kind: vscode.QuickPickItemKind.Separator,
      },
      { label: '$(add) Bootstrap 4.6' },
      { label: '$(add) Bootstrap 4.5' },
      { label: '$(add) Bootstrap 4.4' },
      { label: '$(add) Bootstrap 4.3' },
      { label: '$(add) Bootstrap 4.2' },
      { label: '$(add) Bootstrap 4.1' },
      { label: '$(add) Bootstrap 4.0' },
    ];

    const versionSelection = await vscode.window.showQuickPick(version4Options, {
      title: 'Select Bootstrap 4 version',
      placeHolder: 'Choose a version of Bootstrap 4',
    });

    if (versionSelection) {
      if (versionSelection.label === '$(arrow-left) Back') {
        await this.showBootstrapVersionMenu();
      } else {
        const versionNumber = versionSelection.label.split(' ').pop();
        if (versionNumber) {
          await this.statusBar.setBootstrapVersion(versionNumber + '.0');
          vscode.window.showInformationMessage(`Bootstrap version set to v${versionNumber}.0`);
        }
      }
    }
  }

  private async showBootstrap3VersionMenu() {
    const version3Options: vscode.QuickPickItem[] = [
      { label: '$(arrow-left) Back' },
      {
        label: '',
        kind: vscode.QuickPickItemKind.Separator,
      },
      { label: '$(add) Bootstrap 3.4' },
      { label: '$(add) Bootstrap 3.3' },
    ];

    const versionSelection = await vscode.window.showQuickPick(version3Options, {
      title: 'Select Bootstrap 3 version',
      placeHolder: 'Choose a version of Bootstrap 3',
    });

    if (versionSelection) {
      if (versionSelection.label === '$(arrow-left) Back') {
        await this.showBootstrapVersionMenu();
      } else {
        const versionNumber = versionSelection.label.split(' ').pop();
        if (versionNumber) {
          await this.statusBar.setBootstrapVersion(versionNumber + '.0');
          vscode.window.showInformationMessage(`Bootstrap version set to v${versionNumber}.0`);
        }
      }
    }
  }
}
