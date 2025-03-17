import * as vscode from 'vscode';
import { Logger, LogLevel } from '../../core/logger';
import { Config } from '../../core/config';

export class BootstrapFormatter implements vscode.DocumentFormattingEditProvider {
  private logger: Logger;
  private config: Config;

  constructor() {
    this.logger = Logger.getInstance();
    this.config = Config.getInstance();
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

  private sortBootstrapClasses(classNames: string): string {
    return classNames
      .split(' ')
      .filter((className) => className.trim())
      .sort((a, b) => {
        const categoryA = this.getClassCategory(a);
        const categoryB = this.getClassCategory(b);
        if (categoryA === categoryB) {
          return a.localeCompare(b);
        }
        return categoryA.localeCompare(categoryB);
      })
      .join(' ');
  }

  public provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
    const edits: vscode.TextEdit[] = [];

    try {
      // Prüfe, ob die Formatierung aktiviert ist
      const bootstrapConfig = this.config.getBootstrapConfig();
      if (!bootstrapConfig.formatOnSave) {
        return edits;
      }

      for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        const text = line.text;

        // Suche nach class-Attributen
        const classRegex = /class(?:Name)?=["']([^"']*)["']/g;
        let match;

        while ((match = classRegex.exec(text)) !== null) {
          const fullMatch = match[0];
          const classContent = match[1];
          const sortedClasses = this.sortBootstrapClasses(classContent);

          if (sortedClasses !== classContent) {
            const startPos = new vscode.Position(i, match.index);
            const endPos = new vscode.Position(i, match.index + fullMatch.length);
            const range = new vscode.Range(startPos, endPos);

            // Erstelle das neue class-Attribut mit sortierten Klassen
            const quote = fullMatch.includes('"') ? '"' : "'";
            const newText = `class=${quote}${sortedClasses}${quote}`;

            edits.push(vscode.TextEdit.replace(range, newText));
          }
        }
      }
    } catch (error) {
      this.logger.log(LogLevel.ERROR, 'Error formatting Bootstrap classes', error as Error);
    }

    return edits;
  }
}
