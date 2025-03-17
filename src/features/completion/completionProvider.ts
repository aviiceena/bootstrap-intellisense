import * as vscode from 'vscode';
import { getClasses } from '../../core/bootstrap';
import { Logger, LogLevel } from '../../core/logger';

export const languageSupport = [
  // HTML und Template-Sprachen
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

  // JavaScript/TypeScript
  'javascript',
  'javascriptreact',
  'typescript',
  'typescriptreact',

  // Framework-spezifisch
  'vue',
  'svelte',
  'astro',
  'razor',
  'cshtml',
  'aspnetcorerazor',

  // Stylesheet-Sprachen
  'css',
  'scss',
  'sass',
  'less',
  'stylus',

  // Template-Engines
  'jinja',
  'jinja2',
  'jinja-html',
  'edge',
  'markdown',

  // Web Components
  'glimmer-js',
  'glimmer-ts',
];

export class CompletionProvider {
  private provider: vscode.Disposable | undefined;
  private cachedClasses: { className: string; classProperties: string }[] | undefined;
  private logger: Logger;

  constructor(
    private isActive: boolean,
    private bootstrapVersion: string,
    private showSuggestions: boolean = true,
    private autoComplete: boolean = true,
  ) {
    this.logger = Logger.getInstance();
    this.logger.log(LogLevel.INFO, 'CompletionProvider constructed', {
      isActive,
      bootstrapVersion,
      showSuggestions,
      autoComplete,
    });
  }

  public register(context: vscode.ExtensionContext): vscode.Disposable | undefined {
    this.logger.log(LogLevel.INFO, 'Register called', { isActive: this.isActive });
    this.dispose();

    if (!this.isActive) {
      this.logger.log(LogLevel.INFO, 'Provider not registered, inactive');
      return undefined;
    }

    this.provider = vscode.languages.registerCompletionItemProvider(
      languageSupport,
      {
        provideCompletionItems: async (document: vscode.TextDocument, position: vscode.Position) => {
          this.logger.log(LogLevel.DEBUG, 'provideCompletionItems called', {
            isActive: this.isActive,
            hasProvider: !!this.provider,
            documentUri: document.uri.toString(),
          });

          if (!this.isActive || !this.provider) {
            this.logger.log(LogLevel.DEBUG, 'Early exit - inactive or no provider');
            return [];
          }

          try {
            return await this.provideCompletionItems(document, position);
          } catch (error) {
            this.logger.log(LogLevel.ERROR, 'Error in provideCompletionItems', error as Error);
            return [];
          }
        },
      },
      '"',
      "'",
      ' ',
      '=',
    );

    this.logger.log(LogLevel.INFO, 'Provider successfully registered');
    return this.provider;
  }

  public dispose() {
    this.logger.log(LogLevel.INFO, 'Dispose called');
    if (this.provider) {
      this.provider.dispose();
      this.provider = undefined;
    }
    this.cachedClasses = undefined;
  }

  private shouldProvideCompletion(document: vscode.TextDocument, position: vscode.Position): boolean {
    this.logger.log(LogLevel.DEBUG, 'shouldProvideCompletion called');

    if (!this.isActive) {
      this.logger.log(LogLevel.DEBUG, 'Completion aborted - Extension inactive');
      return false;
    }

    if (!this.showSuggestions) {
      this.logger.log(LogLevel.DEBUG, 'Completion aborted - Suggestions disabled');
      return false;
    }

    try {
      const line = document.lineAt(position.line);
      const beforeRange = new vscode.Range(new vscode.Position(position.line, 0), position);
      const textBefore = document.getText(beforeRange);
      const shouldProvide = /class(?:Name)?=["']?[^"']*$/.test(textBefore);
      this.logger.log(LogLevel.DEBUG, 'shouldProvideCompletion result', { shouldProvide, textBefore });
      return shouldProvide;
    } catch (error) {
      this.logger.log(LogLevel.ERROR, 'Error in shouldProvideCompletion', error as Error);
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
    this.logger.log(LogLevel.DEBUG, 'provideCompletionItems (inner) called');

    if (!this.shouldProvideCompletion(document, position)) {
      this.logger.log(LogLevel.DEBUG, 'Completion aborted - shouldProvideCompletion false');
      return [];
    }

    try {
      if (!this.cachedClasses && this.isActive) {
        this.logger.log(LogLevel.INFO, 'Loading Bootstrap classes...');
        this.cachedClasses = await getClasses(this.bootstrapVersion);
        this.logger.log(LogLevel.INFO, 'Bootstrap classes loaded', {
          numberOfClasses: this.cachedClasses?.length,
        });
      }

      if (!this.cachedClasses) {
        this.logger.log(LogLevel.WARNING, 'No classes available in cache');
        return [];
      }

      const beforeRange = new vscode.Range(new vscode.Position(position.line, 0), position);
      const textBefore = document.getText(beforeRange);
      const match = textBefore.match(/class(?:Name)?=["']([^"']*)$/);
      const usedClasses = match ? match[1].split(' ').filter((c) => c.trim()) : [];

      this.logger.log(LogLevel.DEBUG, 'Completion context', {
        textBefore,
        match: !!match,
        numberOfUsedClasses: usedClasses.length,
      });

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
      this.logger.log(LogLevel.ERROR, 'Error creating completion items', error as Error);
      return [];
    }
  }

  public updateVersion(version: string) {
    this.logger.log(LogLevel.INFO, 'Version being updated', {
      oldVersion: this.bootstrapVersion,
      newVersion: version,
    });
    this.bootstrapVersion = version;
    this.cachedClasses = undefined;
  }

  public updateConfig(isActive: boolean, showSuggestions: boolean, autoComplete: boolean) {
    this.logger.log(LogLevel.INFO, 'Configuration being updated', {
      isActive,
      showSuggestions,
      autoComplete,
    });
    this.isActive = isActive;
    this.showSuggestions = showSuggestions;
    this.autoComplete = autoComplete;
  }
}
