import * as vscode from 'vscode';
import { StatusBar } from './features/statusBar/statusBar';
import { Menu } from './features/menu/menu';
import { CompletionProvider } from './features/completion/completionProvider';
import { Logger, LogLevel } from './core/logger';
import { Container } from './core/container';
import { Config } from './core/config';

let completionProvider: CompletionProvider | undefined;
const container = Container.getInstance();
const logger = Logger.getInstance();
const config = Config.getInstance();

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

    // Create and register completion provider
    completionProvider = new CompletionProvider(
      bootstrapConfig.isActive,
      bootstrapConfig.version,
      bootstrapConfig.showSuggestions,
      bootstrapConfig.autoComplete,
    );
    container.register('completionProvider', completionProvider);

    // Only register if active
    if (bootstrapConfig.isActive) {
      completionProvider.register(context);
      logger.log(LogLevel.INFO, 'Completion provider registered successfully');
    }

    // Subscribe to status changes
    statusBar.subscribe((isActive) => {
      try {
        if (completionProvider) {
          completionProvider.dispose();

          if (isActive) {
            const currentConfig = config.getBootstrapConfig();
            completionProvider = new CompletionProvider(
              true,
              currentConfig.version,
              currentConfig.showSuggestions,
              currentConfig.autoComplete,
            );
            container.register('completionProvider', completionProvider);
            completionProvider.register(context);
            logger.log(LogLevel.INFO, 'Completion provider updated successfully');
          }
        }
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

            if (completionProvider) {
              completionProvider.dispose();
              completionProvider = new CompletionProvider(
                newConfig.isActive,
                newConfig.version,
                newConfig.showSuggestions,
                newConfig.autoComplete,
              );
              container.register('completionProvider', completionProvider);

              if (newConfig.isActive) {
                completionProvider.register(context);
              }
            }
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
  logger.dispose();
  container.clear();
}
