import * as https from 'https';
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';

interface CssClass {
  className: string;
  classProperties: string;
}

// Cache functions
const getCacheDir = (): string => {
  let cachePath: string;

  if (process.platform === 'win32') {
    cachePath = path.join(os.homedir(), 'AppData', 'Local', 'bootstrap-intellisense', 'cache');
  } else if (process.platform === 'darwin') {
    cachePath = path.join(os.homedir(), 'Library', 'Caches', 'bootstrap-intellisense');
  } else {
    cachePath = path.join(os.homedir(), '.cache', 'bootstrap-intellisense');
  }

  try {
    fs.mkdirSync(cachePath, { recursive: true });
  } catch (err: any) {
    if (err.code !== 'EEXIST') {
      console.error(`Error creating cache directory: ${err.message}`);
    }
  }

  return cachePath;
};

const getCachePath = (version: string, isLocalFile: boolean = false, filePath: string = ''): string => {
  const cacheDir = getCacheDir();

  if (isLocalFile && filePath) {
    // For local files we use a hash of the path
    const filePathHash = Buffer.from(filePath).toString('base64').replace(/[/+=]/g, '-');
    return path.join(cacheDir, `bootstrap-classes-local-${filePathHash}.json`);
  }

  return path.join(cacheDir, `bootstrap-classes-${version}.json`);
};

const writeCacheClasses = (
  classes: CssClass[],
  version: string,
  isLocalFile: boolean = false,
  filePath: string = '',
): void => {
  const cachePath = getCachePath(version, isLocalFile, filePath);
  try {
    fs.writeFileSync(cachePath, JSON.stringify(classes));
  } catch (error) {
    console.error('Error writing cache:', error);
  }
};

const getCachedClasses = (version: string, isLocalFile: boolean = false, filePath: string = ''): CssClass[] => {
  const cachePath = getCachePath(version, isLocalFile, filePath);

  try {
    if (fs.existsSync(cachePath)) {
      return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    }
  } catch (error) {
    console.error('Error reading cache:', error);
  }

  return [];
};

const extractCssClasses = (css: string): CssClass[] => {
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
  const versionRegex = /Bootstrap\s+v(\d+\.\d+\.\d+)/i;
  const match = css.match(versionRegex);
  if (match && match[1]) {
    return match[1];
  }
  return '0';
};

// Read CSS from local file
export const readLocalCssFile = async (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(new Error(`Error reading CSS file: ${err.message}`));
        return;
      }
      resolve(data);
    });
  });
};

// Find Bootstrap CSS files in workspace
export const findBootstrapCssFiles = async (): Promise<string[]> => {
  const result: string[] = [];

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
};

export const getClasses = async (
  version: string,
  useLocalFile: boolean = false,
  cssFilePath: string = '',
): Promise<CssClass[]> => {
  // First check in cache
  const cachedClasses = getCachedClasses(version, useLocalFile, cssFilePath);

  if (cachedClasses.length > 0) {
    return cachedClasses;
  }

  // If nothing found in cache, get and process CSS
  let rawCss: string;

  if (useLocalFile && cssFilePath) {
    try {
      rawCss = await readLocalCssFile(cssFilePath);
    } catch (err) {
      return [];
    }
  } else {
    try {
      rawCss = await fetchBootstrapCss(version);
    } catch (err) {
      return [];
    }
  }

  if (!rawCss) {
    return [];
  }

  const classes = extractCssClasses(rawCss);

  // Save to cache
  writeCacheClasses(classes, version, useLocalFile, cssFilePath);

  return classes;
};

// Helper function to delete all Bootstrap class caches
export const deleteAllBootstrapCaches = (): boolean => {
  const cacheDir = getCacheDir();

  if (!fs.existsSync(cacheDir)) {
    return false;
  }

  try {
    const files = fs.readdirSync(cacheDir);
    let deletedCount = 0;

    for (const file of files) {
      if (file.startsWith('bootstrap-classes-')) {
        try {
          const filePath = path.join(cacheDir, file);
          fs.unlinkSync(filePath);
          deletedCount++;
        } catch (err) {
          console.error(`Error deleting file: ${file}`, err);
        }
      }
    }

    return deletedCount > 0;
  } catch (error) {
    console.error('Error deleting all Bootstrap caches:', error);
    return false;
  }
};
