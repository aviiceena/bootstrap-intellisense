import * as vscode from 'vscode';
import { getClasses } from '../../core/bootstrap';
import { languageSupport } from '../completion/completionProvider';
import { isInsideClassContextAtOffset } from '../../core/classContext';

export class HoverProvider {
  private provider: vscode.Disposable | undefined;
  private cachedClasses: { className: string; classProperties: string; color?: string }[] | undefined;

  constructor(
    private isActive: boolean,
    private bootstrapVersion: string,
    private useLocalFile: boolean = false,
    private cssFilePath: string = '',
  ) {}

  public register(context: vscode.ExtensionContext): vscode.Disposable | undefined {
    this.dispose();

    if (!this.isActive) {
      return undefined;
    }

    this.provider = vscode.languages.registerHoverProvider(languageSupport, {
      provideHover: async (document, position, token) => {
        return await this.provideHover(document, position);
      },
    });

    return this.provider;
  }

  private async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<vscode.Hover | undefined> {
    if (!this.isActive) {
      return undefined;
    }

    // Let VS Code resolve the token under the cursor. The custom pattern keeps
    // hyphenated class names (e.g. "btn-primary") together.
    const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z0-9_-]+/);
    if (!wordRange) {
      return undefined;
    }

    // Only provide hovers inside a class context (attribute value or helper call).
    const documentText = document.getText();
    if (!isInsideClassContextAtOffset(documentText, document.offsetAt(position))) {
      return undefined;
    }

    const classUnderCursor = document.getText(wordRange);

    if (!this.cachedClasses) {
      this.cachedClasses = await getClasses(this.bootstrapVersion, this.useLocalFile, this.cssFilePath);
    }

    const classInfo = this.cachedClasses.find((c) => c.className === classUnderCursor);
    if (!classInfo) {
      return undefined;
    }

    const content = new vscode.MarkdownString();

    // For color classes, show a swatch preview and the resolved hex code above
    // the CSS rule.
    if (classInfo.color) {
      content.appendMarkdown(`${this.createSwatch(classInfo.color)} ${classInfo.color}\n\n`);
    }

    content.appendCodeblock(classInfo.classProperties, 'css');
    return new vscode.Hover(content, wordRange);
  }

  // Renders a small color preview as an inline SVG data-URI image, which VS Code
  // displays in hover markdown.
  private createSwatch(color: string): string {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12">` +
      `<rect width="12" height="12" rx="2" fill="${color}" stroke="rgba(128,128,128,0.6)"/></svg>`;
    const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    return `![color](${dataUri})`;
  }

  public dispose() {
    if (this.provider) {
      this.provider.dispose();
      this.provider = undefined;
    }
    this.cachedClasses = undefined;
  }
}
