import * as vscode from 'vscode';
import { StatusBar } from '../statusBar/statusBar';
import { findBootstrapCssFiles, readLocalCssFile, extractBootstrapVersion } from '../../core/bootstrap';
import * as path from 'path';
import * as fs from 'fs';

// Typdefinition für die Struktur der JSON-Datei
interface BootstrapVersions {
  [major: string]: string[]; // z.B. "v5": ["5.3.3", ...]
}

export class Menu {
  private bootstrapVersions: BootstrapVersions | null = null;

  constructor(private statusBar: StatusBar) {
    this.loadVersions(); // Versionen beim Initialisieren laden
  }

  private loadVersions() {
    try {
      // __dirname ist im Kontext von VS Code Erweiterungen nicht immer zuverlässig für den Zugriff auf gepackte Assets.
      // vscode.extensions.getExtension('YOUR_EXTENSION_ID').extensionPath ist der empfohlene Weg.
      // Bitte ersetze 'Hossaini.bootstrap-intellisense' mit deiner tatsächlichen Extension ID aus package.json
      const extension = vscode.extensions.getExtension('Hossaini.bootstrap-intellisense');
      if (extension) {
        const versionsPath = path.join(extension.extensionPath, 'assets', 'bootstrap-versions.json');
        if (fs.existsSync(versionsPath)) {
          const fileContent = fs.readFileSync(versionsPath, 'utf-8');
          this.bootstrapVersions = JSON.parse(fileContent) as BootstrapVersions;
        } else {
          vscode.window.showErrorMessage(
            'bootstrap-versions.json not found in assets folder. Please ensure it exists.',
          );
          this.bootstrapVersions = null; // Fallback
          console.error(`bootstrap-versions.json not found at ${versionsPath}`);
        }
      } else {
        vscode.window.showErrorMessage('Could not determine extension path. Bootstrap versions cannot be loaded.');
        console.warn('Could not determine extension path to load bootstrap-versions.json');
        this.bootstrapVersions = null;
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error loading or parsing bootstrap-versions.json: ${error.message}`);
      console.error('Error loading bootstrap versions:', error);
      this.bootstrapVersions = null; // Fallback
    }
  }

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
        detail: 'Custom language IDs',
      });

      for (const customId of customLanguageIds) {
        allLanguageItems.push({
          label: `${customId} (Custom)`,
          description: customId,
          picked: true,
        });
      }

      allLanguageItems.push({
        label: '',
        kind: vscode.QuickPickItemKind.Separator,
        detail: 'Predefined languages',
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
    const selectedLanguages = selection.map((item) => item.description).filter(Boolean) as string[];

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
    // Die Hauptversionen könnten auch dynamisch aus this.bootstrapVersions.keys() generiert werden,
    // aber wir behalten das bestehende Menü für Hauptversionen bei, da es übersichtlich ist.
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
        // Wir leiten den Major-Key für unsere JSON-Datei ab
        let majorKey = '';
        if (majorSelection.label.includes('Bootstrap 5')) {
          majorKey = 'v5';
        } else if (majorSelection.label.includes('Bootstrap 4')) {
          majorKey = 'v4';
        } else if (majorSelection.label.includes('Bootstrap 3')) {
          majorKey = 'v3';
        }

        if (majorKey && this.bootstrapVersions && this.bootstrapVersions[majorKey]) {
          await this.showSpecificBootstrapVersionMenu(majorKey);
        } else if (majorKey) {
          vscode.window.showErrorMessage(
            `Could not find versions for ${majorSelection.label}. Check bootstrap-versions.json.`,
          );
          await this.showBootstrapVersionMenu(); // Stay on the same menu or go back
        } else {
          // Should not happen if labels are correct
          await this.showBootstrapVersionMenu();
        }
      }
    }
  }

  // Eine neue generische Methode, um die spezifischen Versionsmenüs zu erstellen
  private async showSpecificBootstrapVersionMenu(majorKey: string) {
    if (!this.bootstrapVersions || !this.bootstrapVersions[majorKey]) {
      // This case should ideally be caught by the check in showBootstrapVersionMenu
      vscode.window.showErrorMessage(
        `No versions found for Bootstrap ${majorKey.substring(1)} in bootstrap-versions.json.`,
      );
      await this.showBootstrapVersionMenu(); // Zurück zum Hauptversionsmenü
      return;
    }

    const versions = this.bootstrapVersions[majorKey];
    const versionOptions: vscode.QuickPickItem[] = [
      { label: '$(arrow-left) Back' },
      {
        label: '',
        kind: vscode.QuickPickItemKind.Separator,
      },
      ...versions.map((version) => ({ label: `$(add) Bootstrap ${version}` })),
    ];

    const versionSelection = await vscode.window.showQuickPick(versionOptions, {
      title: `Select Bootstrap ${majorKey.substring(1)} version`,
      placeHolder: `Choose a version of Bootstrap ${majorKey.substring(1)}`,
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
    } else {
      // User cancelled (pressed Esc), go back to the major version selection menu
      await this.showBootstrapVersionMenu();
    }
  }
}
