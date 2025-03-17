import * as vscode from 'vscode';
import { StatusBar } from './features/statusBar/statusBar';
import { Menu } from './features/menu/menu';
import { CompletionProvider, languageSupport } from './features/completion/completionProvider';
import { HoverProvider } from './features/hover/hoverProvider';
import { BootstrapFormatter } from './features/formatter/bootstrapFormatter';
import { Logger, LogLevel } from './core/logger';
import { Container } from './core/container';
import { Config } from './core/config';

let completionProvider: CompletionProvider | undefined;
let hoverProvider: HoverProvider | undefined;
let formatter: BootstrapFormatter | undefined;
const container = Container.getInstance();
const logger = Logger.getInstance();
const config = Config.getInstance();

// Hilfsfunktion zur Erstellung und Registrierung von Providern
function createAndRegisterProviders(context: vscode.ExtensionContext, isActive: boolean, bootstrapConfig: any) {
  if (completionProvider) {
    completionProvider.dispose();
  }
  if (hoverProvider) {
    hoverProvider.dispose();
  }

  if (isActive) {
    completionProvider = new CompletionProvider(
      true,
      bootstrapConfig.version,
      bootstrapConfig.showSuggestions,
      bootstrapConfig.autoComplete,
    );
    hoverProvider = new HoverProvider(true, bootstrapConfig.version);

    container.register('completionProvider', completionProvider);
    container.register('hoverProvider', hoverProvider);

    completionProvider.register(context);
    hoverProvider.register(context);
    logger.log(LogLevel.INFO, 'Providers updated successfully');
  }
}

export async function activate(context: vscode.ExtensionContext) {
  try {
    logger.log(LogLevel.INFO, 'Activating Bootstrap IntelliSense extension');

    // Register core dependencies
    container.register('logger', logger);
    container.register('context', context);
    container.register('config', config);

    // Get configuration
    const bootstrapConfig = config.getBootstrapConfig();
    logger.log(LogLevel.INFO, `Using Bootstrap version: ${bootstrapConfig.version}`);

    // Initialize features with DI
    const statusBar = new StatusBar();
    container.register('statusBar', statusBar);

    const menu = new Menu(statusBar);
    container.register('menu', menu);

    // Create and register formatter
    formatter = new BootstrapFormatter();
    container.register('formatter', formatter);

    // Register providers if active
    if (bootstrapConfig.isActive) {
      createAndRegisterProviders(context, true, bootstrapConfig);

      // Register formatter for supported languages
      const formatterDisposable = vscode.languages.registerDocumentFormattingEditProvider(languageSupport, formatter);

      const formatOnSaveDisposable = vscode.workspace.onWillSaveTextDocument((event) => {
        if (languageSupport.includes(event.document.languageId)) {
          event.waitUntil(Promise.resolve(formatter?.provideDocumentFormattingEdits(event.document) || []));
        }
      });

      context.subscriptions.push(formatterDisposable, formatOnSaveDisposable);
      logger.log(LogLevel.INFO, 'All providers registered successfully');
    }

    // Subscribe to status changes
    statusBar.subscribe((isActive) => {
      try {
        const currentConfig = config.getBootstrapConfig();
        createAndRegisterProviders(context, isActive, currentConfig);
      } catch (error) {
        logger.log(LogLevel.ERROR, 'Failed to update Bootstrap IntelliSense status', error as Error);
      }
    });

    // Register commands
    let mainMenuCommand = vscode.commands.registerCommand('bootstrap-intelliSense.showMainMenu', async () => {
      try {
        const menu = container.get<Menu>('menu');
        await menu.showMainMenu();
        logger.log(LogLevel.INFO, 'Main menu displayed successfully');
      } catch (error) {
        logger.log(LogLevel.ERROR, 'Failed to show main menu', error as Error);
      }
    });

    // Register configuration change handler
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('bootstrapIntelliSense')) {
          try {
            const newConfig = config.getBootstrapConfig();
            logger.log(LogLevel.INFO, 'Configuration changed, updating components');
            createAndRegisterProviders(context, newConfig.isActive, newConfig);
          } catch (error) {
            logger.log(LogLevel.ERROR, 'Failed to update configuration', error as Error);
          }
        }
      }),
    );

    context.subscriptions.push(mainMenuCommand);
    context.subscriptions.push(statusBar);
    context.subscriptions.push(logger);

    logger.log(LogLevel.INFO, 'Bootstrap IntelliSense extension activated successfully');
  } catch (error) {
    logger.log(LogLevel.ERROR, 'Failed to activate Bootstrap IntelliSense', error as Error);
  }
}

export function deactivate() {
  logger.log(LogLevel.INFO, 'Deactivating Bootstrap IntelliSense extension');
  if (completionProvider) {
    completionProvider.dispose();
    completionProvider = undefined;
  }
  if (hoverProvider) {
    hoverProvider.dispose();
    hoverProvider = undefined;
  }
  logger.dispose();
  container.clear();
}
