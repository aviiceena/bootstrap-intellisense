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
    // Layout Classes - should match first for proper sorting
    if (/^(container|container-fluid|row|col|col-|grid|flex|d-|order-|offset-|g-)/.test(className)) {
      return '1-layout';
    }

    // Components
    if (/^(btn|card|nav|navbar|modal|form|input|dropdown|alert|badge|list|table)/.test(className)) {
      return '2-components';
    }

    // Utilities
    if (/^(m-|p-|text-|bg-|border|rounded|shadow|w-|h-|position-|float-|align-|justify-|display-)/.test(className)) {
      return '3-utilities';
    }

    // Other
    return '4-other';
  }

  private sortBootstrapClasses(classNames: string): string {
    // Skip if empty
    if (!classNames || !classNames.trim()) {
      return classNames;
    }
    
    // Split classes, remove empty entries and deduplicate
    const uniqueClasses = Array.from(
      new Set(
        classNames
          .split(/\s+/)
          .map(c => c.trim())
          .filter(Boolean)
      )
    );
    
    // Sort by category
    return uniqueClasses
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

        // Improved regex for class attributes - handles more valid HTML scenarios
        const classRegex = /\bclass(?:Name)?=["']([^"']*)["']/g;
        let match;

        while ((match = classRegex.exec(text)) !== null) {
          const fullMatch = match[0];
          const classContent = match[1];
          const sortedClasses = this.sortBootstrapClasses(classContent);

          // Only replace if something has changed
          if (sortedClasses !== classContent) {
            const startPos = new vscode.Position(i, match.index);
            const endPos = new vscode.Position(i, match.index + fullMatch.length);
            const range = new vscode.Range(startPos, endPos);

            // Use the same quote as in the original
            const quote = fullMatch.includes('"') ? '"' : "'";

            // Keep the original attribute name (class or className)
            const attrName = fullMatch.startsWith('class=') ? 'class' : 'className';
            const newText = `${attrName}=${quote}${sortedClasses}${quote}`;

            edits.push(vscode.TextEdit.replace(range, newText));
          }
        }
      }
    } catch (error) {
      console.error('Error in Bootstrap formatter:', error);
    }

    return edits;
  }
}
