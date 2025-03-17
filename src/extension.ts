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

function createAndRegisterProviders(context: vscode.ExtensionContext, isActive: boolean, bootstrapConfig: any) {
  if (completionProvider) {
    completionProvider.dispose();
  }
  if (hoverProvider) {
    hoverProvider.dispose();
  }

  if (!isActive) {
    return;
  }

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
      createAndRegisterProviders(context, true, bootstrapConfig);
      registerFormatter(context, formatter, config);
    }

    // Subscribe to status changes
    statusBar.subscribe((isActive) => {
      try {
        const currentConfig = config.getBootstrapConfig();
        createAndRegisterProviders(context, isActive, currentConfig);
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
            createAndRegisterProviders(context, newConfig.isActive, newConfig);
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
