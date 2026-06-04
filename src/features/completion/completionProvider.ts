import * as vscode from 'vscode';
import { getClasses } from '../../core/bootstrap';
import { Config } from '../../core/config';
import { getClassValueAtCursor } from '../../core/classContext';
import { getClassCategory } from '../../core/classSorting';

// How many characters before the cursor to inspect when detecting a class
// context. Large enough to cover multi-line class attributes, small enough to
// stay cheap on every keystroke.
const LOOKBEHIND_CHARS = 1000;

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

interface ClassEntry {
  className: string;
  classProperties: string;
  color?: string;
}

// Matches an 8-digit #RRGGBBAA hex color (a translucent color).
const HEX_WITH_ALPHA = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/;

// VS Code's completion swatch parser recognises 3-/6-digit hex and rgb()/rgba()/
// hsl(), but NOT 8-digit #RRGGBBAA. For a translucent hex color this returns an
// equivalent rgba() usable as the swatch source; opaque (6-digit) colors are
// already parseable and returned unchanged.
export function toCompletionSwatchColor(color: string): string {
  const match = HEX_WITH_ALPHA.exec(color);
  if (!match) {
    return color;
  }

  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  const alpha = Math.round((parseInt(match[4], 16) / 255) * 100) / 100;
  const alphaText = Number.isInteger(alpha) ? `${alpha}.0` : `${alpha}`;
  return `rgba(${r}, ${g}, ${b}, ${alphaText})`;
}

// Pure helper so the filtering can be unit tested without the VS Code API.
// Excludes already-used classes and pre-filters by the token currently being typed.
export function filterClasses<T extends ClassEntry>(classes: T[], usedClasses: string[], currentPrefix: string): T[] {
  const prefix = currentPrefix.toLowerCase();
  return classes
    .filter(({ className }) => !usedClasses.includes(className))
    .filter(({ className }) => prefix === '' || className.toLowerCase().includes(prefix));
}

export class CompletionProvider {
  private provider: vscode.Disposable | undefined;
  private cachedClasses: ClassEntry[] | undefined;
  private useLocalFile: boolean = false;
  private cssFilePath: string = '';

  constructor(
    private isActive: boolean,
    private bootstrapVersion: string,
    useLocalFile: boolean = false,
    cssFilePath: string = '',
  ) {
    this.useLocalFile = useLocalFile;
    this.cssFilePath = cssFilePath;

    // DO NOT reload languages here as this could overwrite current settings
    // Languages are already updated in extension.ts before creating the provider
  }

  public register(context: vscode.ExtensionContext): vscode.Disposable | undefined {
    if (this.isActive) {
      this.provider = vscode.languages.registerCompletionItemProvider(
        languageSupport,
        {
          provideCompletionItems: this.provideCompletionItems.bind(this),
        },
        '"',
        "'",
        '`',
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

  // Text from up to LOOKBEHIND_CHARS before the cursor, used for class-context
  // detection (supports multi-line class attributes).
  private getTextBeforeCursor(document: vscode.TextDocument, position: vscode.Position): string {
    const offset = document.offsetAt(position);
    const start = document.positionAt(Math.max(0, offset - LOOKBEHIND_CHARS));
    return document.getText(new vscode.Range(start, position));
  }

  private shouldProvideCompletion(document: vscode.TextDocument, position: vscode.Position): boolean {
    if (!this.isActive) {
      return false;
    }

    // Check if the current language is supported
    if (!languageSupport.includes(document.languageId)) {
      return false;
    }

    const textBefore = this.getTextBeforeCursor(document, position);
    return getClassValueAtCursor(textBefore) !== undefined;
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

    const textBefore = this.getTextBeforeCursor(document, position);
    const classValue = getClassValueAtCursor(textBefore) ?? '';
    const enteredClasses = classValue.split(/\s+/);

    // Classes already fully typed in the current attribute (everything but the last token).
    const usedClasses = enteredClasses.slice(0, -1).filter((c) => c.trim());

    // The token currently being typed; used to pre-filter the (potentially large) class list.
    const currentPrefix = enteredClasses[enteredClasses.length - 1] ?? '';

    return filterClasses(this.cachedClasses, usedClasses, currentPrefix).map(
      ({ className, classProperties, color }) => {
        // For color classes, use the Color kind so VS Code renders a swatch. The
        // swatch value is read from the `detail` field (must be a valid color).
        const kind = color ? vscode.CompletionItemKind.Color : vscode.CompletionItemKind.Value;
        const item = new vscode.CompletionItem(className, kind);

        const documentation = new vscode.MarkdownString();
        if (color) {
          // Show the hex code (incl. alpha, e.g. #00000080) as the item detail.
          item.detail = color;

          // Opaque colors render the list swatch straight from the 6-digit hex
          // detail. Translucent 8-digit hex is not parseable by VS Code's swatch
          // parser, so put an equivalent rgba() at the very start of the
          // documentation - the only spot (besides the very end) the parser reads.
          const swatchColor = toCompletionSwatchColor(color);
          if (swatchColor !== color) {
            documentation.appendMarkdown(`${swatchColor}\n\n`);
          }
        } else {
          item.detail = `Bootstrap ${getClassCategory(className).toUpperCase()}`;
        }
        documentation.appendCodeblock(classProperties, 'css');
        item.documentation = documentation;

        item.insertText = className;
        const parts = this.getClassParts(className);
        item.sortText = `${parts.toString().padStart(2, '0')}-${className}`;
        return item;
      },
    );
  }
}
