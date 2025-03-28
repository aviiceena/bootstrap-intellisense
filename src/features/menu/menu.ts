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
          ? `$(folder-library) From local files for offline use (${path.basename(this.statusBar.getCssFilePath())})`
          : '$(folder-library) From local files for offline use',
      },
      {
        label: '$(diff-added) Add language support',
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
        case '$(folder-library) From local files for offline use':
        case `$(folder-library) From local files for offline use (${path.basename(this.statusBar.getCssFilePath())})`:
          await this.showLocalFilesMenu();
          break;
        case '$(diff-added) Add language support':
          await this.showLanguageSupportMenu();
          break;
      }
    }
  }

  private async showLanguageSupportMenu() {
    const languageOptions: vscode.QuickPickItem[] = [
      { label: '$(arrow-left) Back' },
      {
        label: '',
        kind: vscode.QuickPickItemKind.Separator,
      },
      {
        label: '$(list-selection) Select from available languages',
        description: 'Choose from predefined language list',
      },
      { label: '$(edit) Add custom language ID', description: 'Enter a custom language ID manually' },
    ];

    const selection = await vscode.window.showQuickPick(languageOptions, {
      title: 'Language Support Options',
      placeHolder: 'Choose how to add language support',
    });

    if (!selection) {
      return;
    }

    if (selection.label === '$(arrow-left) Back') {
      await this.showMainMenu();
      return;
    }

    if (selection.label === '$(edit) Add custom language ID') {
      await this.addCustomLanguage();
    } else if (selection.label === '$(list-selection) Select from available languages') {
      await this.showLanguageSelectionMenu();
    }
  }

  private async addCustomLanguage() {
    const currentLanguages = this.statusBar.getLanguageSupport();

    const customId = await vscode.window.showInputBox({
      title: 'Add Custom Language ID',
      placeHolder: 'Enter a custom language ID (e.g., "custom-html")',
      prompt: 'Enter a valid VS Code language identifier',
    });

    if (!customId) {
      // User cancelled
      await this.showLanguageSupportMenu();
      return;
    }

    // Add the custom language to the current languages
    if (!currentLanguages.includes(customId)) {
      const updatedLanguages = [...currentLanguages, customId];
      await this.statusBar.setLanguageSupport(updatedLanguages);
      vscode.window.showInformationMessage(`Added support for custom language: ${customId}`);
    } else {
      vscode.window.showInformationMessage(`Language ${customId} is already supported`);
    }

    // Return to the language support menu
    await this.showLanguageSupportMenu();
  }

  private async showLanguageSelectionMenu() {
    const currentLanguages = this.statusBar.getLanguageSupport();

    const availableLanguages = [
      { id: 'html', label: 'HTML' },
      { id: 'php', label: 'PHP' },
      { id: 'handlebars', label: 'Handlebars' },
      { id: 'vue-html', label: 'Vue HTML' },
      { id: 'django-html', label: 'Django HTML' },
      { id: 'blade', label: 'Blade (Laravel)' },
      { id: 'twig', label: 'Twig' },
      { id: 'erb', label: 'ERB (Ruby)' },
      { id: 'ejs', label: 'EJS' },
      { id: 'nunjucks', label: 'Nunjucks' },
      { id: 'mustache', label: 'Mustache' },
      { id: 'liquid', label: 'Liquid' },
      { id: 'pug', label: 'Pug' },
      { id: 'jade', label: 'Jade' },
      { id: 'haml', label: 'Haml' },
      { id: 'slim', label: 'Slim' },
      { id: 'jinja', label: 'Jinja' },
      { id: 'jinja2', label: 'Jinja2' },
      { id: 'jinja-html', label: 'Jinja HTML' },
      { id: 'edge', label: 'Edge' },
      { id: 'markdown', label: 'Markdown' },

      { id: 'javascript', label: 'JavaScript' },
      { id: 'javascriptreact', label: 'React (JSX)' },
      { id: 'typescript', label: 'TypeScript' },
      { id: 'typescriptreact', label: 'React (TSX)' },

      { id: 'angular', label: 'Angular' },
      { id: 'vue', label: 'Vue' },
      { id: 'svelte', label: 'Svelte' },
      { id: 'astro', label: 'Astro' },
      { id: 'razor', label: 'Razor' },
      { id: 'cshtml', label: 'CSHTML' },
      { id: 'aspnetcorerazor', label: 'ASP.NET Core Razor' },

      { id: 'css', label: 'CSS' },
      { id: 'scss', label: 'SCSS' },
      { id: 'sass', label: 'Sass' },
      { id: 'less', label: 'Less' },
      { id: 'stylus', label: 'Stylus' },

      { id: 'glimmer-js', label: 'Glimmer JS' },
    ];

    // Find custom languages (languages that are in currentLanguages but not in availableLanguages)
    const predefinedLanguageIds = availableLanguages.map((lang) => lang.id);
    const customLanguageIds = currentLanguages.filter((id) => !predefinedLanguageIds.includes(id));

    // Create a combined menu with all options
    const allLanguageItems: vscode.QuickPickItem[] = [];

    // Add custom languages at the top if there are any
    if (customLanguageIds.length > 0) {
      allLanguageItems.push({
        label: '',
        kind: vscode.QuickPickItemKind.Separator,
        detail: 'Custom language IDs'
      });

      for (const customId of customLanguageIds) {
        allLanguageItems.push({
          label: `${customId} (Custom)`,
          description: customId,
          picked: true
        });
      }

      allLanguageItems.push({
        label: '',
        kind: vscode.QuickPickItemKind.Separator,
        detail: 'Predefined languages'
      });
    }

    // Add predefined languages
    for (const lang of availableLanguages) {
      allLanguageItems.push({
        label: `${lang.label}`,
        description: lang.id,
        picked: currentLanguages.includes(lang.id),
      });
    }

    // Show the language selection menu
    const selection = await vscode.window.showQuickPick(allLanguageItems, {
      title: 'Configure Language Support',
      placeHolder: 'Select languages to enable Bootstrap IntelliSense (Esc to go back)',
      canPickMany: true,
    });

    // If user pressed Escape, go back to the language support menu
    if (!selection) {
      await this.showLanguageSupportMenu();
      return;
    }

    // Map selected languages
    const selectedLanguages = selection
      .map((item) => item.description)
      .filter(Boolean) as string[];
    
    // Preserve custom languages if they weren't explicitly deselected
    const selectedLanguageSet = new Set(selectedLanguages);
    const updatedLanguages = [...selectedLanguageSet];

    await this.statusBar.setLanguageSupport(updatedLanguages);

    // Return to the language support menu
    await this.showLanguageSupportMenu();
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
      { label: '$(add) Bootstrap 5.3.2' },
      { label: '$(add) Bootstrap 5.3.1' },
      { label: '$(add) Bootstrap 5.3.0' },
      { label: '$(add) Bootstrap 5.2.3' },
      { label: '$(add) Bootstrap 5.2.2' },
      { label: '$(add) Bootstrap 5.2.1' },
      { label: '$(add) Bootstrap 5.2.0' },
      { label: '$(add) Bootstrap 5.1.3' },
      { label: '$(add) Bootstrap 5.0.2' },
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
          await this.statusBar.setBootstrapVersion(versionNumber);
          vscode.window.showInformationMessage(`Bootstrap version set to v${versionNumber}`);
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
      { label: '$(add) Bootstrap 4.6.1' },
      { label: '$(add) Bootstrap 4.6.0' },
      { label: '$(add) Bootstrap 4.5.3' },
      { label: '$(add) Bootstrap 4.5.2' },
      { label: '$(add) Bootstrap 4.5.1' },
      { label: '$(add) Bootstrap 4.5.0' },
      { label: '$(add) Bootstrap 4.4.1' },
      { label: '$(add) Bootstrap 4.4.0' },
      { label: '$(add) Bootstrap 4.3.1' },
      { label: '$(add) Bootstrap 4.3.0' },
      { label: '$(add) Bootstrap 4.2.1' },
      { label: '$(add) Bootstrap 4.1.3' },
      { label: '$(add) Bootstrap 4.1.2' },
      { label: '$(add) Bootstrap 4.1.1' },
      { label: '$(add) Bootstrap 4.0.0' },
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
          await this.statusBar.setBootstrapVersion(versionNumber);
          vscode.window.showInformationMessage(`Bootstrap version set to v${versionNumber}`);
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
      { label: '$(add) Bootstrap 3.4.1' },
      { label: '$(add) Bootstrap 3.4.0' },
      { label: '$(add) Bootstrap 3.3.7' },
      { label: '$(add) Bootstrap 3.3.6' },
      { label: '$(add) Bootstrap 3.3.5' },
      { label: '$(add) Bootstrap 3.3.4' },
      { label: '$(add) Bootstrap 3.3.3' },
      { label: '$(add) Bootstrap 3.3.2' },
      { label: '$(add) Bootstrap 3.3.1' },
      { label: '$(add) Bootstrap 3.3.0' },
      { label: '$(add) Bootstrap 3.2.0' },
      { label: '$(add) Bootstrap 3.1.1' },
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
          await this.statusBar.setBootstrapVersion(versionNumber);
          vscode.window.showInformationMessage(`Bootstrap version set to v${versionNumber}`);
        }
      }
    }
  }
}
