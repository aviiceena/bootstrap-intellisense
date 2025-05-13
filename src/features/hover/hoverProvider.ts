import * as vscode from 'vscode';
import { getClasses } from '../../core/bootstrap';
import { languageSupport } from '../completion/completionProvider';

export class HoverProvider {
  private provider: vscode.Disposable | undefined;
  private cachedClasses: { className: string; classProperties: string }[] | undefined;

  constructor(private isActive: boolean, private bootstrapVersion: string) {}

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

    const line = document.lineAt(position.line);
    const lineText = line.text;

    let classUnderCursor: string | undefined;
    let classRange: vscode.Range | undefined;

    // Regex to find class attributes and their values. Handles class="...", class='...', className="..." etc.
    const classAttributeRegex = /class(?:Name)?\s*=\s*(["'])(.*?)\1/g;
    let match;

    while ((match = classAttributeRegex.exec(lineText)) !== null) {
      const valueContent = match[2]; // The content of the class string, e.g., "foo bar-baz qux"
      // Calculate the start index of the value within the lineText
      const valueStartIndexInDocument = match.index + match[0].indexOf(valueContent);
      const valueEndIndexInDocument = valueStartIndexInDocument + valueContent.length;

      // Check if the cursor is within this class attribute's *value*
      if (position.character >= valueStartIndexInDocument && position.character <= valueEndIndexInDocument) {
        const cursorPosInAttributeValue = position.character - valueStartIndexInDocument;

        // Find the specific class name under the cursor within the attributeValue
        let currentWordStart = -1;
        // Iterate up to and including attributeValue.length to handle class at the end of the string
        for (let i = 0; i <= valueContent.length; i++) {
          // Treat end of string or space as a separator.
          // A class character is alphanumeric or a hyphen.
          const char = i < valueContent.length ? valueContent[i] : ' ';
          const isWordChar = i < valueContent.length && /[a-zA-Z0-9-]/.test(char);

          if (isWordChar && currentWordStart === -1) {
            currentWordStart = i; // Start of a new potential class
          } else if (!isWordChar && currentWordStart !== -1) {
            // We've reached the end of a potential class word (e.g. by space or end of string)
            // The word is valueContent.substring(currentWordStart, i)
            // Check if cursor is within this word's span [currentWordStart, i-1]
            if (cursorPosInAttributeValue >= currentWordStart && cursorPosInAttributeValue < i) {
              classUnderCursor = valueContent.substring(currentWordStart, i);
              const rangeStartInDocument = valueStartIndexInDocument + currentWordStart;
              const rangeEndInDocument = valueStartIndexInDocument + i;
              classRange = new vscode.Range(position.line, rangeStartInDocument, position.line, rangeEndInDocument);
              break; // Found the class under cursor
            }
            currentWordStart = -1; // Reset for next word
          }
        }
        if (classUnderCursor) {
          break; // Found class in this attribute, no need to check other attributes on the line
        }
      }
    }

    if (!classUnderCursor || !classRange) {
      return undefined; // No valid class found under the cursor in any class attribute
    }

    // Original logic for fetching and displaying hover content
    if (!this.cachedClasses) {
      this.cachedClasses = await getClasses(this.bootstrapVersion);
    }

    const classInfo = this.cachedClasses.find((c) => c.className === classUnderCursor);
    if (!classInfo) {
      return undefined;
    }

    const content = new vscode.MarkdownString();
    content.appendCodeblock(classInfo.classProperties, 'css');
    return new vscode.Hover(content, classRange);
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
