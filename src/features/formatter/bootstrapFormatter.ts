import * as vscode from 'vscode';
import { Config } from '../../core/config';

export class BootstrapFormatter implements vscode.DocumentFormattingEditProvider {
  private config: Config;
  private isActive: boolean = false;

  constructor() {
    this.config = Config.getInstance();
    this.loadSettings();
  }

  private loadSettings() {
    const config = vscode.workspace.getConfiguration();
    this.isActive = config.get('bootstrapIntelliSense.enable', false);
  }

  public updateConfig(isActive: boolean) {
    this.isActive = isActive;
  }

  private getClassCategory(className: string): string {
    // Layout Classes
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

  private sortBootstrapClasses(classNames: string): string {
    // Teile die Klassen auf und entferne Leerzeichen
    return (
      classNames
        .split(/\s+/)
        .filter((className) => className.trim())
        // Entferne Duplikate
        .filter((value, index, self) => self.indexOf(value) === index)
        .sort((a, b) => {
          const categoryA = this.getClassCategory(a);
          const categoryB = this.getClassCategory(b);
          if (categoryA === categoryB) {
            return a.localeCompare(b);
          }
          return categoryA.localeCompare(categoryB);
        })
        .join(' ')
    );
  }

  public provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
    const edits: vscode.TextEdit[] = [];

    try {
      // Check if the extension is active
      if (!this.isActive) {
        return edits;
      }

      // check if the formatter is enabled
      const bootstrapConfig = this.config.getBootstrapConfig();
      if (!bootstrapConfig.formatOnSave) {
        return edits;
      }

      for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        const text = line.text;

        // Verbesserte Regex für class-Attribute
        const classRegex = /class(?:Name)?=["']([^"']*)["']/g;
        let match;

        while ((match = classRegex.exec(text)) !== null) {
          const fullMatch = match[0];
          const classContent = match[1];
          const sortedClasses = this.sortBootstrapClasses(classContent);

          // Nur ersetzen, wenn sich etwas geändert hat
          if (sortedClasses !== classContent) {
            const startPos = new vscode.Position(i, match.index);
            const endPos = new vscode.Position(i, match.index + fullMatch.length);
            const range = new vscode.Range(startPos, endPos);

            // Verwende das gleiche Anführungszeichen wie im Original
            const quote = fullMatch.includes('"') ? '"' : "'";

            // Erhalte den originalen Attributnamen (class oder className)
            const attrName = fullMatch.startsWith('class=') ? 'class' : 'className';
            const newText = `${attrName}=${quote}${sortedClasses}${quote}`;

            edits.push(vscode.TextEdit.replace(range, newText));
          }
        }
      }
    } catch (error) {}

    return edits;
  }
}
