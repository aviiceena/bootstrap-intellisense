import * as vscode from 'vscode';
import { getClasses } from '../../core/bootstrap';
import { Config } from '../../core/config';

// Default languages supported if no user settings are present
export const defaultLanguageSupport: string[] = [
  'html',
  'css',
  'php',
  'javascript',
  'javascriptreact',
  'typescript',
  'typescriptreact',
  'vue',
  'svelte',
  'handlebars',
  'razor',
];

// The actually active languages, loaded from settings
export let languageSupport: string[] = [];

export function updateLanguageSupport(languages?: string[]) {
  if (languages && languages.length > 0) {
    languageSupport = [...languages];
  } else {
    // Use the defined default languages if no settings are present
    languageSupport = [...defaultLanguageSupport];
  }
}

export class CompletionProvider {
  private provider: vscode.Disposable | undefined;
  private cachedClasses: { className: string; classProperties: string }[] | undefined;
  private useLocalFile: boolean = false;
  private cssFilePath: string = '';

  constructor(
    private isActive: boolean,
    private bootstrapVersion: string,
    private showSuggestions: boolean = true,
    private autoComplete: boolean = true,
    useLocalFile: boolean = false,
    cssFilePath: string = '',
  ) {
    this.useLocalFile = useLocalFile;
    this.cssFilePath = cssFilePath;

    // DO NOT reload languages here as this could overwrite current settings
    // Languages are already updated in extension.ts before creating the provider
  }

  public register(context: vscode.ExtensionContext): vscode.Disposable | undefined {
    if (this.isActive && this.showSuggestions) {
      this.provider = vscode.languages.registerCompletionItemProvider(
        languageSupport,
        {
          provideCompletionItems: this.provideCompletionItems.bind(this),
        },
        '"',
        "'",
        '=',
        ' ',
      );
      context.subscriptions.push(this.provider);
      return this.provider;
    }
    return undefined;
  }

  public dispose() {
    if (this.provider) {
      this.provider.dispose();
      this.provider = undefined;
    }
    this.cachedClasses = undefined;
  }

  private shouldProvideCompletion(document: vscode.TextDocument, position: vscode.Position): boolean {
    if (!this.isActive) {
      return false;
    }

    if (!this.showSuggestions) {
      return false;
    }

    // Check if the current language is supported
    if (!languageSupport.includes(document.languageId)) {
      return false;
    }

    const beforeRange = new vscode.Range(new vscode.Position(position.line, 0), position);
    const textBefore = document.getText(beforeRange);
    const shouldProvide = /class(?:Name)?=["']?[^"']*$/.test(textBefore);
    return shouldProvide;
  }

  private getClassCategory(className: string): string {
    // Layout classes
    if (/^(container|row|col|grid|flex|d-|order-|offset-|g-)/.test(className)) {
      return '1-layout';
    }

    // Components
    if (/^(btn|card|nav|navbar|modal|form|input|dropdown|alert|badge|list|table)/.test(className)) {
      return '2-components';
    }

    // Utilities
    if (/^(m-|p-|text-|bg-|border|rounded|shadow|w-|h-|position-|float-|align|justify)/.test(className)) {
      return '3-utilities';
    }

    // Other
    return '4-other';
  }

  private getClassParts(className: string): number {
    return className.split('-').length;
  }

  private async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<vscode.CompletionItem[]> {
    if (!this.shouldProvideCompletion(document, position)) {
      return [];
    }

    if (!this.cachedClasses && this.isActive) {
      this.cachedClasses = await getClasses(this.bootstrapVersion, this.useLocalFile, this.cssFilePath);
    }

    if (!this.cachedClasses) {
      return [];
    }

    const beforeRange = new vscode.Range(new vscode.Position(position.line, 0), position);
    const textBefore = document.getText(beforeRange);
    const match = textBefore.match(/class(?:Name)?=["']([^"']*)$/);
    const usedClasses = match ? match[1].split(' ').filter((c) => c.trim()) : [];

    return this.cachedClasses
      .filter(({ className }) => !usedClasses.includes(className))
      .map(({ className, classProperties }) => {
        const item = new vscode.CompletionItem(className, vscode.CompletionItemKind.Value);
        item.detail = `Bootstrap ${this.getClassCategory(className).split('-')[1].toUpperCase()}`;
        item.documentation = new vscode.MarkdownString().appendCodeblock(classProperties, 'css');
        item.insertText = this.autoComplete ? className : '';
        const parts = this.getClassParts(className);
        item.sortText = `${parts.toString().padStart(2, '0')}-${className}`;
        return item;
      });
  }

  public updateVersion(version: string) {
    this.bootstrapVersion = version;
    this.useLocalFile = false;
    this.cssFilePath = '';
    this.cachedClasses = undefined;
  }

  public updateLocalFile(cssFilePath: string) {
    this.useLocalFile = true;
    this.cssFilePath = cssFilePath;
    this.cachedClasses = undefined;
  }

  public updateConfig(isActive: boolean, showSuggestions: boolean, autoComplete: boolean) {
    this.isActive = isActive;
    this.showSuggestions = showSuggestions;
    this.autoComplete = autoComplete;
    // Reset cache to ensure fresh class suggestions
    this.cachedClasses = undefined;
  }
}
