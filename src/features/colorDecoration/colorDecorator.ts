import * as vscode from 'vscode';
import { getClasses } from '../../core/bootstrap';
import { languageSupport } from '../completion/completionProvider';
import { findClassValueRanges } from '../../core/classContext';

// Debounce for re-scanning a document after edits. Small enough to feel
// instant, large enough to avoid scanning on every keystroke.
const UPDATE_DELAY_MS = 150;

// Matches a single, whitespace-delimited class token inside a class string.
const CLASS_TOKEN = /\S+/g;

/**
 * Renders a small color swatch directly to the left of every Bootstrap color
 * class in the editor (e.g. a blue box before `bg-primary`), mirroring the
 * swatches shown in the completion list.
 *
 * Implemented with editor decorations: one decoration type per distinct color,
 * each drawing an empty `before` box filled with that color.
 */
export class ColorDecorator {
  // One decoration type per color value, reused across updates.
  private decorationTypes = new Map<string, vscode.TextEditorDecorationType>();
  // className -> resolved hex color, for the currently configured Bootstrap source.
  private colorByClass: Map<string, string> | undefined;
  private disposables: vscode.Disposable[] = [];
  private updateTimer: ReturnType<typeof setTimeout> | undefined;
  // Set once dispose() runs. Guards the async register() flow: dispose() can be
  // called while register() is still awaiting getClasses() (e.g. on a quick
  // version switch). Without this flag the disposed instance would resume,
  // attach listeners and draw decorations that are never cleaned up, leaving
  // orphaned swatches stacking up after every switch.
  private disposed: boolean = false;

  constructor(
    private isActive: boolean,
    private bootstrapVersion: string,
    private useLocalFile: boolean = false,
    private cssFilePath: string = '',
  ) {}

  public async register(context: vscode.ExtensionContext): Promise<void> {
    if (!this.isActive) {
      return;
    }

    await this.loadColors();

    // The instance may have been disposed while loadColors() was awaiting.
    if (this.disposed) {
      return;
    }

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.scheduleUpdate(editor);
        }
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
          this.scheduleUpdate(editor);
        }
      }),
      vscode.window.onDidChangeVisibleTextEditors((editors) => {
        for (const editor of editors) {
          this.updateDecorations(editor);
        }
      }),
    );

    context.subscriptions.push(...this.disposables);

    // Decorate the editors that are already open.
    for (const editor of vscode.window.visibleTextEditors) {
      this.updateDecorations(editor);
    }
  }

  private async loadColors(): Promise<void> {
    const classes = await getClasses(this.bootstrapVersion, this.useLocalFile, this.cssFilePath);
    this.colorByClass = new Map();
    for (const entry of classes) {
      if (entry.color) {
        this.colorByClass.set(entry.className, entry.color);
      }
    }
  }

  private scheduleUpdate(editor: vscode.TextEditor): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
    this.updateTimer = setTimeout(() => this.updateDecorations(editor), UPDATE_DELAY_MS);
  }

  // Lazily creates (and caches) a decoration type that draws a small swatch box
  // in the given color, placed before the decorated range.
  private getDecorationType(color: string): vscode.TextEditorDecorationType {
    let type = this.decorationTypes.get(color);
    if (!type) {
      type = vscode.window.createTextEditorDecorationType({
        before: {
          contentText: '',
          backgroundColor: color,
          border: '1px solid rgba(128, 128, 128, 0.7)',
          width: '0.8em',
          height: '0.8em',
          margin: '0 0.2em 0 0',
        },
      });
      this.decorationTypes.set(color, type);
    }
    return type;
  }

  private updateDecorations(editor: vscode.TextEditor): void {
    if (this.disposed || !this.isActive || !this.colorByClass) {
      return;
    }

    // Clear everything when the language is unsupported, so stale swatches don't
    // linger (e.g. after switching a file's language mode).
    if (!languageSupport.includes(editor.document.languageId)) {
      this.clearDecorations(editor);
      return;
    }

    const rangesByColor = new Map<string, vscode.Range[]>();
    const document = editor.document;

    for (let line = 0; line < document.lineCount; line++) {
      const lineText = document.lineAt(line).text;
      const valueRanges = findClassValueRanges(lineText);

      for (const valueRange of valueRanges) {
        const segment = lineText.slice(valueRange.start, valueRange.end);

        CLASS_TOKEN.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = CLASS_TOKEN.exec(segment)) !== null) {
          const color = this.colorByClass.get(match[0]);
          if (!color) {
            continue;
          }

          // Zero-width range at the class start: the `before` swatch renders just
          // to the left of the class name without covering any text.
          const position = new vscode.Position(line, valueRange.start + match.index);
          const ranges = rangesByColor.get(color) ?? [];
          ranges.push(new vscode.Range(position, position));
          rangesByColor.set(color, ranges);
        }
      }
    }

    // Reset all known types first, then apply the freshly computed ranges, so
    // colors no longer present in the document are cleared.
    this.clearDecorations(editor);
    for (const [color, ranges] of rangesByColor) {
      editor.setDecorations(this.getDecorationType(color), ranges);
    }
  }

  private clearDecorations(editor: vscode.TextEditor): void {
    for (const type of this.decorationTypes.values()) {
      editor.setDecorations(type, []);
    }
  }

  public dispose(): void {
    this.disposed = true;
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = undefined;
    }
    for (const type of this.decorationTypes.values()) {
      type.dispose();
    }
    this.decorationTypes.clear();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
    this.colorByClass = undefined;
  }
}
