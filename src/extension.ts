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
  }
}

export async function activate(context: vscode.ExtensionContext) {
  try {
    // Register core dependencies
    container.register('context', context);
    container.register('config', config);

    // Get configuration
    const bootstrapConfig = config.getBootstrapConfig();

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

      const formatOnSaveDisposable = vscode.workspace.onWillSaveTextDocument(async (event) => {
        if (languageSupport.includes(event.document.languageId)) {
          const bootstrapConfig = config.getBootstrapConfig();
          if (bootstrapConfig.formatOnSave && formatter) {
            // Prüfe, ob es sich um einen manuellen Speichervorgang handelt
            const isManualSave = event.reason === vscode.TextDocumentSaveReason.Manual;
            if (isManualSave) {
              const edits = formatter.provideDocumentFormattingEdits(event.document);
              if (edits.length > 0) {
                const edit = new vscode.WorkspaceEdit();
                edits.forEach((e) => edit.replace(event.document.uri, e.range, e.newText));
                await vscode.workspace.applyEdit(edit);
              }
            }
          }
        }
      });

      context.subscriptions.push(formatterDisposable, formatOnSaveDisposable);
    }

    // Subscribe to status changes
    statusBar.subscribe((isActive) => {
      try {
        const currentConfig = config.getBootstrapConfig();
        createAndRegisterProviders(context, isActive, currentConfig);
        if (formatter) {
          formatter.updateConfig(isActive);

          // Aktualisiere die Formatierungsfunktion
          if (isActive) {
            const formatterDisposable = vscode.languages.registerDocumentFormattingEditProvider(
              languageSupport,
              formatter,
            );
            const formatOnSaveDisposable = vscode.workspace.onWillSaveTextDocument(async (event) => {
              if (languageSupport.includes(event.document.languageId)) {
                const bootstrapConfig = config.getBootstrapConfig();
                if (bootstrapConfig.formatOnSave && formatter) {
                  const isManualSave = event.reason === vscode.TextDocumentSaveReason.Manual;
                  if (isManualSave) {
                    const edits = formatter.provideDocumentFormattingEdits(event.document);
                    if (edits.length > 0) {
                      const edit = new vscode.WorkspaceEdit();
                      edits.forEach((e) => edit.replace(event.document.uri, e.range, e.newText));
                      await vscode.workspace.applyEdit(edit);
                    }
                  }
                }
              }
            });
            context.subscriptions.push(formatterDisposable, formatOnSaveDisposable);
          }
        }
      } catch (error) {}
    });

    // Register commands
    let mainMenuCommand = vscode.commands.registerCommand('bootstrap-intelliSense.showMainMenu', async () => {
      try {
        const menu = container.get<Menu>('menu');
        await menu.showMainMenu();
      } catch (error) {}
    });

    // Register configuration change handler
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('bootstrapIntelliSense')) {
          try {
            const newConfig = config.getBootstrapConfig();
            createAndRegisterProviders(context, newConfig.isActive, newConfig);
            if (formatter) {
              formatter.updateConfig(newConfig.isActive);
            }
          } catch (error) {}
        }
      }),
    );

    context.subscriptions.push(mainMenuCommand);
    context.subscriptions.push(statusBar);
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
