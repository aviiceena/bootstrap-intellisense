import * as vscode from 'vscode';
import { getClasses } from '../../core/bootstrap';

export const languageSupport = [
  // HTML and templating languages
  'html',
  'php',
  'handlebars',
  'vue-html',
  'django-html',
  'blade',
  'twig',
  'erb',
  'ejs',
  'nunjucks',
  'mustache',
  'liquid',
  'pug',
  'jade',
  'haml',
  'slim',
  'jinja',
  'jinja2',
  'jinja-html',
  'edge',
  'markdown',

  // JavaScript/TypeScript
  'javascript',
  'javascriptreact',
  'typescript',
  'typescriptreact',

  // Framework-specific languages
  'angular',
  'vue',
  'svelte',
  'astro',
  'razor',
  'cshtml',
  'aspnetcorerazor',

  // Stylesheet-languages
  'css',
  'scss',
  'sass',
  'less',
  'stylus',

  // Web Components
  'glimmer-js',
  'glimmer-ts',
];

export class CompletionProvider {
  private provider: vscode.Disposable | undefined;
  private cachedClasses: { className: string; classProperties: string }[] | undefined;

  constructor(
    private isActive: boolean,
    private bootstrapVersion: string,
    private showSuggestions: boolean = true,
    private autoComplete: boolean = true,
  ) {}

  public register(context: vscode.ExtensionContext): vscode.Disposable | undefined {
    this.dispose();

    if (!this.isActive) {
      return undefined;
    }

    this.provider = vscode.languages.registerCompletionItemProvider(
      languageSupport,
      {
        provideCompletionItems: async (document: vscode.TextDocument, position: vscode.Position) => {
          if (!this.isActive || !this.provider) {
            return [];
          }

          try {
            return await this.provideCompletionItems(document, position);
          } catch (error) {
            return [];
          }
        },
      },
      '"',
      "'",
      ' ',
      '=',
    );

    return this.provider;
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

    try {
      const line = document.lineAt(position.line);
      const beforeRange = new vscode.Range(new vscode.Position(position.line, 0), position);
      const textBefore = document.getText(beforeRange);
      const shouldProvide = /class(?:Name)?=["']?[^"']*$/.test(textBefore);
      return shouldProvide;
    } catch (error) {
      return false;
    }
  }

  private getClassCategory(className: string): string {
    // Layout-Klassen
    if (/^(container|row|col|grid|flex|d-|order-|offset-|g-)/.test(className)) {
      return '1-layout';
    }

    // Komponenten
    if (/^(btn|card|nav|navbar|modal|form|input|dropdown|alert|badge|list|table)/.test(className)) {
      return '2-components';
    }

    // Utilities
    if (/^(m-|p-|text-|bg-|border|rounded|shadow|w-|h-|position-|float-|align|justify)/.test(className)) {
      return '3-utilities';
    }

    // Sonstiges
    return '4-other';
  }

  private async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<vscode.CompletionItem[]> {
    if (!this.shouldProvideCompletion(document, position)) {
      return [];
    }

    try {
      if (!this.cachedClasses && this.isActive) {
        this.cachedClasses = await getClasses(this.bootstrapVersion);
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
          item.sortText = `${this.getClassCategory(className)}-${className}`;
          return item;
        });
    } catch (error) {
      return [];
    }
  }

  public updateVersion(version: string) {
    this.bootstrapVersion = version;
    this.cachedClasses = undefined;
  }

  public updateConfig(isActive: boolean, showSuggestions: boolean, autoComplete: boolean) {
    this.isActive = isActive;
    this.showSuggestions = showSuggestions;
    this.autoComplete = autoComplete;
  }
}
