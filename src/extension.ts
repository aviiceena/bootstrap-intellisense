import * as vscode from 'vscode';
import { StatusBar } from './features/statusBar/statusBar';
import { Menu } from './features/menu/menu';
import { CompletionProvider, languageSupport, updateLanguageSupport } from './features/completion/completionProvider';
import { HoverProvider } from './features/hover/hoverProvider';
import { Container } from './core/container';
import { Config } from './core/config';

let completionProvider: CompletionProvider | undefined;
let hoverProvider: HoverProvider | undefined;
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

    // Update HoverProvider
    if (hoverProvider) {
      hoverProvider.dispose();
    }
    hoverProvider = new HoverProvider(isActive, version);
    container.register('hoverProvider', hoverProvider);
    hoverProvider.register(context);
  } else {
    // If extension is not active, dispose of hover provider
    if (hoverProvider) {
      hoverProvider.dispose();
      hoverProvider = undefined;
    }
  }
}

export async function activate(context: vscode.ExtensionContext) {
  // Register core dependencies
  container.register('context', context);
  container.register('config', config);

  const bootstrapConfig = config.getBootstrapConfig();

  // Initialize language support from settings
  updateLanguageSupport(bootstrapConfig.languageSupport);

  // Initialize features
  const statusBar = new StatusBar();
  const menu = new Menu(statusBar);

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
  container.clear();
}
