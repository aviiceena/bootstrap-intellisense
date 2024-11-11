import * as vscode from 'vscode';
import { bootstrapVersion } from './statusBar';

type CssClass = {
  className: string;
  classProperties: string;
};

const extractCssClasses = (css: string): CssClass[] => {
  try {
    const classRegex = /\.([a-zA-Z0-9\-_]+)([^{]*?)\s*{([^}]*)}/gs;
    const classes: CssClass[] = [];
    const uniqueClasses = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = classRegex.exec(css))) {
      const className = match[1];
      let classProperties = match[0];

      classProperties = classProperties
        .replace(/\s*{\s*/, ' {\n  ')
        .replace(/;\s*/g, ';\n  ')
        .replace(/\s*}\s*$/, '\n}');

      if (!uniqueClasses.has(className)) {
        uniqueClasses.add(className);
        classes.push({
          className: className,
          classProperties: classProperties,
        });
      }
    }

    return classes;
  } catch (error) {
    vscode.window.showInformationMessage(`Error extracting CSS classes: ${(error as Error).message}`);
    return [];
  }
};

const fetchBootstrapCss = async (version: Number) => {
  try {
    const response = await fetch(`https://cdn.jsdelivr.net/npm/bootstrap@${version}/dist/css/bootstrap.css`);
    return await response.text();
  } catch (error) {
    vscode.window.showInformationMessage(`Error fetching Bootstrap CSS: ${(error as Error).message}`);
    return null;
  }
};

export const getClasses = async () => {
  try {
    const rawCss = await fetchBootstrapCss(bootstrapVersion);
    if (!rawCss) {
      return [];
    }

    return extractCssClasses(rawCss);
  } catch (error) {
    vscode.window.showInformationMessage(`Error getting Bootstrap classes: ${(error as Error).message}`);
    return [];
  }
};
