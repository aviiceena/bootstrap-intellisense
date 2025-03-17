import * as vscode from 'vscode';
import { getClasses } from '../../core/bootstrap';
import { Logger, LogLevel } from '../../core/logger';

export class HoverProvider {
  private provider: vscode.Disposable | undefined;
  private cachedClasses: { className: string; classProperties: string }[] | undefined;
  private logger: Logger;

  constructor(private isActive: boolean, private bootstrapVersion: string) {
    this.logger = Logger.getInstance();
  }

  public register(context: vscode.ExtensionContext): vscode.Disposable | undefined {
    this.dispose();

    if (!this.isActive) {
      return undefined;
    }

    this.provider = vscode.languages.registerHoverProvider(
      [
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
      ],
      {
        provideHover: async (document, position, token) => {
          return await this.provideHover(document, position);
        },
      },
    );

    return this.provider;
  }

  private async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<vscode.Hover | undefined> {
    if (!this.isActive) {
      return undefined;
    }

    try {
      const range = document.getWordRangeAtPosition(position);
      if (!range) {
        return undefined;
      }

      const line = document.lineAt(position.line);
      const lineText = line.text;

      // Prüfen, ob wir uns in einem class-Attribut befinden
      if (!this.isWithinClassAttribute(lineText, position.character)) {
        return undefined;
      }

      const word = document.getText(range);

      if (!this.cachedClasses) {
        this.cachedClasses = await getClasses(this.bootstrapVersion);
      }

      const classInfo = this.cachedClasses.find((c) => c.className === word);
      if (!classInfo) {
        return undefined;
      }

      const content = new vscode.MarkdownString();
      content.appendCodeblock(classInfo.classProperties, 'css');

      return new vscode.Hover(content, range);
    } catch (error) {
      this.logger.log(LogLevel.ERROR, 'Error in provideHover', error as Error);
      return undefined;
    }
  }

  private isWithinClassAttribute(lineText: string, position: number): boolean {
    const beforePosition = lineText.substring(0, position);
    const classMatch = beforePosition.match(/class(?:Name)?=["'][^"']*$/);
    return !!classMatch;
  }

  public dispose() {
    if (this.provider) {
      this.provider.dispose();
      this.provider = undefined;
    }
    this.cachedClasses = undefined;
  }

  public updateVersion(version: string) {
    this.bootstrapVersion = version;
    this.cachedClasses = undefined;
  }

  public updateConfig(isActive: boolean) {
    this.isActive = isActive;
  }
}
