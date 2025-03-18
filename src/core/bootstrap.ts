import * as https from 'https';
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';

interface CssClass {
  className: string;
  classProperties: string;
}

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
    return [];
  }
};

const fetchBootstrapCss = async (version: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const url = `https://cdn.jsdelivr.net/npm/bootstrap@${version}/dist/css/bootstrap.css`;

    const request = https.get(url, { timeout: 5000 }, (res) => {
      if (res.statusCode !== 200) {
        const error = `HTTP Error: ${res.statusCode}`;
        reject(new Error(error));
        return;
      }

      const contentType = res.headers['content-type'];
      if (!contentType || !contentType.includes('text/css')) {
        reject(new Error('Invalid content type'));
        return;
      }

      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (!data) {
          reject(new Error('Empty response'));
          return;
        }
        resolve(data);
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
};

// Extract Bootstrap version from CSS comment
export const extractBootstrapVersion = (css: string): string => {
  try {
    const versionRegex = /Bootstrap\s+v(\d+\.\d+\.\d+)/i;
    const match = css.match(versionRegex);
    if (match && match[1]) {
      return match[1];
    }
    return '0';
  } catch (error) {
    return '0';
  }
};

// Read CSS from local file
export const readLocalCssFile = async (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(data);
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Find Bootstrap CSS files in workspace
export const findBootstrapCssFiles = async (): Promise<string[]> => {
  const result: string[] = [];

  try {
    // Search in workspace folders
    if (vscode.workspace.workspaceFolders) {
      for (const folder of vscode.workspace.workspaceFolders) {
        // Check for node_modules bootstrap
        const nodeModulesPath = path.join(
          folder.uri.fsPath,
          'node_modules',
          'bootstrap',
          'dist',
          'css',
          'bootstrap.min.css',
        );
        if (fs.existsSync(nodeModulesPath)) {
          result.push(nodeModulesPath);
        }

        // Find *.bootstrap*.css or *bootstrap*.min.css files
        const files = await vscode.workspace.findFiles('**/*bootstrap*.{css,min.css}', '**/node_modules/**');

        for (const file of files) {
          result.push(file.fsPath);
        }
      }
    }

    return [...new Set(result)]; // Remove duplicates
  } catch (error) {
    return [];
  }
};

export const getClasses = async (
  version: string,
  useLocalFile: boolean = false,
  cssFilePath: string = '',
): Promise<CssClass[]> => {
  try {
    let rawCss: string;

    if (useLocalFile && cssFilePath) {
      try {
        rawCss = await readLocalCssFile(cssFilePath);
      } catch (err) {
        throw err;
      }
    } else {
      rawCss = await fetchBootstrapCss(version);
    }

    if (!rawCss) {
      return [];
    }

    const classes = extractCssClasses(rawCss);
    return classes;
  } catch (error) {
    return [];
  }
};
