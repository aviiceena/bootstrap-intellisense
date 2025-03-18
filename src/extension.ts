import * as vscode from 'vscode';
import { StatusBar } from './features/statusBar/statusBar';
import { Menu } from './features/menu/menu';
import { CompletionProvider, languageSupport } from './features/completion/completionProvider';
import { HoverProvider } from './features/hover/hoverProvider';
import { BootstrapFormatter } from './features/formatter/bootstrapFormatter';
import { Container } from './core/container';
import { Config } from './core/config';

let completionProvider: CompletionProvider | undefined;
let hoverProvider: HoverProvider | undefined;
let formatter: BootstrapFormatter | undefined;
const container = Container.getInstance();
const config = Config.getInstance();

// helper function to apply formatting to the document
async function applyFormatting(document: vscode.TextDocument, formatter: BootstrapFormatter) {
  const edits = formatter.provideDocumentFormattingEdits(document);
  if (edits.length > 0) {
    const edit = new vscode.WorkspaceEdit();
    edits.forEach((e) => edit.replace(document.uri, e.range, e.newText));
    await vscode.workspace.applyEdit(edit);
  }
}

function createFormatOnSaveHandler(formatter: BootstrapFormatter, config: Config) {
  return async (event: vscode.TextDocumentWillSaveEvent) => {
    if (languageSupport.includes(event.document.languageId)) {
      const bootstrapConfig = config.getBootstrapConfig();
      if (bootstrapConfig.formatOnSave && event.reason === vscode.TextDocumentSaveReason.Manual) {
        await applyFormatting(event.document, formatter);
      }
    }
  };
}

function registerFormatter(context: vscode.ExtensionContext, formatter: BootstrapFormatter, config: Config) {
  const formatterDisposable = vscode.languages.registerDocumentFormattingEditProvider(languageSupport, formatter);
  const formatOnSaveDisposable = vscode.workspace.onWillSaveTextDocument(createFormatOnSaveHandler(formatter, config));
  context.subscriptions.push(formatterDisposable, formatOnSaveDisposable);
}

export async function activate(context: vscode.ExtensionContext) {
  try {
    // Register core dependencies
    container.register('context', context);
    container.register('config', config);

    const bootstrapConfig = config.getBootstrapConfig();

    // Initialize features
    const statusBar = new StatusBar();
    const menu = new Menu(statusBar);
    formatter = new BootstrapFormatter();

    container.register('statusBar', statusBar);
    container.register('menu', menu);
    container.register('formatter', formatter);

    if (bootstrapConfig.isActive) {
      // Initialize providers with current configuration
      completionProvider = new CompletionProvider(
        bootstrapConfig.isActive,
        bootstrapConfig.version,
        bootstrapConfig.showSuggestions,
        bootstrapConfig.autoComplete,
        bootstrapConfig.useLocalFile,
        bootstrapConfig.cssFilePath,
      );

      hoverProvider = new HoverProvider(bootstrapConfig.isActive, bootstrapConfig.version);

      container.register('completionProvider', completionProvider);
      container.register('hoverProvider', hoverProvider);

      completionProvider.register(context);
      hoverProvider.register(context);

      registerFormatter(context, formatter, config);
    }

    // Subscribe to status changes
    statusBar.subscribe((isActive, useLocalFile, cssFilePath, version) => {
      try {
        // Explicitly update CompletionProvider with current configuration
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

          if (hoverProvider) {
            hoverProvider.dispose();
          }
          hoverProvider = new HoverProvider(isActive, version);
          container.register('hoverProvider', hoverProvider);
          hoverProvider.register(context);
        }

        if (formatter) {
          formatter.updateConfig(isActive);
          if (isActive) {
            registerFormatter(context, formatter, config);
          }
        }
      } catch (error) {}
    });

    // Register commands and configuration change handler
    context.subscriptions.push(
      vscode.commands.registerCommand('bootstrap-intelliSense.showMainMenu', async () => {
        try {
          const menu = container.get<Menu>('menu');
          await menu.showMainMenu();
        } catch (error) {}
      }),
      vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('bootstrapIntelliSense')) {
          try {
            const newConfig = config.getBootstrapConfig();

            // Recreate providers with the new configuration
            if (completionProvider) {
              completionProvider.dispose();
              completionProvider = undefined;
            }

            if (newConfig.isActive) {
              completionProvider = new CompletionProvider(
                newConfig.isActive,
                newConfig.version,
                newConfig.showSuggestions,
                newConfig.autoComplete,
                newConfig.useLocalFile,
                newConfig.cssFilePath,
              );

              container.register('completionProvider', completionProvider);
              completionProvider.register(context);

              if (hoverProvider) {
                hoverProvider.dispose();
              }
              hoverProvider = new HoverProvider(newConfig.isActive, newConfig.version);
              container.register('hoverProvider', hoverProvider);
              hoverProvider.register(context);
            }

            if (formatter) {
              formatter.updateConfig(newConfig.isActive);
            }
          } catch (error) {}
        }
      }),
      statusBar,
    );
  } catch (error) {}
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
