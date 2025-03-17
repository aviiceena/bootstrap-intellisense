import * as vscode from 'vscode';
import { StatusBar } from './features/statusBar/statusBar';
import { Menu } from './features/menu/menu';
import { CompletionProvider } from './features/completion/completionProvider';
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

    // Create and register hover provider
    hoverProvider = new HoverProvider(bootstrapConfig.isActive, bootstrapConfig.version);
    container.register('hoverProvider', hoverProvider);

    // Create and register formatter
    formatter = new BootstrapFormatter();
    container.register('formatter', formatter);

    // Only register if active
    if (bootstrapConfig.isActive) {
      completionProvider.register(context);
      hoverProvider.register(context);

      // Register formatter for supported languages
      const supportedLanguages = [
        'html',
        'php',
        'handlebars',
        'javascript',
        'javascriptreact',
        'typescript',
        'typescriptreact',
        'vue',
        'vue-html',
        'svelte',
        'astro',
        'twig',
        'erb',
        'django-html',
        'blade',
        'razor',
        'ejs',
        'markdown',
      ];

      // Register formatter for normal formatting command
      const formatterDisposable = vscode.languages.registerDocumentFormattingEditProvider(
        supportedLanguages,
        formatter,
      );

      // Register formatter for formatting on save
      const formatOnSaveDisposable = vscode.workspace.onWillSaveTextDocument((event) => {
        if (supportedLanguages.includes(event.document.languageId)) {
          event.waitUntil(Promise.resolve(formatter?.provideDocumentFormattingEdits(event.document) || []));
        }
      });

      context.subscriptions.push(formatterDisposable, formatOnSaveDisposable);

      logger.log(LogLevel.INFO, 'All providers registered successfully');
    }

    // Subscribe to status changes
    statusBar.subscribe((isActive) => {
      try {
        if (completionProvider && hoverProvider) {
          completionProvider.dispose();
          hoverProvider.dispose();

          if (isActive) {
            const currentConfig = config.getBootstrapConfig();
            completionProvider = new CompletionProvider(
              true,
              currentConfig.version,
              currentConfig.showSuggestions,
              currentConfig.autoComplete,
            );
            hoverProvider = new HoverProvider(true, currentConfig.version);

            container.register('completionProvider', completionProvider);
            container.register('hoverProvider', hoverProvider);

            completionProvider.register(context);
            hoverProvider.register(context);
            logger.log(LogLevel.INFO, 'Providers updated successfully');
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
  if (hoverProvider) {
    hoverProvider.dispose();
    hoverProvider = undefined;
  }
  logger.dispose();
  container.clear();
}
