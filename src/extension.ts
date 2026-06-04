import * as vscode from 'vscode';
import { StatusBar } from './features/statusBar/statusBar';
import { Menu } from './features/menu/menu';
import { CompletionProvider, languageSupport, updateLanguageSupport } from './features/completion/completionProvider';
import { HoverProvider } from './features/hover/hoverProvider';
import { ColorDecorator } from './features/colorDecoration/colorDecorator';
import { Container } from './core/container';
import { Config } from './core/config';
import { deleteAllBootstrapCaches } from './core/bootstrap';
import { getLatestBootstrapVersion } from './core/versions';
import { getSortEditsForDocument } from './features/classSorting/classSorter';

let completionProvider: CompletionProvider | undefined;
let hoverProvider: HoverProvider | undefined;
let colorDecorator: ColorDecorator | undefined;
const container = Container.getInstance();
const config = Config.getInstance();

// Settings that require tearing down and re-registering language providers.
const PROVIDER_CONFIG_KEYS = [
  'bootstrapIntelliSense.enable',
  'bootstrapIntelliSense.bsVersion',
  'bootstrapIntelliSense.enableHover',
  'bootstrapIntelliSense.enableColorPreview',
  'bootstrapIntelliSense.useLocalFile',
  'bootstrapIntelliSense.cssFilePath',
  'bootstrapIntelliSense.languageSupport',
] as const;

function configurationAffectsProviders(e: vscode.ConfigurationChangeEvent): boolean {
  return PROVIDER_CONFIG_KEYS.some((key) => e.affectsConfiguration(key));
}

// Function to completely recreate all providers
async function recreateProviders(
  context: vscode.ExtensionContext,
  isActive: boolean,
  version: string,
  useLocalFile: boolean,
  cssFilePath: string,
) {
  // Update CompletionProvider
  if (completionProvider) {
    completionProvider.dispose();
    completionProvider = undefined;
  }

  if (isActive) {
    completionProvider = new CompletionProvider(isActive, version, useLocalFile, cssFilePath);

    container.register('completionProvider', completionProvider);
    completionProvider.register(context);

    // Update HoverProvider. Hover can be toggled independently of completion, so
    // only register it when enabled.
    if (hoverProvider) {
      hoverProvider.dispose();
      hoverProvider = undefined;
    }
    if (config.get<boolean>('enableHover') ?? true) {
      hoverProvider = new HoverProvider(isActive, version, useLocalFile, cssFilePath);
      container.register('hoverProvider', hoverProvider);
      hoverProvider.register(context);
    }

    // Update ColorDecorator. Like hover, it can be toggled independently, so
    // only recreate it when enabled.
    if (colorDecorator) {
      colorDecorator.dispose();
      colorDecorator = undefined;
    }
    if (config.get<boolean>('enableColorPreview') ?? true) {
      colorDecorator = new ColorDecorator(isActive, version, useLocalFile, cssFilePath);
      container.register('colorDecorator', colorDecorator);
      await colorDecorator.register(context);
    }
  } else {
    // If extension is not active, dispose of hover provider and color decorator
    if (hoverProvider) {
      hoverProvider.dispose();
      hoverProvider = undefined;
    }
    if (colorDecorator) {
      colorDecorator.dispose();
      colorDecorator = undefined;
    }
  }
}

export async function activate(context: vscode.ExtensionContext) {
  // Register core dependencies
  container.register('context', context);
  container.register('config', config);

  // Use the newest available Bootstrap version as the default when the user has
  // not explicitly selected one.
  const latestVersion = getLatestBootstrapVersion(context.extensionPath);
  config.setDefaultVersion(latestVersion);

  const bootstrapConfig = config.getBootstrapConfig();

  // Initialize language support from settings
  updateLanguageSupport(bootstrapConfig.languageSupport);

  // Initialize features
  const statusBar = new StatusBar(latestVersion);
  const menu = new Menu(statusBar, context.extensionPath);

  container.register('statusBar', statusBar);
  container.register('menu', menu);

  if (bootstrapConfig.isActive) {
    // Initialize providers with current configuration
    await recreateProviders(
      context,
      bootstrapConfig.isActive ?? true,
      bootstrapConfig.version,
      bootstrapConfig.useLocalFile ?? false,
      bootstrapConfig.cssFilePath ?? '',
    );
  }

  // Provider lifecycle is driven by onDidChangeConfiguration so menu toggles
  // (which persist via statusBar.saveSettings) do not trigger a duplicate recreate.

  // Register commands and configuration change handler
  context.subscriptions.push(
    vscode.commands.registerCommand('bootstrap-intelliSense.showMainMenu', async () => {
      const menu = container.get<Menu>('menu');
      await menu.showMainMenu();
    }),
    vscode.commands.registerCommand('bootstrap-intelliSense.toggleSortOnSave', async () => {
      const statusBar = container.get<StatusBar>('statusBar');
      await statusBar.toggleSortOnSave();
    }),
    vscode.commands.registerCommand('bootstrap-intelliSense.sortClasses', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const currentConfig = config.getBootstrapConfig();
      if (!currentConfig.isActive) {
        vscode.window.showWarningMessage('Bootstrap IntelliSense is disabled');
        return;
      }
      if (!languageSupport.includes(editor.document.languageId)) {
        vscode.window.showWarningMessage(
          `Bootstrap IntelliSense does not support language "${editor.document.languageId}"`,
        );
        return;
      }

      const edits = getSortEditsForDocument(editor.document);
      if (edits.length === 0) {
        vscode.window.showInformationMessage('Bootstrap IntelliSense: classes are already sorted');
        return;
      }

      await editor.edit((editBuilder) => {
        for (const edit of edits) {
          editBuilder.replace(edit.range, edit.newText);
        }
      });
    }),
    // Sort Bootstrap classes when a supported document is saved, if enabled.
    vscode.workspace.onWillSaveTextDocument((event) => {
      const currentConfig = config.getBootstrapConfig();
      if (!currentConfig.isActive || !currentConfig.sortOnSave) {
        return;
      }
      if (!languageSupport.includes(event.document.languageId)) {
        return;
      }

      event.waitUntil(Promise.resolve(getSortEditsForDocument(event.document)));
    }),
    vscode.commands.registerCommand('bootstrap-intelliSense.reloadCache', async () => {
      const cacheDeleted = deleteAllBootstrapCaches();

      const currentConfig = config.getBootstrapConfig();
      updateLanguageSupport(currentConfig.languageSupport);
      await recreateProviders(
        context,
        currentConfig.isActive ?? true,
        currentConfig.version,
        currentConfig.useLocalFile ?? false,
        currentConfig.cssFilePath ?? '',
      );

      if (currentConfig.isActive) {
        vscode.window.showInformationMessage(
          cacheDeleted
            ? 'Bootstrap IntelliSense: class cache cleared and reloaded'
            : 'Bootstrap IntelliSense: providers reloaded (no cache files found)',
        );
      } else {
        vscode.window.showInformationMessage(
          cacheDeleted
            ? 'Bootstrap IntelliSense: class cache cleared'
            : 'Bootstrap IntelliSense: no cache files found to clear',
        );
      }
    }),
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (!e.affectsConfiguration('bootstrapIntelliSense')) {
        return;
      }

      // sortOnSave is read at save time; toggling it must not reload providers.
      if (!configurationAffectsProviders(e)) {
        return;
      }

      const newConfig = config.getBootstrapConfig();
      updateLanguageSupport(newConfig.languageSupport);
      await recreateProviders(
        context,
        newConfig.isActive ?? true,
        newConfig.version,
        newConfig.useLocalFile ?? false,
        newConfig.cssFilePath ?? '',
      );
    }),
    statusBar,
  );
}

export function deactivate() {
  if (completionProvider) {
    completionProvider.dispose();
    completionProvider = undefined;
  }
  if (hoverProvider) {
    hoverProvider.dispose();
    hoverProvider = undefined;
  }
  if (colorDecorator) {
    colorDecorator.dispose();
    colorDecorator = undefined;
  }
  container.clear();
}
