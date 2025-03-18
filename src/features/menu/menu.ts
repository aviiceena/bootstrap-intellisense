import * as vscode from 'vscode';
import { StatusBar } from '../statusBar/statusBar';
import { findBootstrapCssFiles, readLocalCssFile, extractBootstrapVersion } from '../../core/bootstrap';
import * as path from 'path';

export class Menu {
  constructor(private statusBar: StatusBar) {}

  public async showMainMenu() {
    const isUsingLocalFile = this.statusBar.getUseLocalFile();
    const mainOptions: vscode.QuickPickItem[] = [
      {
        label: isUsingLocalFile
          ? '$(versions) Select Bootstrap version'
          : `$(versions) Select Bootstrap version (v${this.statusBar.getBootstrapVersion()})`,
      },
      {
        label: isUsingLocalFile
          ? `$(sparkle) From local files for offline use (${path.basename(this.statusBar.getCssFilePath())})`
          : '$(sparkle) From local files for offline use',
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
        case `$(versions) Select Bootstrap version (v${this.statusBar.getBootstrapVersion()})`:
          // If using local file, disable it first
          if (isUsingLocalFile) {
            await this.statusBar.disableLocalFile();
            vscode.window.showInformationMessage('Switched from local file to online Bootstrap version');
          }
          await this.showBootstrapVersionMenu();
          break;
        case '$(sparkle) From local files for offline use':
        case `$(sparkle) From local files for offline use (${path.basename(this.statusBar.getCssFilePath())})`:
          await this.showLocalFilesMenu();
          break;
      }
    }
  }

  private async showLocalFilesMenu() {
    try {
      const bootstrapFiles = await findBootstrapCssFiles();

      const items: vscode.QuickPickItem[] = [
        { label: '$(arrow-left) Back' },
        {
          label: '',
          kind: vscode.QuickPickItemKind.Separator,
        },
        { label: '$(folder-opened) Browse files...', detail: 'Select a custom Bootstrap CSS file' },
      ];

      // Add found files to the menu
      if (bootstrapFiles.length > 0) {
        items.push({
          label: '',
          kind: vscode.QuickPickItemKind.Separator,
          detail: 'Detected Bootstrap files',
        });

        for (const file of bootstrapFiles) {
          items.push({
            label: `$(file) ${path.basename(file)}`,
            detail: file,
            description: path.dirname(file),
          });
        }
      }

      const selection = await vscode.window.showQuickPick(items, {
        title: 'Select Bootstrap CSS File',
        placeHolder: 'Choose a Bootstrap CSS file for offline use',
      });

      if (!selection) {
        return;
      }

      if (selection.label === '$(arrow-left) Back') {
        await this.showMainMenu();
        return;
      }

      let selectedFile: string | undefined;

      if (selection.label === '$(folder-opened) Browse files...') {
        // Open file dialog
        const uris = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: {
            'CSS Files': ['css'],
          },
          title: 'Select Bootstrap CSS File',
        });

        if (uris && uris.length > 0) {
          selectedFile = uris[0].fsPath;
        }
      } else if (selection.detail) {
        // Use the selected file
        selectedFile = selection.detail;
      }

      if (selectedFile) {
        try {
          // Read the file to extract version
          const cssContent = await readLocalCssFile(selectedFile);
          const version = extractBootstrapVersion(cssContent);

          // Save settings and update
          await this.statusBar.setLocalFile(selectedFile, version);

          vscode.window.showInformationMessage(
            `Using local Bootstrap file: ${path.basename(selectedFile)}${version !== '0' ? ` (v${version})` : ''}`,
          );
        } catch (error) {
          vscode.window.showErrorMessage('Failed to read the selected Bootstrap CSS file');
        }
      }
    } catch (error) {
      console.error(`Error loading Bootstrap CSS files: ${error}`);
      vscode.window.showErrorMessage('Error loading Bootstrap CSS files');
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
