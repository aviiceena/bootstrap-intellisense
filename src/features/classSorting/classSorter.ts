import * as vscode from 'vscode';
import { findClassValueRanges } from '../../core/classContext';
import { sortClassNames } from '../../core/classSorting';

/**
 * Computes the text edits needed to bring every class string in the document
 * into the canonical Bootstrap class order. Scans the full document so
 * multi-line class attributes are included. Edits are only produced for ranges
 * whose order actually changes, keeping saves a no-op when nothing needs sorting.
 */
export function getSortEditsForDocument(document: vscode.TextDocument): vscode.TextEdit[] {
  const text = document.getText();
  const ranges = findClassValueRanges(text);
  const edits: vscode.TextEdit[] = [];

  for (const range of ranges) {
    const original = text.slice(range.start, range.end);
    const sorted = sortClassNames(original);

    if (sorted !== original) {
      edits.push(
        vscode.TextEdit.replace(
          new vscode.Range(document.positionAt(range.start), document.positionAt(range.end)),
          sorted,
        ),
      );
    }
  }

  return edits;
}
