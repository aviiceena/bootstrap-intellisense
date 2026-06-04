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

let completionProvider: CompletionProvider | undefined;
let hoverProvider: HoverProvider | undefined;
let colorDecorator: ColorDecorator | undefined;
const container = Container.getInstance();
const config = Config.getInstance();

// Function to completely recreate all providers
function recreateProviders(
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
    completionProvider = new CompletionProvider(
      isActive,
      version,
      config.get<boolean>('showSuggestions') ?? true,
      config.get<boolean>('autoComplete') ?? true,
      useLocalFile,
      cssFilePath,
    );

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
      void colorDecorator.register(context);
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
    recreateProviders(
      context,
      bootstrapConfig.isActive ?? true,
      bootstrapConfig.version,
      bootstrapConfig.useLocalFile ?? false,
      bootstrapConfig.cssFilePath ?? '',
    );
  }

  // Subscribe to status changes
  statusBar.subscribe((isActive, useLocalFile, cssFilePath, version, languageSupportList) => {
    // Update language support
    updateLanguageSupport(languageSupportList);

    // Recreate all providers
    recreateProviders(context, isActive, version, useLocalFile, cssFilePath);
  });

  // Register commands and configuration change handler
  context.subscriptions.push(
    vscode.commands.registerCommand('bootstrap-intelliSense.showMainMenu', async () => {
      const menu = container.get<Menu>('menu');
      await menu.showMainMenu();
    }),
    vscode.commands.registerCommand('bootstrap-intelliSense.reloadCache', async () => {
      deleteAllBootstrapCaches();

      const currentConfig = config.getBootstrapConfig();
      updateLanguageSupport(currentConfig.languageSupport);
      recreateProviders(
        context,
        currentConfig.isActive ?? true,
        currentConfig.version,
        currentConfig.useLocalFile ?? false,
        currentConfig.cssFilePath ?? '',
      );

      vscode.window.showInformationMessage('Bootstrap IntelliSense: class cache cleared and reloaded');
    }),
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration('bootstrapIntelliSense')) {
        const newConfig = config.getBootstrapConfig();

        // Update language support from settings
        updateLanguageSupport(newConfig.languageSupport);

        // Recreate all providers
        recreateProviders(
          context,
          newConfig.isActive ?? true,
          newConfig.version,
          newConfig.useLocalFile ?? false,
          newConfig.cssFilePath ?? '',
        );
      }
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
