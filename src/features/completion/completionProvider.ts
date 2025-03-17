import * as vscode from 'vscode';
import { getClasses } from '../../core/bootstrap';
import { Logger, LogLevel } from '../../core/logger';

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
          item.detail = 'Bootstrap IntelliSense';
          item.documentation = new vscode.MarkdownString().appendCodeblock(classProperties, 'css');
          item.insertText = this.autoComplete ? className : '';
          item.sortText = '0' + className;
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
