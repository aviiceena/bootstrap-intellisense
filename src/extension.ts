import * as vscode from 'vscode';
import {
  createStatusBarItem,
  showMainMenu,
  isExtensionActive,
  subscribeToExtensionStatus,
  bootstrapVersion,
} from './statusBar';
import { getClasses } from './bootstrap';

let statusBarItem: vscode.StatusBarItem;
let completionProvider: vscode.Disposable | undefined;
const languageSupport = [
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
  'css',
  'scss',
  'sass',
  'less',
  'stylus',
  'jade',
  'pug',
  'haml',
  'slim',
  'liquid',
  'edge',
  'jinja',
  'j2',
  'asp',
  'jinja-html',
  'jar',
  'lava',
];

const provideCompletionItems = (
  document: vscode.TextDocument,
  position: vscode.Position,
): Promise<vscode.CompletionItem[]> | undefined => {
  const classRegex = /class(?:Name)?\s*=\s*['"]([^'"]*)$/;

  if (isExtensionActive && !bootstrapVersion) {
    vscode.window.showInformationMessage('Please select a version of Bootstrap');
    return Promise.resolve([]);
  } else if (isExtensionActive) {
    {
      return new Promise(async (resolve, reject) => {
        try {
          const lineText = document.lineAt(position.line).text;
          const textBeforeCursor = lineText.slice(0, position.character);

          const matches = classRegex.exec(textBeforeCursor);
          if (!matches || !matches[1]) {
            resolve([]);
            return;
          }

          const usedClasses = (matches[1] || '').split(' ').filter((cls) => cls.trim() !== '');
          const availableClasses = (await getClasses()) || [];

          const completionItems = availableClasses
            .filter(({ className }) => !usedClasses.includes(className))
            .map(({ className, classProperties }) => {
              const item = new vscode.CompletionItem(className, vscode.CompletionItemKind.Value);
              item.detail = 'Bootstrap IntelliSense';
              item.documentation = new vscode.MarkdownString().appendCodeblock(classProperties, 'css');
              item.insertText = className;
              return item;
            });

          resolve(completionItems);
        } catch (error) {
          console.error('Error in provideCompletionItems:', (error as Error).message, (error as Error).stack);
          reject([]);
        }
      });
    }
  } else {
    return undefined;
  }
};

function registerCompletionProvider(context: vscode.ExtensionContext) {
  if (completionProvider) {
    completionProvider.dispose();
    completionProvider = undefined;
  }

  if (isExtensionActive) {
    completionProvider = vscode.languages.registerCompletionItemProvider(
      languageSupport,
      {
        provideCompletionItems,
      },
      '"',
      "'",
      ' ',
    );
    context.subscriptions.push(completionProvider);
  }
}

export function activate(context: vscode.ExtensionContext) {
  statusBarItem = createStatusBarItem();
  context.subscriptions.push(statusBarItem);

  let mainMenuCommand = vscode.commands.registerCommand('bootstrap-intelliSense.showMainMenu', async () => {
    await showMainMenu(statusBarItem);
  });
  context.subscriptions.push(mainMenuCommand);

  registerCompletionProvider(context);

  subscribeToExtensionStatus((isActive: boolean) => {
    registerCompletionProvider(context);
  });
}

export function deactivate() {
  if (completionProvider) {
    completionProvider.dispose();
  }
}
